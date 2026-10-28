import EmblaCarousel from './vendor/embla-carousel.mjs';
import {createCarouselPlayback} from './carousel-playback.mjs';
import {stringsFor} from './i18n.mjs';

export function initCatalogCarousels(root,saved=new Map(),language='uz'){
 const strings=stringsFor(language);
 const controllers=[...root.querySelectorAll('[data-carousel]')].map(region=>{
  const viewport=region.querySelector('.carousel-viewport'),track=region.querySelector('.catalog-track');
  const cards=[...track.children],label=region.getAttribute('aria-label');
  const controls=region.querySelector('.carousel-controls'),status=region.querySelector('.carousel-status');
  const progress=region.querySelector('.carousel-progress'),toggle=region.querySelector('.carousel-toggle');
  const previous=region.querySelector('[data-carousel-step="-1"]'),next=region.querySelector('[data-carousel-step="1"]');
  const events=new AbortController(),options={signal:events.signal};
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const restored=saved.get(region.dataset.carousel);
  const found=restored?cards.findIndex(card=>card.dataset.cardId===restored.id):-1;
  const startIndex=found>=0?found:Math.min(restored?.index||0,cards.length-1);
  let overflow=false,visible=false,hovered=false,dragging=false,destroyed=false,lastWidth=0,lastWheel=0;
  const measure=()=>{
   const width=track.getBoundingClientRect().width;
   const cardWidth=cards[0].getBoundingClientRect().width;
   const gap=parseFloat(getComputedStyle(cards[0]).marginRight)||0;
   overflow=cards.length>1&&cards.length*cardWidth+(cards.length-1)*gap>width+2;
   region.classList.toggle('carousel-looping',overflow);
  };
  region.classList.add('carousel-ready');
  measure();
  const carousel=EmblaCarousel(viewport,{align:'start',loop:overflow,containScroll:'trimSnaps',duration:40,startIndex,watchResize:false,watchSlides:false});
  const playback=createCarouselPlayback({
   paused:restored?.paused===true,
   blocked:()=>!overflow||motion.matches||!visible||hovered||dragging||document.hidden||region.contains(document.activeElement)||Boolean(document.querySelector('dialog[open]')),
   advance:()=>carousel.scrollNext(),
   changed:(playing,paused)=>{
    region.dataset.autoplay=playing?'playing':paused?'paused':'waiting';
    toggle.dataset.paused=String(paused);
    toggle.setAttribute('aria-label',`${label}: ${paused?strings.autoplayStart:strings.autoplayStop}`);
    // Automatic changes stay quiet for screen readers; manual navigation is announced.
    status.setAttribute('aria-live',playing?'off':'polite');
   }
  });
  const update=()=>{
   const index=carousel.selectedScrollSnap();
   const enabled=overflow&&carousel.scrollSnapList().length>1;
   controls.hidden=!enabled;
   viewport.tabIndex=enabled?0:-1;
   previous.disabled=!carousel.canScrollPrev();
   next.disabled=!carousel.canScrollNext();
   toggle.hidden=motion.matches;
   const count=`${String(index+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
   if(status.textContent!==count)status.textContent=count;
   progress.style.setProperty('--progress-size',`${100/cards.length}%`);
   progress.style.setProperty('--progress-offset',`${index/cards.length*100}%`);
  };
  const go=direction=>{
   direction<0?carousel.scrollPrev(motion.matches):carousel.scrollNext(motion.matches);
   playback.sync();
  };
  previous.addEventListener('click',()=>go(-1),options);
  next.addEventListener('click',()=>go(1),options);
  toggle.addEventListener('click',()=>playback.setPaused(!playback.isPaused()),options);
  viewport.addEventListener('keydown',event=>{
   if(event.target!==viewport||event.altKey||event.ctrlKey||event.metaKey)return;
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();
   if(event.key==='Home'||event.key==='End'){
    carousel.scrollTo(event.key==='Home'?0:carousel.scrollSnapList().length-1,motion.matches);
    playback.sync();
   }else go(event.key==='ArrowLeft'?-1:1);
  },options);
  viewport.addEventListener('wheel',event=>{
   if(!overflow||Math.abs(event.deltaX)<=Math.abs(event.deltaY)||Math.abs(event.deltaX)<2)return;
   event.preventDefault();
   if(event.timeStamp-lastWheel<300)return;
   lastWheel=event.timeStamp;
   go(event.deltaX<0?-1:1);
  },{...options,passive:false});
  region.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;playback.sync()}},options);
  region.addEventListener('pointerleave',()=>{hovered=false;playback.sync()},options);
  region.addEventListener('focusin',()=>playback.sync(),options);
  region.addEventListener('focusout',()=>queueMicrotask(()=>{if(!destroyed)playback.sync()}),options);
  carousel.on('select',update).on('settle',()=>playback.sync());
  carousel.on('pointerDown',()=>{dragging=true;playback.sync()});
  carousel.on('pointerUp',()=>{dragging=false;playback.sync()});
  document.addEventListener('visibilitychange',()=>playback.sync(),options);
  document.querySelector('dialog')?.addEventListener('close',()=>playback.sync(),options);
  window.addEventListener('pagehide',()=>playback.stop(),options);
  window.addEventListener('pageshow',()=>playback.sync(),options);
  motion.addEventListener('change',()=>{
   if(motion.matches)carousel.scrollTo(carousel.selectedScrollSnap(),true);
   update();playback.sync();
  },options);
  const intersection=new IntersectionObserver(entries=>{
   visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.15;
   playback.sync();
  },{threshold:[0,.15]});
  intersection.observe(region);
  const resize=new ResizeObserver(()=>{
   const width=viewport.clientWidth;
   if(Math.abs(width-lastWidth)<1)return;
   lastWidth=width;
   const selected=carousel.selectedScrollSnap();
   measure();
   carousel.reInit({loop:overflow,startIndex:selected});
   update();playback.sync();
  });
  resize.observe(viewport);
  update();playback.sync();
  return {
   snapshot(){const index=carousel.selectedScrollSnap();return [region.dataset.carousel,{id:cards[index].dataset.cardId,index,paused:playback.isPaused()}]},
   destroy(){destroyed=true;playback.destroy();events.abort();intersection.disconnect();resize.disconnect();carousel.destroy()}
  };
 });
 return {
  snapshot:()=>new Map(controllers.map(controller=>controller.snapshot())),
  destroy:()=>controllers.forEach(controller=>controller.destroy())
 };
}
