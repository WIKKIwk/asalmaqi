// A single timer per carousel; user pauses survive catalog refreshes.
export function createCarouselPlayback({advance,blocked,changed=()=>{},paused=false,delay=5200,clock=globalThis}){
 let timer=null,destroyed=false;
 const stop=()=>{
  if(timer!==null)clock.clearTimeout(timer);
  timer=null;
 };
 const sync=()=>{
  stop();
  if(destroyed)return;
  const playing=!paused&&!blocked();
  changed(playing,paused);
  if(!playing)return;
  timer=clock.setTimeout(()=>{
   timer=null;
   if(destroyed)return;
   if(!paused&&!blocked())advance();
   sync();
  },delay);
 };
 return {
  sync,stop,
  isPaused:()=>paused,
  setPaused(value){paused=Boolean(value);sync()},
  destroy(){destroyed=true;stop()}
 };
}
