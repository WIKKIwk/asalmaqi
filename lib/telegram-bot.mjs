import {CatalogStore} from './catalog-store.mjs';
import {TelegramClient,boundedBytes} from './telegram-client.mjs';
import {formatPrice,safeImage} from '../public/catalog-view.mjs';

const button=(text,callback_data)=>({text,callback_data});
const HOME=[[button('Asallar katalogi','catalog'),button('＋ Asal qo‘shish','new')]];
const FIELD_LABELS={title:'Nomi',subtitle:'Qisqa izoh',weight:'Og‘irligi',price:'Narxi',description:'Tavsifi',image:'Rasmi',sortOrder:'Tartibi'};
const PROMPTS={title:'Asal nomini yozing (80 belgigacha).',subtitle:'Qisqa izoh yozing (120 belgigacha).',weight:'Qadoq og‘irligini yozing. Masalan: 450 ± 15 g yoki 1 kg.',price:'Narxni so‘mda yozing. Masalan: 85000. Narx ko‘rsatilmasin desangiz, — yuboring.',description:'Asal tavsifini yozing (700 belgigacha).',image:'Asal rasmini yuboring. JPG, PNG yoki WebP, 8 MB gacha. Yorlig‘i to‘liq ko‘rinsin.',sortOrder:'Katalogdagi tartib raqamini yozing (0–9999). Kichik raqam oldin chiqadi.'};
const NEW_STEPS=['title','weight','price','description','image'];

function validateField(field,input){
 const value=(input??'').trim();
 if(field==='price'){
   if(['—','-','yo‘q',"yo'q"].includes(value.toLowerCase()))return null;
   if(!/^[\d\s]+$/.test(value))throw new Error(PROMPTS.price);
   const n=Number(value.replace(/\s/g,''));if(!Number.isSafeInteger(n)||n<1||n>1000000000)throw new Error('Narx 1 dan 1 000 000 000 so‘mgacha bo‘lsin.');return n;
 }
 if(field==='sortOrder'){if(!/^\d{1,4}$/.test(value))throw new Error(PROMPTS.sortOrder);return Number(value);}
 const limit={title:80,subtitle:120,weight:50,description:700}[field];
 if(!limit||!value||value.length>limit||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))throw new Error(PROMPTS[field]??'Qiymatni tekshiring.');
 return value;
}
function preview(session,origin,notice=''){
 const p=session.product,n=session.nonce;
 return {text:[notice,p.title||'Yangi asal',p.subtitle,`Og‘irligi: ${p.weight||'kiritilmagan'}`,`Narxi: ${p.price===null?'telefon orqali':formatPrice(p.price)}`,`Mavjudlik: ${p.available?'bor':'hozircha yo‘q'}`,`Saytda: ${p.published?'ko‘rsatiladi':'yashiriladi'}`,`Bo‘lim: ${p.group==='large'?'katta qadoqlar':'asosiy to‘plam'}`,`Tartib: ${p.sortOrder}`,'',p.description,'','O‘zgarishlar “Saqlash” bosilganda saytda chiqadi.'].filter(x=>x!==undefined).join('\n').trim(),buttons:[
   ...[['title','price'],['weight','subtitle'],['description','image'],['sortOrder']].map(fields=>fields.map(f=>button(FIELD_LABELS[f],`field:${n}:${f}`))),
   [button(p.available?'Mavjud emas deb belgilash':'Mavjud deb belgilash',`toggle:${n}:available`)],
   [button(p.published?'Saytdan yashirish':'Saytda ko‘rsatish',`toggle:${n}:published`),button('Qadoq bo‘limini almashtirish',`toggle:${n}:group`)],
   ...(p.image?[ [{text:'Rasmni ochish',url:origin+safeImage(p.image)}] ]:[]),
   [button('✓ Saqlash',`save:${n}`),button('Bekor qilish',`cancel:${n}`)]
 ]};
}
const prompt=session=>({text:PROMPTS[session.field]+'\n\nBekor qilish: /bekor',buttons:[]});
async function catalogMessage(store){
 const products=await store.list(true);
 return {text:'Qaysi asalni tahrirlaysiz? Yashirilgan mahsulotlar ham shu yerda.',buttons:[...products.map(p=>[button(`${p.published?'':'[Yashirin] '}${p.title} · ${p.weight}`,`product:${p.id}`)]),...HOME]};
}
function draft(product,baseRevision,step=null){return {product,baseRevision,nonce:crypto.randomUUID().replaceAll('-','').slice(0,10),field:step===null?null:NEW_STEPS[step],step};}

