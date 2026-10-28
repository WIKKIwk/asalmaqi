import {env} from 'cloudflare:workers';
import template from '../lib/site-template.html?raw';
import {CatalogStore,publicProducts} from '../lib/catalog-store.mjs';
import {renderPage} from '../lib/page.mjs';
import {chooseLanguage} from '../lib/language.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  const {language,explicit}=chooseLanguage(request.url,request.headers.get('Cookie')||'');
  const store=new CatalogStore(env.DB);
  await store.initialize();
  const products=publicProducts(await store.list());
  const headers=new Headers({'Content-Type':'text/html; charset=utf-8','Content-Language':language,'Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'});
  if(explicit)headers.set('Set-Cookie',`shifa_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${new URL(request.url).protocol==='https:'?'; Secure':''}`);
  return new Response(renderPage(template,products,language),{headers});
}
