import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import seed from '../lib/catalog-seed.json' with {type:'json'};
import {formatPrice,renderCatalog} from '../public/catalog-view.mjs';
import {stringsFor,localizeProduct} from '../public/i18n.mjs';

const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import .+;\r?\n/gm,'');
function fixture({reduced=false,supported=true,gutterSupported=true,deferredClose=false,catalog=seed,language='uz'}={}){
 const animations=[];
 const closeEvents=[];
 class Events{
  handlers=new Map();
  addEventListener(type,fn){const handlers=this.handlers.get(type)||[];handlers.push(fn);this.handlers.set(type,handlers)}
  emit(type,event={}){for(const fn of this.handlers.get(type)||[])fn(event)}
 }
 class Element extends Events{
  constructor(name){
   super();this.name=name;this.dataset={};this.children=[];this.attributes=new Map();this.open=false;this.textContent='';this.closed=0;
   const names=new Set();
   this.classList={add:(...items)=>items.forEach(x=>names.add(x)),remove:(...items)=>items.forEach(x=>names.delete(x)),contains:x=>names.has(x),toggle:(x,on)=>{if(on??!names.has(x))names.add(x);else names.delete(x)}};
   this.style={paddingRight:'6px',setProperty(){}};
   if(!supported)this.animate=undefined;
  }
  setAttribute(key,value){this.attributes.set(key,value)}
  getAttribute(key){return this.attributes.get(key)}
  querySelectorAll(){return this.children}
  querySelector(){return this.children[0]}
  matches(selector){return this.name==='article'&&selector==='article'}
  contains(target){return this===target||this.children.some(child=>child.contains(target))}
  getBoundingClientRect(){return {top:1200,bottom:1500,left:0,right:400,width:400,height:300}}
  focus(options){this.focusOptions=options}
  closest(selector){return selector==='[data-product]'&&this.dataset.product?this:null}
  showModal(){this.open=true}
  close(){this.open=false;this.closed++;if(deferredClose)closeEvents.push(()=>this.emit('close'));else this.emit('close')}
  animate(keyframes,options){
   let resolve,reject,settled=false;
   const animation={element:this,keyframes,options,cancelled:false,finished:new Promise((yes,no)=>{resolve=yes;reject=no}),cancel(){this.cancelled=true;if(!settled){settled=true;reject(new Error('cancelled'))}},finish(){if(!settled){settled=true;resolve()}}};
   animations.push(animation);return animation;
  }
 }
 const document=new Events();document.hidden=false;document.body=new Element('body');document.documentElement={clientWidth:1188,lang:language};
 const menu=new Element('menu');menu.setAttribute('aria-expanded','false');
 const nav=new Element('nav');nav.children=[new Element('link')];
 const dialog=new Element('dialog'),close=new Element('close'),trigger=new Element('trigger');trigger.dataset.product='chotqol';
 const triggers=['chotqol','qorongi','chol','multi-flora','qorongi-large'].map((product,index)=>{const item=index===0?trigger:new Element('trigger');item.dataset.product=product;return item});
 const article=new Element('article');article.children=[trigger];article.parentElement={children:[article]};
 const hero=new Element('hero'),heroImage=new Element('heroImage'),heroCaption=new Element('heroCaption');
 const fields=new Map([['.menu-toggle',menu],['nav',nav],['dialog',dialog],['.dialog-close',close],['.hero',hero],['.hero-picture img',heroImage],['.hero-caption',heroCaption],['#detail-title',new Element('title')],['#detail-subtitle',new Element('subtitle')],['#detail-weight',new Element('weight')],['#detail-image',new Element('image')]]);
 fields.set('#detail-description',new Element('description'));
 for(const key of ['#detail-price-row','#detail-price','#detail-availability','#catalog-data','#catalog-products'])fields.set(key,new Element(key));
 fields.get('#catalog-data').textContent=JSON.stringify(catalog);
 for(const opener of triggers)opener.addEventListener('click',()=>document.emit('click',{target:opener}));
 document.querySelector=selector=>{assert(fields.has(selector),selector);return fields.get(selector)};
 document.querySelectorAll=selector=>selector==='[data-product]'?triggers:selector==='.hero-content > *'?[new Element('h1')]:selector.startsWith('.section-heading')?[article]:[];
 document.getElementById=()=>null;
 const preference=new Events();preference.matches=reduced;preference.set=value=>{preference.matches=value;preference.emit('change',{matches:value})};
 const desktop=new Events();desktop.matches=false;
 const window=new Events();Object.assign(window,{CSS:{supports:()=>gutterSupported},matchMedia:query=>query.includes('prefers-reduced-motion')?preference:desktop,innerWidth:1203,innerHeight:800,scrollY:0,shifaScrollStarted:false,getComputedStyle:()=>({opacity:'1',transform:'none',paddingRight:'6px'})});
 class Observer{constructor(callback){this.callback=callback}observe(){}unobserve(){}disconnect(){}}
 window.IntersectionObserver=Observer;
 vm.runInNewContext(code,{document,window,formatPrice,renderCatalog,stringsFor,localizeProduct,initCatalogCarousels:()=>({snapshot:()=>new Map(),destroy(){}}),setInterval(){},location:{hash:''},IntersectionObserver:Observer,requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
 return {animations,document,dialog,close,trigger,triggers,article,fields,preference,closeEvents};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve()};

const staticPage=fixture({reduced:true});
assert.equal(staticPage.animations.length,0,'Reduced motion must avoid animation work.');
assert.equal(staticPage.article.classList.contains('motion-pending'),false,'Reduced-motion content must stay visible.');
staticPage.trigger.emit('click');
assert.equal(staticPage.fields.get('#detail-weight').textContent,'450 ± 15 g');
staticPage.dialog.emit('cancel',{preventDefault(){}});
assert.equal(staticPage.dialog.open,false,'Escape must close immediately with reduced motion.');
assert.equal(staticPage.document.body.classList.contains('modal-open'),false);
assert.equal(staticPage.trigger.focusOptions.preventScroll,true);

const pricedCatalog=seed.map(p=>p.id==='chotqol'?{...p,price:342000}:p);
const priceDetails=fixture({reduced:true,catalog:pricedCatalog});
assert(!/342[,\s]?000/u.test(renderCatalog(pricedCatalog)),'Prices must not appear on carousel cards.');
priceDetails.trigger.emit('click');
assert.equal(priceDetails.fields.get('#detail-price-row').hidden,false);
assert.match(priceDetails.fields.get('#detail-price').textContent,/^342[,\s]000 so‘m$/u,'Opening a priced honey must show its saved price.');
priceDetails.close.emit('click');priceDetails.triggers[1].emit('click');
assert.equal(priceDetails.fields.get('#detail-price-row').hidden,true,'An unpriced honey must not inherit the previous price.');
assert.equal(priceDetails.fields.get('#detail-price').textContent,'');

const russianDetails=fixture({reduced:true,language:'ru',catalog:pricedCatalog});
russianDetails.trigger.emit('click');
assert.equal(russianDetails.fields.get('#detail-title').textContent,'Чаткал');
assert.equal(russianDetails.fields.get('#detail-weight').textContent,'450 ± 15 г');
assert.match(russianDetails.fields.get('#detail-price').textContent,/342\s000 сум/u);
assert.equal(russianDetails.fields.get('#detail-availability').textContent,'Уточните по телефону');
russianDetails.close.emit('click');russianDetails.triggers[1].emit('click');
assert.equal(russianDetails.fields.get('#detail-title').textContent,'Коронги Тукай');
assert.equal(russianDetails.fields.get('#detail-price-row').hidden,true);

const changedPreference=fixture();
assert.equal(changedPreference.article.classList.contains('motion-pending'),true);
changedPreference.preference.set(true);
assert.equal(changedPreference.article.classList.contains('motion-pending'),false,'Changing preferences must reveal pending content.');
assert(changedPreference.animations.every(a=>a.cancelled),'Changing preferences must stop running motion.');
await flush();

const rapidClose=fixture();
rapidClose.trigger.emit('click');
rapidClose.close.emit('click');
const countAfterFirstClose=rapidClose.animations.length;
rapidClose.dialog.emit('cancel',{preventDefault(){}});
assert.equal(rapidClose.animations.length,countAfterFirstClose,'Repeated close inputs must share one closing animation.');
rapidClose.animations.at(-1).finish();
await flush();
assert.equal(rapidClose.dialog.closed,1);
assert.equal(rapidClose.dialog.open,false);
assert.equal(rapidClose.document.body.classList.contains('modal-open'),false);
assert.equal(rapidClose.animations.at(-1).cancelled,true,'A finished closing animation must release its opacity effect before reopening.');

const repeated=fixture();
for(const opener of [...repeated.triggers,...repeated.triggers]){
 opener.emit('click');
 const opening=repeated.animations.at(-1);opening.finish();await flush();
 assert.equal(opening.cancelled,true,'A completed entrance must leave no retained animation effect.');
 assert.equal(repeated.dialog.open,true);
 assert.equal(repeated.dialog.classList.contains('is-closing'),false);
 repeated.close.emit('click');
 const closing=repeated.animations.at(-1);closing.finish();await flush();
 assert.equal(closing.cancelled,true,'Every completed close must clear its filled effect.');
 assert.equal(repeated.dialog.open,false);
 assert.equal(opener.focusOptions.preventScroll,true);
 assert.equal(repeated.document.body.style.paddingRight,'6px');
}

const delayedEvent=fixture({deferredClose:true});
delayedEvent.trigger.emit('click');delayedEvent.close.emit('click');
delayedEvent.animations.at(-1).finish();await flush();
assert.equal(delayedEvent.document.body.classList.contains('modal-open'),false,'Scrolling must unlock synchronously even when the native close event is queued.');
delayedEvent.triggers[1].emit('click');
const nextOpening=delayedEvent.animations.at(-1);
delayedEvent.closeEvents.shift()();
assert.equal(delayedEvent.dialog.open,true,'An older queued close event must not close the new product.');
assert.equal(delayedEvent.document.body.classList.contains('modal-open'),true,'An older close event must not unlock the new modal.');
assert.equal(nextOpening.cancelled,false,'An older close event must not cancel the new entrance.');
assert.equal(delayedEvent.fields.get('#detail-title').textContent,'Qorong‘i to‘qay');

const lateCompletion=fixture({deferredClose:true});
lateCompletion.trigger.emit('click');lateCompletion.close.emit('click');
lateCompletion.dialog.close();lateCompletion.triggers[2].emit('click');await flush();
assert.equal(lateCompletion.dialog.open,true,'The cancelled completion from an earlier session must not close the current product.');
assert.equal(lateCompletion.fields.get('#detail-title').textContent,'Cho‘l asali');
assert.equal(lateCompletion.document.body.classList.contains('modal-open'),true);

const scrollbarFallback=fixture({reduced:true,gutterSupported:false});
scrollbarFallback.trigger.emit('click');
assert.equal(scrollbarFallback.document.body.style.paddingRight,'21px','Without stable gutters, reserve the measured 15-pixel scrollbar gap.');
scrollbarFallback.close.emit('click');
assert.equal(scrollbarFallback.document.body.style.paddingRight,'6px','Restore the original inline padding on close.');
const stableGutter=fixture({reduced:true});stableGutter.trigger.emit('click');
assert.equal(stableGutter.document.body.style.paddingRight,'6px','Native stable gutters must not receive a second scrollbar compensation.');

const cancelledClose=fixture();
cancelledClose.trigger.emit('click');
cancelledClose.close.emit('click');
cancelledClose.preference.set(true);
await flush();
assert.equal(cancelledClose.dialog.open,false,'Cancelling motion during close must still close the dialog.');
assert.equal(cancelledClose.document.body.classList.contains('modal-open'),false,'Cancelled motion must release background scrolling.');

const fallback=fixture({supported:false});
assert.equal(fallback.article.classList.contains('motion-pending'),false,'Unavailable animation APIs must not hide content.');
fallback.trigger.emit('click');fallback.close.emit('click');
assert.equal(fallback.dialog.open,false);
await flush();
console.log('PASS: ten product reopenings, cleared animation effects, queued close events, late completions, scrollbar fallback, reduced motion, cancelled close and focus restoration.');