export async function handleOwnerUpdate(update,{store,client,bucket,origin,userId,lease}){
 const message=update.message,callback=update.callback_query;
 const text=message?.text?.trim()??'',data=callback?.data??'';
 let session=await store.session(userId);
 const command=text.split(/\s/)[0].split('@')[0].toLowerCase();
 if(command==='/id')return {session,response:{text:`Sizning Telegram ID: ${userId}`,buttons:HOME}};
 if(['/start','/help','/bekor'].includes(command)||data==='cancel')return {session:null,response:{text:command==='/bekor'?'O‘zgarishlar bekor qilindi.':'SHIFA ALEASAL katalog boshqaruvi.\nMahsulotni tanlang yoki yangi asal qo‘shing.',buttons:HOME}};
 if(command==='/katalog'||data==='catalog')return {session:null,response:await catalogMessage(store)};
 if(command==='/yangi'||data==='new'){
   const all=await store.list(true);
   if(all.length>=100)return {session,response:{text:'Katalogda 100 ta mahsulot bor. Mavjud mahsulotni tahrirlang.',buttons:HOME}};
   session=draft({id:'p'+update.update_id,title:'',subtitle:'SHIFA ALEASAL asallar to‘plamidan',weight:'',description:'',image:'',imageSmall:null,group:'standard',price:null,available:true,published:true,sortOrder:Math.min(9999,Math.max(-1,...all.map(p=>p.sortOrder))+1)},null,0);
   return {session,response:prompt(session)};
 }
 if(data.startsWith('product:')){
   const p=await store.product(data.slice(8));
   if(!p)return {session:null,response:await catalogMessage(store)};
   session=draft(p,p.revision);return {session,response:preview(session,origin)};
 }
 if(callback){
   const [action,nonce,field]=data.split(':');
   if(!session||session.nonce!==nonce)return {session,response:{text:'Bu tugma eskirgan. Katalogdan mahsulotni qayta tanlang.',buttons:HOME}};
   if(action==='cancel')return {session:null,response:{text:'O‘zgarishlar bekor qilindi.',buttons:HOME}};
   if(action==='field'&&Object.hasOwn(FIELD_LABELS,field)){session.field=field;session.step=null;return {session,response:prompt(session)};}
   if(action==='toggle'&&['available','published','group'].includes(field)){
     session.product[field]=field==='group'?(session.product.group==='large'?'standard':'large'):!session.product[field];session.field=null;session.step=null;
     return {session,response:preview(session,origin)};
   }
   if(action==='save'){
     const p=session.product;
     if(!p.title||!p.weight||!p.description||!p.image)return {session,response:preview(session,origin,'Nom, og‘irlik, tavsif va rasmni to‘ldiring.\n')};
     const saved=await store.save(p,session.baseRevision,update.update_id,lease);
     if(!saved)return {session:null,response:{text:'Bu mahsulot boshqa saqlashda yangilangan. Katalogdan qayta ochib tahrirlang.',buttons:HOME}};
     return {session:null,response:{text:`${p.title} saqlandi. ${p.published?'Sayt katalogi yangilandi.':'Mahsulot saytdan yashirildi.'}`,buttons:[[{text:'Saytni ko‘rish',url:origin+'/#asallar'}],...HOME]}};
   }
   return {session,response:preview(session,origin)};
 }
 if(!session?.field)return {session,response:{text:'Katalogdan mahsulotni tanlang. Yangi asal uchun “Asal qo‘shish” tugmasini bosing.',buttons:HOME}};
 try{
   if(session.field==='image'){
     session.product.image=await client.photo(message,bucket);session.product.imageSmall=null;
   }else session.product[session.field]=validateField(session.field,text);
 }catch(error){
   const known={PHOTO_REQUIRED:PROMPTS.image,FILE_TOO_LARGE:'Rasm hajmi 8 MB dan kichik bo‘lsin.',INVALID_IMAGE:'JPG, PNG yoki WebP rasm yuboring.'};
   if(error.message==='TELEGRAM_UNAVAILABLE')throw error;
   return {session,response:{text:known[error.message]??(Object.values(PROMPTS).includes(error.message)||error.message.startsWith('Narx ')?error.message:'Rasmni saqlab bo‘lmadi. Yana urinib ko‘ring.'),buttons:[]}};
 }
 if(session.step!==null&&session.step<NEW_STEPS.length-1){session.step++;session.field=NEW_STEPS[session.step];return {session,response:prompt(session)};}
 session.field=null;session.step=null;return {session,response:preview(session,origin)};
}

