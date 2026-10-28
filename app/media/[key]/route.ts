import {env} from 'cloudflare:workers';
export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}){
  const {key}=await params;
  if(!/^[a-f0-9]{64}\.(jpg|png|webp)$/.test(key))return new Response('Not found',{status:404});
  const object=await env.BUCKET?.get('catalog/'+key);
  if(!object)return new Response('Not found',{status:404});
  const headers=new Headers({'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});
  object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);
  return new Response(object.body,{headers});
}
