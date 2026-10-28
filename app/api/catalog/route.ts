import {env} from 'cloudflare:workers';
import {CatalogStore,publicProducts} from '../../../lib/catalog-store.mjs';
export const dynamic='force-dynamic';
export async function GET(){
  try{
    const store=new CatalogStore(env.DB);await store.initialize();
    return Response.json({products:publicProducts(await store.list())},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch{return Response.json({error:'Katalogni hozircha yuklab bo‘lmadi.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
