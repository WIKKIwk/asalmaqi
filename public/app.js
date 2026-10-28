import {renderCatalog,formatPrice} from './catalog-view.mjs';
import {initCatalogCarousels} from './catalog-carousel.mjs';
import {stringsFor,localizeProduct} from './i18n.mjs';
const language=document.documentElement.lang==='ru'?'ru':'uz',strings=stringsFor(language);
const syncLanguageLinks=()=>document.querySelectorAll('.language-switch a').forEach(link=>{link.hash=location.hash});
syncLanguageLinks();
window.addEventListener('hashchange',syncLanguageLinks);
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
const motionAnimations=new Map();
const motionEase='cubic-bezier(.22,1,.36,1)';

function animateElement(element,keyframes,options={}){
 if(motionPreference.matches||typeof element.animate!=='function')return null;
 motionAnimations.get(element)?.cancel();
 try{
  const animation=element.animate(keyframes,{duration:620,easing:motionEase,fill:'backwards',...options});
  motionAnimations.set(element,animation);
  const forget=()=>{
   if(motionAnimations.get(element)===animation)motionAnimations.delete(element);
   // Release filled effects too, so the next opening starts from the CSS state.
   animation.cancel();
  };
  animation.finished.then(forget,forget);
  return animation;
 }catch{return null}
}

function finishAnimations(){
 for(const animation of motionAnimations.values())animation.cancel();
 motionAnimations.clear();
}

const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('nav');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!open));nav.classList.toggle('open',!open)});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}});
let products=Object.fromEntries(JSON.parse(document.querySelector('#catalog-data').textContent).map(p=>[p.id,p]));
const catalogRoot=document.querySelector('#catalog-products');
let catalogCarousels=initCatalogCarousels(catalogRoot,undefined,language);
const dialog=document.querySelector('dialog');let trigger,dialogClosing=false,dialogSession=0,bodyPaddingRight;

function releaseDialog(){
 dialogClosing=false;
 dialog.classList.remove('is-closing');
 const animation=motionAnimations.get(dialog);
 motionAnimations.delete(dialog);
 animation?.cancel();
 document.body.classList.remove('modal-open');
 if(bodyPaddingRight!==undefined){
  document.body.style.paddingRight=bodyPaddingRight;
  bodyPaddingRight=undefined;
 }
 const opener=trigger;
 trigger=undefined;
 opener?.focus({preventScroll:true});
}

function lockBodyScroll(){
 bodyPaddingRight=document.body.style.paddingRight;
 const scrollbarWidth=window.innerWidth-document.documentElement.clientWidth;
 if(!window.CSS?.supports('scrollbar-gutter','stable')&&scrollbarWidth>0){
  const padding=parseFloat(window.getComputedStyle(document.body).paddingRight)||0;
  document.body.style.paddingRight=`${padding+scrollbarWidth}px`;
 }
 document.body.classList.add('modal-open');
}

document.addEventListener('click',event=>{
 const b=event.target.closest?.('[data-product]');
 if(!b||!products[b.dataset.product])return;
 if(dialog.open)return;
 releaseDialog();
 dialogSession++;
 trigger=b;
 const p=localizeProduct(products[b.dataset.product],language);
 document.querySelector('#detail-title').textContent=p.title;
 document.querySelector('#detail-subtitle').textContent=p.subtitle;
 document.querySelector('#detail-description').textContent=p.description;
 document.querySelector('#detail-weight').textContent=p.weight;
 const img=document.querySelector('#detail-image');
 img.src=p.image;
 img.alt=language==='ru'?`${p.title} — упаковка ${p.weight}`:`${p.title} — ${p.weight} qadoq`;
 img.classList.toggle('wide-product',p.group==='large');
 img.classList.toggle('uploaded-product',p.image.startsWith('/media/'));
 document.querySelector('#detail-price-row').hidden=p.price===null;
 document.querySelector('#detail-price').textContent=p.price===null?'':formatPrice(p.price,language);
 document.querySelector('#detail-availability').textContent=p.available?(p.updatedAt?strings.available:strings.askByPhone):strings.unavailable;
 dialog.showModal();
 lockBodyScroll();
 animateElement(dialog,[{opacity:0},{opacity:1}],{duration:280});
});

function closeDialog(){
 if(!dialog.open||dialogClosing)return;
 dialogClosing=true;
 const session=dialogSession;
 const opacity=window.getComputedStyle(dialog).opacity;
 dialog.classList.add('is-closing');
 const animation=animateElement(dialog,[{opacity},{opacity:0}],{duration:170,easing:'ease-in',fill:'forwards'});
 const finish=()=>{
  if(dialogSession!==session||!dialog.open||!dialogClosing)return;
  dialog.close();
  releaseDialog();
 };
 if(animation)animation.finished.then(finish,finish);else finish();
}

