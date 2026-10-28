export function chooseLanguage(url,cookie=''){
 const requested=new URL(url).searchParams.get('lang');
 const explicit=requested==='uz'||requested==='ru';
 const remembered=cookie.match(/(?:^|;\s*)shifa_lang=(ru|uz)(?:;|$)/)?.[1];
 return {language:explicit?requested:remembered||'uz',explicit};
}
