import {renderCatalog} from '../public/catalog-view.mjs';
import {stringsFor} from '../public/i18n.mjs';
import {russianTemplate} from './site-ru.mjs';
export function renderPage(template,products,language='uz'){
 const t=stringsFor(language);
 const languages=`<div class="language-switch" role="group" aria-label="${t.language}"><a href="?lang=uz" lang="uz" hreflang="uz" aria-label="O‘zbekcha"${language==='uz'?' aria-current="page"':''}>UZ</a><a href="?lang=ru" lang="ru" hreflang="ru" aria-label="Русский"${language==='ru'?' aria-current="page"':''}>RU</a></div>`;
 const json=JSON.stringify(products).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const page=language==='ru'?russianTemplate(template):template;
 return page.replace('<!--LANGUAGE_SWITCH-->',()=>languages).replace('<!--CATALOG-->',()=>renderCatalog(products,language)).replace('<!--CATALOG_DATA-->',()=>json);
}
