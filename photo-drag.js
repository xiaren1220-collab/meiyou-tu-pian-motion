// A single continuous list: free horizontal movement, elastic edges, no item snapping.
window.attachPhotoDrag = (viewport,track,photoList,enabled=()=>true) => {
 const app=document.querySelector('#app');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let gesture=null,frame=0,offset=0,suppressClick=false;
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const maximum=()=>Math.max(0,track.offsetWidth-viewport.clientWidth);
 const rubber=x=>Math.sign(x)*64*(1-Math.exp(-Math.abs(x)/180));
 function paint(value){offset=value;track.style.transform=`translateX(${value}px)`;}
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function rebound(velocity=0){
  stop();
  if(reduced.matches){paint(0);return;}
  let last=performance.now();
  const tick=now=>{
   const dt=Math.min(32,now-last)/1000;last=now;
   velocity+=(-210*offset-25*velocity)*dt;
   paint(offset+velocity*dt);
   if(Math.abs(offset)<.08&&Math.abs(velocity)<1){paint(0);frame=0;return;}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
 }
 function coast(speed){
  stop();if(reduced.matches||Math.abs(speed)<.08)return;
  let last=performance.now();
  const tick=now=>{
   const dt=Math.min(32,now-last);last=now;
   const next=viewport.scrollLeft+speed*dt,max=maximum();
   viewport.scrollLeft=clamp(next,0,max);
   if(next<0||next>max){paint(-rubber(next-clamp(next,0,max)));rebound(-speed*70);return;}
   speed*=Math.exp(-dt/180);
   if(Math.abs(speed)<.015){frame=0;return;}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
 }
 viewport.addEventListener('pointerdown',event=>{
  if(!enabled()||event.button!==0||!event.isPrimary)return;
  stop();suppressClick=false;
  // Interrupt any automatic reveal smoothly at its current scroll position.
  viewport.scrollTo({left:viewport.scrollLeft,behavior:'instant'});
  gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastTime:event.timeStamp,scroll:viewport.scrollLeft,initialOffset:offset,scale:app.getBoundingClientRect().width/402,moved:false,speed:0};
 });
 viewport.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const g=gesture,delta=(event.clientX-g.startX)/g.scale;
  if(!g.moved){
   if(Math.abs(delta)<6)return;
   if(Math.abs(event.clientY-g.startY)>Math.abs(event.clientX-g.startX)){gesture=null;rebound();return;}
   g.moved=true;viewport.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
  const dt=Math.max(1,event.timeStamp-g.lastTime);
  const instant=-(event.clientX-g.lastX)/g.scale/dt;
  g.speed=.65*instant+.35*g.speed;g.lastX=event.clientX;g.lastTime=event.timeStamp;
  const raw=g.scroll-delta,limited=clamp(raw,0,maximum());
  viewport.scrollLeft=limited;
  paint(g.initialOffset-rubber(raw-limited));
 },{passive:false});
 function end(event,cancelled=false){
  if(!gesture||event.pointerId!==gesture.id)return;
  const g=gesture;gesture=null;
  if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
  if(!g.moved){if(offset)rebound();return;}
  event.preventDefault();suppressClick=true;
  if(offset||cancelled)rebound();
  else coast(event.timeStamp-g.lastTime>90?0:g.speed);
 }
 viewport.addEventListener('pointerup',event=>end(event));
 viewport.addEventListener('pointercancel',event=>end(event,true));
 // Touch implicitly captures on the pressed child. Its bubbled loss when we
 // capture on the scroller is a transfer, not the end of the user's gesture.
 viewport.addEventListener('lostpointercapture',event=>{if(event.target===viewport&&gesture?.id===event.pointerId){gesture=null;suppressClick=true;rebound();}});
 viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
 viewport.addEventListener('contextmenu',event=>event.preventDefault());
 function reset(){stop();gesture=null;paint(0);}
 new MutationObserver(reset).observe(photoList,{childList:true});
 viewport.addEventListener('reset-photo-drag',reset);
 viewport.addEventListener('wheel',event=>{if(!enabled())event.preventDefault();},{passive:false});
 document.querySelectorAll('[role=tab]').forEach(tab=>tab.addEventListener('click',()=>{stop();gesture=null;paint(0);}));
 window.addEventListener('resize',()=>{stop();gesture=null;paint(0);});
};
window.attachPhotoDrag(document.querySelector('#photoScroller'),document.querySelector('#photoTrack'),document.querySelector('#photos'));
