export async function boundedBytes(response,limit){
 if(Number(response.headers.get('content-length'))>limit)throw new Error('FILE_TOO_LARGE');
 const reader=response.body?.getReader();if(!reader)throw new Error('EMPTY_BODY');
 const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new Error('FILE_TOO_LARGE');chunks.push(value);}}
 catch(error){await reader.cancel();throw error;}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export function imageType(bytes){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return ['jpg','image/jpeg'];
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return ['png','image/png'];
 if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return ['webp','image/webp'];
 throw new Error('INVALID_IMAGE');
}
export class TelegramClient {
 constructor(token,fetcher=fetch){this.token=token;this.fetcher=fetcher;}
 async call(method,body){
   let response;
   try{response=await this.fetcher(`https://api.telegram.org/bot${this.token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}catch{throw new Error('TELEGRAM_UNAVAILABLE');}
   let result;try{result=await response.json();}catch{throw new Error('TELEGRAM_UNAVAILABLE');}
   if(!response.ok||!result.ok)throw new Error('TELEGRAM_UNAVAILABLE');
   return result.result;
 }
 async send(chatId,message){return this.call('sendMessage',{chat_id:chatId,text:message.text,reply_markup:{inline_keyboard:message.buttons??[]},link_preview_options:{is_disabled:true}});}
 async photo(message,bucket){
   const file=message.photo?.at(-1)??message.document;
   if(!file?.file_id)throw new Error('PHOTO_REQUIRED');
   const limit=8*1024*1024;
   if(file.file_size>limit)throw new Error('FILE_TOO_LARGE');
   const info=await this.call('getFile',{file_id:file.file_id});
   if(info.file_size>limit)throw new Error('FILE_TOO_LARGE');
   if(!/^[A-Za-z0-9_./-]+$/.test(info.file_path)||info.file_path.includes('..'))throw new Error('INVALID_IMAGE');
   let response;
   try{response=await this.fetcher(`https://api.telegram.org/file/bot${this.token}/${info.file_path}`,{signal:AbortSignal.timeout(12000)});}catch{throw new Error('TELEGRAM_UNAVAILABLE');}
   if(!response.ok)throw new Error('TELEGRAM_UNAVAILABLE');
   const bytes=await boundedBytes(response,limit),[extension,contentType]=imageType(bytes);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   const key=`${hash}.${extension}`;
   await bucket.put('catalog/'+key,bytes,{httpMetadata:{contentType}});
   return '/media/'+key;
 }
}
