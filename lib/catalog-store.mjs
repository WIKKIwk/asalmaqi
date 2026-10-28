import seed from './catalog-seed.json' with { type: 'json' };

const columns='id,title,subtitle,description,weight,image,image_small,group_name,price,available,published,sort_order,revision,updated_at,last_update_id';
const values=p=>[p.id,p.title,p.subtitle,p.description,p.weight,p.image,p.imageSmall??null,p.group,p.price??null,+p.available,+p.published,p.sortOrder,p.revision,p.updatedAt,p.lastUpdateId??null];
const decode=r=>r&&({id:r.id,title:r.title,subtitle:r.subtitle,description:r.description,weight:r.weight,image:r.image,imageSmall:r.image_small,group:r.group_name,price:r.price,available:!!r.available,published:!!r.published,sortOrder:r.sort_order,revision:r.revision,updatedAt:r.updated_at,lastUpdateId:r.last_update_id});

export class CatalogStore {
  constructor(db){if(!db)throw new Error('Catalog database is not configured');this.db=db;}
  async initialize(){
    if(await this.db.prepare("SELECT value FROM catalog_meta WHERE key='seed-v1'").first())return;
    // D1 batches are atomic. The marker prevents removed/hidden products from reappearing.
    await this.db.batch([
      ...seed.map(p=>this.db.prepare(`INSERT OR IGNORE INTO catalog_products (${columns}) SELECT ${values(p).map(()=>'?').join(',')} WHERE NOT EXISTS (SELECT 1 FROM catalog_meta WHERE key='seed-v1')`).bind(...values(p))),
      this.db.prepare("INSERT OR IGNORE INTO catalog_meta(key,value) VALUES ('seed-v1','1')"),
    ]);
  }
  async list(includeHidden=false){
    const {results}=await this.db.prepare(`SELECT * FROM catalog_products ${includeHidden?'':'WHERE published=1'} ORDER BY sort_order,id`).all();
    return results.map(decode);
  }
  async product(id){return decode(await this.db.prepare('SELECT * FROM catalog_products WHERE id=?').bind(id).first());}
  async session(userId){
    const row=await this.db.prepare('SELECT data,updated_at FROM bot_sessions WHERE user_id=?').bind(String(userId)).first();
    return row&&row.updated_at>Date.now()-24*60*60*1000?JSON.parse(row.data):null;
  }
  async claim(id){
    const lease=crypto.randomUUID(),now=Date.now();
    const row=await this.db.prepare(`INSERT INTO bot_updates(id,lease,lease_until,created_at) VALUES(?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET lease=excluded.lease,lease_until=excluded.lease_until
      WHERE bot_updates.lease_until<? AND bot_updates.delivered=0 RETURNING *`).bind(id,lease,now+60000,now,now).first();
    if(row)return {lease,response:row.response?JSON.parse(row.response):null};
    const existing=await this.db.prepare('SELECT delivered FROM bot_updates WHERE id=?').bind(id).first();
    return existing?.delivered?{delivered:true}:null;
  }
  async save(product,baseRevision,updateId,lease){
    const previous=await this.product(product.id);
    if(previous?.lastUpdateId===updateId)return true; // Resume after a crash between saving and replying.
    const next={...product,revision:(baseRevision??0)+1,updatedAt:Date.now(),lastUpdateId:updateId};
    const assignments=columns.split(',').filter(c=>c!=='id').map(c=>`${c}=excluded.${c}`).join(',');
    const result=await this.db.prepare(`INSERT INTO catalog_products(${columns}) SELECT ${values(next).map(()=>'?').join(',')}
      WHERE EXISTS(SELECT 1 FROM bot_updates WHERE id=? AND lease=?)
      ON CONFLICT(id) DO UPDATE SET ${assignments} WHERE catalog_products.revision=?`).bind(...values(next),updateId,lease,baseRevision??-1).run();
    return result.meta.changes===1;
  }
  async finish(id,lease,userId,session,response){
    const query=session
      ?this.db.prepare(`INSERT INTO bot_sessions(user_id,data,updated_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM bot_updates WHERE id=? AND lease=?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at`).bind(String(userId),JSON.stringify(session),Date.now(),id,lease)
      :this.db.prepare('DELETE FROM bot_sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM bot_updates WHERE id=? AND lease=?)').bind(String(userId),id,lease);
    const results=await this.db.batch([query,this.db.prepare("UPDATE bot_updates SET state='done',response=? WHERE id=? AND lease=?").bind(JSON.stringify(response),id,lease)]);
    return results[1].meta.changes===1;
  }
  async delivered(id,lease){await this.db.prepare('UPDATE bot_updates SET delivered=1,response=NULL,lease_until=0 WHERE id=? AND lease=?').bind(id,lease).run();}
  async release(id,lease){await this.db.prepare('UPDATE bot_updates SET lease_until=0 WHERE id=? AND lease=?').bind(id,lease).run();}
}

export function publicProducts(products){
  return products.filter(p=>p.published).map(({lastUpdateId,published,...p})=>p);
}
