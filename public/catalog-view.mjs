import {stringsFor,localizeProduct} from './i18n.mjs';
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formatPrice=(value,language='uz')=>new Intl.NumberFormat(language==='ru'?'ru-RU':'uz-UZ').format(value)+' '+stringsFor(language).currency;
export function safeImage(value){return /^\/(assets\/[a-z0-9-]+\.(?:webp|png|jpg)|media\/[a-f0-9]{64}\.(?:jpg|png|webp))$/.test(value)?value:'/assets/chotqol.webp';}
function card(p,index,total,language){
 const e=escapeHTML,t=stringsFor(language),image=safeImage(p.image),large=p.group==='large';
 const responsive=p.imageSmall?` srcset="${e(safeImage(p.imageSmall))} 768w, ${e(image)} 1536w" sizes="(max-width:650px) 88vw, 44vw"`:'';
 const about=language==='ru'?`Подробнее: ${p.title}, ${p.weight}`:`${p.title} ${p.weight} ${t.about}`;
 const alt=language==='ru'?`${p.title} — упаковка ${p.weight}`:`${p.title} — ${p.weight} ${t.package}`;
 return `<article class="product" data-card-id="${e(p.id)}" role="group" aria-roledescription="${t.slide}" aria-label="${index+1} / ${total}: ${e(p.title)}"><button class="product-image" type="button" data-product="${e(p.id)}" aria-label="${e(about)}"><img src="${e(image)}"${responsive} class="${image.startsWith('/media/')?'uploaded-product':''}" alt="${e(alt)}" loading="lazy" decoding="async"${large?' width="1536" height="1024"':''}><span>${t.details}</span></button><div class="product-meta"><h3>${e(p.title)}</h3><span>${e(p.weight)}</span></div><p>${e(p.subtitle)}</p>${!p.available?`<p class="product-availability">${t.unavailable}</p>`:''}<button class="text-button" type="button" data-product="${e(p.id)}">${t.meetHoney}</button></article>`;
}
function carousel(products,group,label,language){
 const id=`catalog-${group}`,e=escapeHTML,t=stringsFor(language);
 const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
 const playback='<svg class="carousel-pause-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg><svg class="carousel-play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 10 7-10 7V5Z"/></svg>';
 return `<div class="catalog-carousel" data-carousel="${group}" role="region" aria-roledescription="${t.carousel}" aria-label="${e(label)}"><div class="carousel-viewport" id="${id}" tabindex="0" aria-label="${e(label)} — ${t.swipe}"><div class="products catalog-track${group==='large'?' products-large':''}">${products.map((p,i)=>card(p,i,products.length,language)).join('')}</div></div><div class="carousel-controls" hidden><span class="carousel-hint">${t.browse}</span><div class="carousel-progress" aria-hidden="true"><span></span></div><span class="carousel-status" role="status" aria-live="off" aria-atomic="true"></span><div class="carousel-arrows"><button class="carousel-arrow carousel-toggle" type="button" aria-controls="${id}" aria-label="${e(label)}: ${t.autoplayStop}">${playback}</button><button class="carousel-arrow carousel-prev" type="button" data-carousel-step="-1" aria-controls="${id}" aria-label="${e(label)}: ${t.previous}">${arrow}</button><button class="carousel-arrow" type="button" data-carousel-step="1" aria-controls="${id}" aria-label="${e(label)}: ${t.next}">${arrow}</button></div></div></div>`;
}
export function renderCatalog(products,language='uz'){
 const t=stringsFor(language);
 if(!products.length)return `<p class="catalog-empty">${t.empty} <a href="tel:+998998209997">${t.call}</a>.</p>`;
 const localized=products.map(product=>localizeProduct(product,language));
 const regular=localized.filter(p=>p.group!=='large'),large=localized.filter(p=>p.group==='large');
 return (regular.length?carousel(regular,'standard',t.catalog,language):'')+(large.length?`<div class="large-packs" aria-labelledby="large-packs-title"><div class="pack-heading"><h3 id="large-packs-title">${t.largePacks}</h3><p>${t.largeNote}</p></div>${carousel(large,'large',t.largePacks,language)}</div>`:'');
}
