import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseLanguage} from '../lib/language.mjs';
import {renderPage} from '../lib/page.mjs';
import {russianText} from '../lib/site-ru.mjs';
import {renderCatalog,formatPrice} from '../public/catalog-view.mjs';
import {localizeProduct} from '../public/i18n.mjs';
import seed from '../lib/catalog-seed.json' with {type:'json'};

const origin='https://shifa-aleasal.abdulfattox.chatgpt.site/';
assert.deepEqual(chooseLanguage(origin),{language:'uz',explicit:false});
assert.deepEqual(chooseLanguage(origin+'?lang=ru'),{language:'ru',explicit:true});
assert.equal(chooseLanguage(origin,'other=1; shifa_lang=ru; test=2').language,'ru');
assert.equal(chooseLanguage(origin+'?lang=uz','shifa_lang=ru').language,'uz');
assert.deepEqual(chooseLanguage(origin+'?lang=invalid','shifa_lang=ru'),{language:'ru',explicit:false});
assert.equal(chooseLanguage(origin,'shifa_lang=evil').language,'uz');

const template=readFileSync(new URL('../lib/site-template.html',import.meta.url),'utf8');
const neutral=new Set(['S','SHIFA','ALEASAL','TELEGRAM','SHIFA ALEASAL','Telegram','Instagram','@chotqol_asal','@shifa_aleasal']);
for(const [,text] of template.matchAll(/>([^<>]+)(?=<)/g)){
 const key=text.trim();
 if(!/[A-Za-z]/.test(key)||key.startsWith('window.')||neutral.has(key))continue;
 assert(Object.hasOwn(russianText,key),`Missing Russian page text: ${key}`);
}
const uz=renderPage(template,seed,'uz'),ru=renderPage(template,seed,'ru');
assert(uz.includes('<html lang="uz">'));assert(ru.includes('<html lang="ru">'));
assert(ru.includes('Как оформить заказ?'));assert(ru.includes('Главная навигация'));
assert(ru.includes('КОЛЛЕКЦИЯ МЁДА'));assert(ru.includes('Большие упаковки'));
assert(ru.includes('Подробнее'));assert(!ru.includes('<!--LANGUAGE_SWITCH-->'));
assert.match(ru,/href="\?lang=ru"[^>]*aria-current="page"/);
assert.match(uz,/href="\?lang=uz"[^>]*aria-current="page"/);
const ids=html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(ids(ru),ids(uz),'Changing language must preserve anchors, carousel targets and modal IDs.');
assert.equal(localizeProduct(seed[0],'ru').title,'Чаткал');
assert.equal(localizeProduct(seed[3],'ru').weight,'1 кг');
const edited={...seed[0],title:'Owner title',description:'Owner description'};
assert.equal(localizeProduct(edited,'ru').title,edited.title);
assert.equal(localizeProduct(edited,'ru').description,edited.description);
assert.equal(seed[0].title,'Chotqol','Translation must not rewrite stored catalog values.');
assert.match(formatPrice(342000,'ru'),/342\s000 сум/u);
assert(renderCatalog([],'ru').includes('Мы обновляем коллекцию'));
const malicious={...seed[0],title:'</script><img src=x onerror=alert(1)>'};
const unsafe=renderCatalog([malicious],'ru');
assert(!unsafe.includes('<img src=x'));assert(unsafe.includes('&lt;/script&gt;'));
console.log('PASS: URL and saved language selection, complete Russian static text, language links, stable anchors, translated catalog, currency, safe owner edits and escaping.');