async function sameSecret(a,b){
 if(!a||!b)return false;
 const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [x,y]=await Promise.all([hash(a),hash(b)]);let difference=0;for(let i=0;i<x.length;i++)difference|=x[i]^y[i];return difference===0;
}
export async function webhook(request,env,dependencies={}){
 const reply=(status=200)=>new Response(status===200?'OK':'Unavailable',{status,headers:{'Cache-Control':'no-store'}});
 if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_WEBHOOK_SECRET||!env.DB||!env.BUCKET)return reply(503);
 if(!await sameSecret(request.headers.get('X-Telegram-Bot-Api-Secret-Token'),env.TELEGRAM_WEBHOOK_SECRET))return reply(403);
 let update;try{update=JSON.parse(new TextDecoder().decode(await boundedBytes(request,64*1024)));}catch{return reply(400);}
 if(!Number.isSafeInteger(update?.update_id)||update.update_id<0)return reply(400);
 const actor=update.callback_query?.from??update.message?.from;
 const chat=update.callback_query?.message?.chat??update.message?.chat;
 if(!actor||actor.is_bot||chat?.type!=='private'||String(chat.id)!==String(actor.id))return reply();
 const userId=String(actor.id);
 const owners=new Set((env.TELEGRAM_ADMIN_IDS??'').split(',').map(s=>s.trim()).filter(s=>/^\d+$/.test(s)));
 const store=dependencies.store??new CatalogStore(env.DB),client=dependencies.client??new TelegramClient(env.TELEGRAM_BOT_TOKEN);
 let lease;
 try{
   await store.initialize();
   const claim=await store.claim(update.update_id);
   if(claim?.delivered)return reply();
   if(!claim)return reply(503);
   lease=claim.lease;
   if(update.callback_query){try{await client.call('answerCallbackQuery',{callback_query_id:update.callback_query.id});}catch{/* Expired callbacks do not block a saved update. */}}
   let response=claim.response;
   if(!response){
     // A private-chat visitor always gets a useful answer; catalog edits still require the allowlist.
     const result=!owners.has(userId)?{session:null,response:{text:`Assalomu alaykum! Bu SHIFA ALEASAL katalogini boshqarish boti.\n\nSizning Telegram ID: ${userId}\n\nBoshqaruv huquqi hali berilmagan. Ulanish uchun shu ID raqamini saytni sozlayotgan kishiga yuboring. Ruxsat berilgach, /start ni qayta bosing.`,buttons:[[{text:'Saytni ko‘rish',url:(env.SITE_ORIGIN??'https://shifa-aleasal.abdulfattox.chatgpt.site')+'/#asallar'}]]}}
       :await handleOwnerUpdate(update,{store,client,bucket:env.BUCKET,origin:env.SITE_ORIGIN??'https://shifa-aleasal.abdulfattox.chatgpt.site',userId,lease});
     if(!await store.finish(update.update_id,lease,userId,result.session,result.response))return reply(503);
     response=result.response;
   }
   await client.send(chat.id,response);
   await store.delivered(update.update_id,lease);
   return reply();
 }catch{
   if(lease)try{await store.release(update.update_id,lease);}catch{}
   // Never log Telegram URLs or credentials. Non-2xx asks Telegram to retry.
   return reply(503);
 }
}
