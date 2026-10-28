(() => {
 const $=s=>document.querySelector(s),app=$('#app'),scene=$('#keyboardScene');
 const card=$('#keyboardInput'),underlay=$('#keyboardUnderlay'),sheet=$('#keyboardSheet'),records=$('#keyboardRecords');
 const tabs=$('#keyboardSceneTabs'),dismiss=$('#keyboardDismiss'),hideKey=$('#keyboardHideKey');
 const viewport=$('#keyboardPhotoScroller'),track=$('#keyboardPhotoTrack'),photos=$('#keyboardPhotos'),add=$('#keyboardAdd'),text=$('#keyboardTextInput');
 const blocker=$('#keyboardMenuBlocker'),anchor=$('#keyboardMenuAnchor'),menu=$('#keyboardMenu');
 const camera=document.createElement('button');camera.id='keyboardCamera';camera.setAttribute('aria-label','相机，展开选择栏');camera.innerHTML='<img src="assets/camera-2x.png" alt="">';$('#keyboardInputRow').append(camera);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const DURATION=333,EASING='cubic-bezier(0.2, 0.8, 0.2, 1)';
 const endpoints={
  closed:{x:24,y:627,width:354,height:144,empty:0,records:-12,retract:0,keyboard:0,menu:0},
  menu:{x:12,y:639,width:378,height:144,empty:0,records:121,retract:1,keyboard:0,menu:1},
  keyboard:{x:12,y:397,width:378,height:144,empty:0,records:-121,retract:1,keyboard:1,menu:0},
 };
 let current={...endpoints.closed},mode='closed',frame=0,clock=null,items=[1],nextId=1;
 let suppressOutsideClick=false,pendingReveal=false,lastTrigger=null,followTrailing=false;
 let restoring=false,restoreTop=0,restoreBottom=0,restoreProgress=0;
 let menuReturn='closed';
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>1-Math.pow(1-clamp(x),3);
 function endpoint(next){
  if(next==='menu'&&menuReturn==='keyboard')return {...endpoint('keyboard'),menu:1};
  const value={...endpoints[next]};
  if(!items.length){Object.assign(value,{height:48,empty:1});
   if(next==='closed')Object.assign(value,{y:723,records:84});
   if(next==='keyboard')Object.assign(value,{x:24,y:481,width:354,records:-49});
   if(next==='menu')Object.assign(value,{x:24,y:723,width:354,records:205});
  }return value;
 }
 function positionMenu(){
  const a=app.getBoundingClientRect(),s=a.width/402,b=(items.length?add:camera).getBoundingClientRect();
  if(!add.hidden||!items.length)lastTrigger={tx:(b.left+b.width/2-a.left)/s,ty:(b.top+b.height/2-a.top)/s};
  const {tx,ty}=lastTrigger??{tx:201,ty:current.y+50};
  const left=Math.max(12,Math.min(245,tx-72.5)),top=current.y-112-12*current.empty*current.keyboard;
  anchor.style.left=`${left}px`;anchor.style.top=`${top}px`;
  const p=current.menu;
  menu.style.transform=`translate(${(tx-left-72.5)*(1-p)}px,${(ty-top-52)*(1-p)}px) scale(${.12+.88*p})`;
  menu.style.opacity=String(p);
 }
 function render(value){
  current={...value};const p=clamp(current.retract),r=ease(p/.5);
  const finalTop=506+96*current.empty,finalBottom=783;
  const layerTop=restoring?restoreTop+(finalTop-restoreTop)*restoreProgress:finalTop+76*r;
  const layerBottom=restoring?restoreBottom+(finalBottom-restoreBottom)*restoreProgress:finalBottom+76*r;
  underlay.style.top=`${layerTop-20}px`;underlay.style.height=`${layerBottom-layerTop+40}px`;
  underlay.style.transform='none';underlay.style.opacity=String(restoring?1:1-r);
  underlay.style.visibility=restoring||r<1?'visible':'hidden';
  const iconStrip=underlay.querySelector('.panelTop');
  iconStrip.style.opacity=String(restoring?restoreProgress:1);
  iconStrip.style.clipPath=`inset(0 0 ${Math.max(0,153-(layerBottom-layerTop))}px 0)`;
  const stripHeight=Math.min(153,layerBottom-layerTop);
  const middleTop=restoring?40+(stripHeight-40)*restoreProgress:stripHeight;
  underlay.querySelector('.panelCap').style.opacity=String(restoring?1-restoreProgress:0);
  const middle=underlay.querySelector('.panelMiddle');middle.style.top=`${middleTop}px`;middle.style.height=`${Math.max(0,layerBottom-layerTop-middleTop)}px`;
  card.style.height=`${current.height}px`;card.style.borderRadius=`${16+10*current.empty}px`;
  viewport.style.opacity=String(1-current.empty);viewport.style.pointerEvents=current.empty>.01?'none':'auto';
  $('#keyboardSend').style.opacity=String(1-current.empty);$('#keyboardSend').style.pointerEvents=current.empty>.01?'none':'auto';
  camera.style.opacity=String(current.empty);camera.style.pointerEvents=current.empty>.99?'auto':'none';
  $('#keyboardInputRow').style.bottom=`${11-2*current.empty}px`;
  $('#keyboardCompactBase').style.opacity=String(restoring?0:current.empty*current.keyboard);$('#keyboardCompactBase').style.top=`${current.y-32}px`;
  card.style.left=`${current.x}px`;card.style.top=`${current.y}px`;card.style.width=`${current.width}px`;
  if(followTrailing)viewport.scrollLeft=Math.max(0,track.offsetWidth-viewport.clientWidth);
  sheet.style.transform=`translateY(${325*(1-current.keyboard)}px)`;
  records.style.transform=`translateY(${current.records}px)`;
  tabs.style.transform=`translateY(${83*current.keyboard}px)`;
  dismiss.hidden=mode!=='keyboard'||current.keyboard===0;dismiss.style.height=`${Math.max(0,current.y-106)}px`;
  hideKey.hidden=current.keyboard<.999;
  anchor.hidden=blocker.hidden=mode!=='menu'&&current.menu<.001;
  menu.inert=mode!=='menu';if(!anchor.hidden)positionMenu();
 }
 function animate(next){
  cancelAnimationFrame(frame);clock?.cancel();
  if(next==='menu'&&mode!=='menu')menuReturn=mode==='keyboard'?'keyboard':'closed';
  followTrailing=pendingReveal||viewport.scrollLeft>=Math.max(0,track.offsetWidth-viewport.clientWidth)-2;
  const from={...current},to=endpoint(next),start=performance.now();
  restoring=next==='closed'&&mode!=='closed';restoreProgress=0;
  restoreTop=current.y-12*current.empty;restoreBottom=current.y+current.height+12*current.empty;
  mode=next;
  scene.dataset.mode=next;scene.dataset.state=next==='closed'?'closing':'opening';
  scene.dataset.keyboardActive=String(to.keyboard===1);
  viewport.dispatchEvent(new Event('reset-photo-drag'));
  viewport.style.overflowX=next==='menu'?'hidden':'auto';
  text.setAttribute('aria-expanded',String(to.keyboard===1));add.setAttribute('aria-expanded',String(next==='menu'));
  $('#keyboardPlaceholder').textContent=to.keyboard===1?'输入你想记录的':'点击输入或按住语音记录';
  if(next==='menu'){anchor.hidden=blocker.hidden=false;}
  const duration=reduced.matches?1:DURATION;
  clock=document.createElement('div').animate([{opacity:0},{opacity:1}],{duration,easing:EASING,fill:'both'});clock.pause();
  function tick(now){
   const elapsed=Math.min(duration,now-start);clock.currentTime=elapsed;
   const p=clock.effect.getComputedTiming().progress??0,value={};
   restoreProgress=p;
   for(const key in to)value[key]=from[key]+(to[key]-from[key])*p;
   const widening=next!=='closed'?ease((p-.16)/.84):p;
   value.width=from.width+(to.width-from.width)*widening;
   value.x=from.x+(to.x-from.x)*widening;
   render(value);
   if(elapsed<duration)frame=requestAnimationFrame(tick);
   else{clock.cancel();render(to);scene.dataset.state=next==='closed'?'closed':'open';frame=0;if(next!=='menu'&&pendingReveal){pendingReveal=false;viewport.scrollTo({left:track.offsetWidth-viewport.clientWidth,behavior:reduced.matches?'instant':'smooth'});}}
  }
  frame=requestAnimationFrame(tick);
 }
 function renderPhotos(){
  photos.replaceChildren();
  for(const id of items){
   const el=document.createElement('div');el.className='photo';
   const img=document.createElement('img');img.src='assets/photo.png';img.alt=`已添加图片 ${id}`;
   const remove=document.createElement('button');remove.setAttribute('aria-label',`删除图片 ${id}`);remove.innerHTML='<img src="assets/remove.svg" alt="">';
   remove.onclick=()=>{if(mode!=='closed'&&mode!=='keyboard')return;items=items.filter(x=>x!==id);renderPhotos();if(!items.length)animate('closed');};
   el.append(img,remove);photos.append(el);
  }
  add.hidden=!items.length||items.length>=9;
  requestAnimationFrame(()=>{viewport.scrollTo({left:track.offsetWidth-viewport.clientWidth,behavior:reduced.matches?'instant':'smooth'});});
 }
 window.attachPhotoDrag(viewport,track,photos,()=>app.dataset.scene==='3'&&((mode==='closed'&&scene.dataset.state==='closed')||(mode==='keyboard'&&scene.dataset.state==='open')));
 text.onclick=()=>{if(mode==='closed')animate('keyboard');};
 camera.onclick=()=>{if(mode==='closed'||mode==='keyboard')animate('menu');};
 add.onclick=()=>{if(mode==='closed'||mode==='keyboard')animate('menu');};
 dismiss.onclick=hideKey.onclick=()=>animate('closed');
 for(const button of menu.querySelectorAll('button'))button.onclick=()=>{if(items.length<9)items.push(++nextId);pendingReveal=true;renderPhotos();animate(menuReturn);};
 document.addEventListener('pointerdown',event=>{
  if(app.dataset.scene!=='3'||mode!=='menu'||anchor.contains(event.target))return;
  event.preventDefault();event.stopImmediatePropagation();suppressOutsideClick=true;animate(menuReturn);
 },true);
 document.addEventListener('click',event=>{if(suppressOutsideClick){suppressOutsideClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('pointerdown',event=>{if(!blocker.hidden&&anchor.contains(event.target))suppressOutsideClick=false;},true);
 blocker.onclick=event=>{event.stopPropagation();if(mode==='menu')animate(menuReturn);};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&app.dataset.scene==='3'&&mode!=='closed')animate(mode==='menu'?menuReturn:'closed');});
 function reset(){cancelAnimationFrame(frame);clock?.cancel();mode='closed';scene.dataset.keyboardActive='false';scene.dataset.mode='closed';scene.dataset.state='closed';suppressOutsideClick=false;render(endpoint('closed'));text.setAttribute('aria-expanded','false');add.setAttribute('aria-expanded','false');viewport.style.overflowX='auto';$('#keyboardPlaceholder').textContent='点击输入或按住语音记录';}
 document.querySelectorAll('[role=tab]').forEach(tab=>tab.addEventListener('click',reset));
 window.addEventListener('resize',()=>{if(mode==='menu')positionMenu();});
 viewport.addEventListener('scroll',()=>{if(mode==='menu')positionMenu();});
 const slices='<img class="panelCap" src="assets/panel-cap-2x.png" alt=""><img class="panelMiddle" src="assets/panel-middle-2x.png" alt=""><img class="panelBottom" src="assets/panel-bottom-2x.png" alt=""><img class="panelTop" src="assets/panel-top-2x.png" alt="">';
 underlay.innerHTML=slices;
 const base=document.createElement('div');base.id='keyboardCompactBase';base.innerHTML=slices.replace(/<img class="panelTop"[^>]*>/,'');scene.insertBefore(base,card);
 reset();renderPhotos();
 window.keyboardSceneDemo={get state(){return mode},get values(){return {...current}},get imageCount(){return items.length},addPhoto(){if(items.length<9)items.push(++nextId);renderPhotos();animate('closed');},duration:DURATION};
})();
