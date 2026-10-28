import assert from 'node:assert/strict';
import {createCarouselPlayback} from '../public/carousel-playback.mjs';

let now=0,nextId=0,advances=0,blocked=false;
const timers=new Map(),states=[];
const clock={
 setTimeout(fn,delay){const id=++nextId;timers.set(id,{fn,at:now+delay});return id},
 clearTimeout(id){timers.delete(id)}
};
const tick=ms=>{
 const end=now+ms;
 while(true){
  const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];
  if(!next||next[1].at>end)break;
  now=next[1].at;timers.delete(next[0]);next[1].fn();
 }
 now=end;
};
const playback=createCarouselPlayback({clock,advance:()=>advances++,blocked:()=>blocked,changed:(playing,paused)=>states.push({playing,paused})});
playback.sync();tick(5199);assert.equal(advances,0);
tick(1);assert.equal(advances,1,'The carousel advances after a full reading interval.');
tick(5200);assert.equal(advances,2,'Automatic playback continues on successive intervals.');
for(let i=0;i<20;i++)playback.sync();
assert.equal(timers.size,1,'Focus, resize and settle events must not create duplicate timers.');
blocked=true;tick(5200);
assert.equal(advances,2,'An open dialog, hidden tab, hover, drag or reduced-motion change blocks even an already queued tick.');
assert.equal(timers.size,0);
blocked=false;playback.sync();tick(3000);blocked=true;playback.sync();tick(10000);
assert.equal(advances,2,'Interaction cancels pending movement.');
blocked=false;playback.sync();tick(5199);assert.equal(advances,2);
tick(1);assert.equal(advances,3,'Leaving an interaction gives the reader a fresh interval.');
playback.setPaused(true);tick(20000);assert.equal(advances,3);
assert.equal(playback.isPaused(),true);
blocked=true;playback.sync();blocked=false;playback.sync();tick(10000);
assert.equal(advances,3,'A deliberate pause survives other state changes.');
playback.setPaused(false);tick(5200);assert.equal(advances,4);
const pending=[...timers.values()][0].fn;
playback.destroy();assert.equal(timers.size,0);pending();playback.sync();tick(10000);
assert.equal(advances,4,'A removed catalog cannot advance or restart through a stale callback.');
assert.equal(states.at(-1).playing,true);
console.log('PASS: repeated autoplay, interaction and visibility guards, full resume delay, explicit pause, one timer and cleanup after catalog refresh.');