document.querySelector('.dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog()});
dialog.addEventListener('click',event=>{
 if(event.target!==dialog)return;
 const rect=dialog.getBoundingClientRect();
 if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();
});
dialog.addEventListener('close',()=>{
 // Native close events can arrive after another product has already opened.
 if(!dialog.open)releaseDialog();
});

// Only content below the first viewport is prepared for a one-time entrance.
(function initPageMotion(){
 if(motionPreference.matches||!('IntersectionObserver' in window)||typeof document.body.animate!=='function'||location.hash||window.shifaScrollStarted||window.scrollY>0)return;
 document.querySelectorAll('.hero-content > *').forEach((element,index)=>{
  animateElement(element,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{delay:Math.min(index,4)*65});
 });
 animateElement(document.querySelector('.hero-picture img'),[{opacity:.7},{opacity:1}],{duration:1000});
 animateElement(document.querySelector('.hero-caption'),[{opacity:0},{opacity:1}],{delay:260,duration:700});
 const pending=new Set();
 const reveal=(element,immediate=false)=>{
  if(!pending.has(element))return;
  pending.delete(element);
  observer.unobserve(element);
  element.classList.remove('motion-pending');
  if(immediate||motionPreference.matches)return;
  if(element.matches('.story-photo')){
   animateElement(element,[{opacity:0},{opacity:1}],{duration:760});
   animateElement(element.querySelector('img'),[{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:950});
   return;
  }
  const siblings=[...element.parentElement.children].filter(item=>item.matches('article'));
  const delay=element.matches('article')?Math.max(0,siblings.indexOf(element))*70:element.matches('.story-text')?90:0;
  animateElement(element,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{delay});
 };
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting)reveal(entry.target);
 }),{threshold:0,rootMargin:'0px 0px -4% 0px'});
 document.querySelectorAll('.section-heading,.triptych article,.catalog-carousel,.pack-heading,.story-photo,.story-text,.order-steps li,.social-intro,.social-link,.faq-intro,.faq-list,.contact .eyebrow,.contact h2,.contact > p:not(.eyebrow),.contact-grid').forEach(element=>{
  if(element.getBoundingClientRect().top>=window.innerHeight+24){
   pending.add(element);
   element.classList.add('motion-pending');
   observer.observe(element);
  }
 });
 document.addEventListener('focusin',event=>{
  for(const element of pending)if(element.contains(event.target))reveal(element,true);
  for(const [element,animation] of motionAnimations)if(element!==dialog&&element.contains(event.target))animation.cancel();
 });
 window.addEventListener('hashchange',()=>{
  const target=document.getElementById(location.hash.slice(1));
  if(target)for(const element of [...pending])if(target.contains(element))reveal(element,true);
 });
 const showAll=()=>{
  for(const element of [...pending])reveal(element,true);
  observer.disconnect();
 };
 motionPreference.addEventListener?.('change',event=>{if(event.matches)showAll()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)showAll()});
 window.addEventListener('pagehide',showAll);
 window.addEventListener('pageshow',event=>{if(event.persisted)showAll()});
})();

// A few pixels of depth follow a desktop pointer; touch layouts stay steady.
(function initHeroDepth(){
 const hero=document.querySelector('.hero');
 const desktop=window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1001px)');
 let enabled=false,frame=0,pointerX=0,pointerY=0;
 const reset=()=>{
  cancelAnimationFrame(frame);frame=0;
  hero.style.setProperty('--hero-x','0px');
  hero.style.setProperty('--hero-y','0px');
 };
 const update=()=>{
  enabled=!motionPreference.matches&&desktop.matches&&!document.hidden;
  hero.classList.toggle('motion-depth',enabled);
  if(!enabled)reset();
 };
 hero.addEventListener('pointermove',event=>{
  if(!enabled)return;
  const rect=hero.getBoundingClientRect();
  pointerX=((event.clientX-rect.left)/rect.width-.5)*12;
  pointerY=((event.clientY-rect.top)/rect.height-.5)*8;
  if(!frame)frame=requestAnimationFrame(()=>{
   hero.style.setProperty('--hero-x',pointerX.toFixed(2)+'px');
   hero.style.setProperty('--hero-y',pointerY.toFixed(2)+'px');
   frame=0;
  });
 },{passive:true});
 hero.addEventListener('pointerleave',reset);
 desktop.addEventListener?.('change',update);
 motionPreference.addEventListener?.('change',update);
 document.addEventListener('visibilitychange',update);
 window.addEventListener('pagehide',reset);
 update();
})();

motionPreference.addEventListener?.('change',event=>{if(event.matches)finishAnimations()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)finishAnimations()});
window.addEventListener('pagehide',finishAnimations);

// Refresh when returning to the tab, without replacing an open product or a focused card.
(function liveCatalog(){
 let current=JSON.stringify(Object.values(products)),refreshing=false;
 async function refresh(){
  if(document.hidden||dialog.open||refreshing||document.activeElement?.closest?.('#catalog-products'))return;
  refreshing=true;
  try{
   const response=await fetch('/api/catalog',{cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json();
   if(!Array.isArray(data.products))return;
   const next=JSON.stringify(data.products);
   if(next===current)return;
   current=next;products=Object.fromEntries(data.products.map(p=>[p.id,p]));
   const positions=catalogCarousels.snapshot();
   catalogCarousels.destroy();
   catalogRoot.innerHTML=renderCatalog(data.products,language);
   catalogCarousels=initCatalogCarousels(catalogRoot,positions,language);
  }catch{/* Keep the last server-rendered catalog during a temporary network failure. */}
  finally{refreshing=false;}
 }
 window.addEventListener('pageshow',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(refresh,60000);
})();
