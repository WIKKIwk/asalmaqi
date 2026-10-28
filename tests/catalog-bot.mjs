import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {CatalogStore,publicProducts} from '../lib/catalog-store.mjs';
import {webhook} from '../lib/telegram-bot.mjs';
import {TelegramClient,imageType,boundedBytes} from '../lib/telegram-client.mjs';
import {renderCatalog} from '../public/catalog-view.mjs';
import {renderPage} from '../lib/page.mjs';

// Run the real repository SQL against SQLite, with the same atomic batch contract as D1.
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../drizzle/0000_wandering_sphinx.sql',import.meta.url),'utf8'));
function prepared(sql,args=[]){return {
 bind(...values){return prepared(sql,values)},
 async first(){return sqlite.prepare(sql).get(...args)??null},
 async all(){return {results:sqlite.prepare(sql).all(...args)}},
 async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}},
};}
const db={prepare:prepared,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const store=new CatalogStore(db);
await store.initialize();await store.initialize();assert.equal((await store.list()).length,5);
const bucket={objects:new Map(),async put(key,bytes,meta){this.objects.set(key,{bytes,meta})}};
let calls=[],failSend=false;
const client={async call(){},async send(chatId,response){if(failSend)throw new Error('offline');calls.push({chatId,...response});},async photo(){return '/media/'+'a'.repeat(64)+'.jpg'}};
const env={DB:db,BUCKET:bucket,TELEGRAM_BOT_TOKEN:'test-only',TELEGRAM_WEBHOOK_SECRET:'test-secret',TELEGRAM_ADMIN_IDS:'111,222',SITE_ORIGIN:'https://example.test'};
let nextId=100;
const request=(update,secret='test-secret')=>new Request('https://example.test/api/telegram/webhook',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify(update)});
const message=(text,user=111)=>({update_id:nextId++,message:{from:{id:user},chat:{id:user,type:'private'},text}});
const callback=(data,user=111)=>({update_id:nextId++,callback_query:{id:'cb'+nextId,from:{id:user},message:{chat:{id:user,type:'private'}},data}});
const send=async update=>{const result=await webhook(request(update),env,{store,client});assert.equal(result.status,200);return calls.at(-1);};
const session=()=>store.session('111');

assert.equal((await webhook(request(message('/start'),'wrong'),env,{store,client})).status,403);
assert.equal((await webhook(request(message('/start')),{...env,TELEGRAM_BOT_TOKEN:''},{store,client})).status,503);
for(const text of ['/start','/start@shifaalesal_bot','/start catalog','/help','salom','/id','/yangi']){
 const response=await send(message(text,999));
 assert.match(response.text,/Assalomu alaykum/);
 assert.match(response.text,/Telegram ID: 999/);
 assert.match(response.text,/Boshqaruv huquqi hali berilmagan/);
 assert(response.buttons.flat().every(button=>!button.callback_data),'Visitors must not receive catalog controls.');
 assert.equal(await store.session('999'),null,'An onboarding reply must not create an editing draft.');
 assert.equal((await store.list()).length,5,'Non-owners cannot mutate the catalog.');
}
const onboarding=message('/start',888);
assert.equal((await webhook(request(onboarding),{...env,TELEGRAM_ADMIN_IDS:''},{store,client})).status,200);
assert.match(calls.at(-1).text,/Telegram ID: 888/,'The initial empty owner list must still answer Start.');
const onboardingReplies=calls.length;
await send(onboarding);assert.equal(calls.length,onboardingReplies,'A retried Start update must not repeat its delivered reply.');
const group=message('/yangi');group.message.chat.type='group';await send(group);assert.equal(await session(),null);
const spoof=callback('product:chotqol');spoof.callback_query.message.chat.id=999;await send(spoof);assert.equal(await session(),null);
assert.equal(calls.length,onboardingReplies,'Group and mismatched-identity updates must remain ignored.');

await send(callback('product:chotqol'));
let draft=await session();
await send(callback(`save:${draft.nonce}`,999));
assert.match(calls.at(-1).text,/Boshqaruv huquqi hali berilmagan/);
assert.equal((await store.product('chotqol')).revision,1,'An outsider cannot save an owner draft.');
await send(callback(`field:${draft.nonce}:price`));await send(message('85 000'));
assert.equal((await store.product('chotqol')).price,null,'Draft edits cannot leak to the public catalog.');
draft=await session();assert.equal(draft.product.price,85000);
await send(callback(`save:${draft.nonce}`));assert.equal((await store.product('chotqol')).price,85000);

await send(callback('product:chotqol'));draft=await session();
await send(callback(`field:${draft.nonce}:price`));await send(message('<script>alert(1)</script>'));
assert.equal((await session()).product.price,85000,'Invalid prices leave the draft unchanged.');
await send(message('/bekor'));
await send(callback(`save:${draft.nonce}`));assert.match(calls.at(-1).text,/eskirgan/);

await send(message('/yangi'));const newId=(await session()).product.id;
await send(message('Sinov asali'));await send(message('700 g'));await send(message('—'));await send(message('Sinov tavsifi.'));
const photo=message('');photo.message.photo=[{file_id:'photo'}];await send(photo);
draft=await session();const save=callback(`save:${draft.nonce}`);
assert.equal((await store.list()).length,5);
failSend=true;assert.equal((await webhook(request(save),env,{store,client})).status,503);
assert.equal((await store.list()).length,6,'A reply failure must not lose a committed product.');
failSend=false;await send(save);await send(save);
assert.equal((await store.list()).length,6,'A retried Telegram update must not duplicate a product.');
assert.equal((await store.product(newId)).revision,1);

await send(callback('product:'+newId));draft=await session();
await send(callback(`toggle:${draft.nonce}:published`));await send(callback(`save:${draft.nonce}`));
await store.initialize();assert.equal((await store.list()).length,5,'Hidden products stay hidden after initialization.');
assert.equal((await store.list(true)).length,6);

// Two owners editing the same revision cannot silently overwrite each other.
await send(callback('product:chotqol',111));const first=await store.session('111');
await send(callback('product:chotqol',222));const second=await store.session('222');
await send(callback(`toggle:${first.nonce}:available`,111));await send(callback(`save:${first.nonce}`,111));
await send(callback(`save:${second.nonce}`,222));assert.match(calls.at(-1).text,/yangilangan/);
assert.equal((await store.product('chotqol')).available,false);

// Resume a process that died after saving, before session/reply persistence.
await send(callback('product:chol'));draft=await session();draft.product.price=64000;
const crashId=nextId++,claim=await store.claim(crashId);
assert(await store.save(draft.product,draft.baseRevision,crashId,claim.lease));
assert(await store.save(draft.product,draft.baseRevision,crashId,claim.lease));
assert.equal((await store.product('chol')).revision,2);
assert.equal(await store.claim(crashId),null,'Active leases serialize duplicate deliveries.');
await store.release(crashId,claim.lease);

const malicious={...(await store.product('chotqol')),title:'</script><img src=x onerror=alert(1)>',image:'https://evil.test/x.svg'};
const html=renderCatalog(publicProducts([malicious]));
assert(!html.includes('<img src=x'));assert(!html.includes('https://evil.test'));assert(html.includes('&lt;/script&gt;'));
const rendered=renderPage('<div><!--CATALOG--></div><script type="application/json"><!--CATALOG_DATA--></script>',[malicious]);
assert.equal((rendered.match(/<\/script>/g)??[]).length,1,'Product text cannot terminate the JSON script.');
assert.match(renderCatalog([]),/To‘plam yangilanmoqda/);
assert.deepEqual(imageType(new Uint8Array([255,216,255,0])),['jpg','image/jpeg']);
assert.throws(()=>imageType(new TextEncoder().encode('<svg onload=alert(1)>')));
await assert.rejects(()=>boundedBytes(new Response(new Uint8Array(100)),50));

const png=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3]);
const photoClient=new TelegramClient('not-a-real-token',async url=>url.includes('/getFile')?Response.json({ok:true,result:{file_path:'photos/file_1.png',file_size:png.length}}):new Response(png));
const media=await photoClient.photo({document:{file_id:'photo',file_size:png.length}},bucket);
assert.match(media,/^\/media\/[a-f0-9]{64}\.png$/);assert.equal(bucket.objects.size,1);
await photoClient.photo({document:{file_id:'photo'}},bucket);assert.equal(bucket.objects.size,1,'Repeated uploads share the content-addressed file.');
await assert.rejects(()=>photoClient.photo({document:{file_id:'photo',file_size:9*1024*1024}},bucket));
sqlite.close();
console.log('PASS: new-user Start/help/ID replies, empty allowlist onboarding, owner/webhook authorization, private chat checks, real SQL seeding, drafts, validation, add/edit/hide, duplicate updates, reply failure recovery, revision conflicts, safe rendering and bounded image storage.');
