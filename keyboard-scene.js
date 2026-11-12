(() => {
 const $=s=>document.querySelector(s),app=$('#app'),scene=$('#keyboardScene');
 const card=$('#keyboardInput'),underlay=$('#keyboardUnderlay'),sheet=$('#keyboardSheet'),records=$('#keyboardRecords');
 const tabs=$('#keyboardSceneTabs'),dismiss=$('#keyboardDismiss'),hideKey=$('#keyboardHideKey');
 const viewport=$('#keyboardPhotoScroller'),track=$('#keyboardPhotoTrack'),photos=$('#keyboardPhotos'),add=$('#keyboardAdd'),text=$('#keyboardTextInput');
 const blocker=$('#keyboardMenuBlocker'),anchor=$('#keyboardMenuAnchor'),menu=$('#keyboardMenu');
 const cameraScreen=$('#cameraScreen'),cameraClose=$('#cameraClose'),cameraCapture=$('#cameraCapture');
 const mediaLayer=$('#mediaLayer'),cameraPanel=$('#cameraPanel'),albumPanel=$('#albumPanel'),albumGrid=$('#albumGrid');
 const albumConfirm=$('#albumConfirm'),albumTrack=$('#albumTrack');
 const foodTool=$('#foodTool'),foodPanel=$('#foodCameraPanel'),foodRecords=$('#foodRecords');
 const camera=document.createElement('button');camera.id='keyboardCamera';camera.setAttribute('aria-label','相机，展开选择栏');camera.innerHTML='<img src="assets/input-camera-2x.png" alt="">';$('#keyboardInputRow').append(camera);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const DURATION=333,EASING='cubic-bezier(0.2, 0.8, 0.2, 1)';
 const endpoints={
  closed:{x:24,y:627,width:354,height:144,empty:0,flat:0,layer:0,records:-12,retract:0,keyboard:0,menu:0},
  menu:{x:12,y:639,width:378,height:144,empty:0,flat:0,layer:0,records:121,retract:1,keyboard:0,menu:1},
  keyboard:{x:12,y:397,width:378,height:144,empty:0,flat:0,layer:0,records:-121,retract:1,keyboard:1,menu:0},
 };
 let current={...endpoints.closed,bgTop:506,bgBottom:783,bgOpacity:1,icons:1},mode='closed',frame=0,clock=null,items=[1],nextId=1;
 let suppressOutsideClick=false,pendingReveal=false,lastTrigger=null,followTrailing=false;
 let restoring=false,restoreTop=0,restoreBottom=0,restoreProgress=0;
 let menuReturn='closed',variant='2',mediaMotion='center',mediaMenuCenter=null;
 let cameraState='closed',cameraAnimation=null;
 let mediaState='closed',mediaType=null,mediaPreviousMode='closed',mediaAnimation=null,mediaMorphGhost=null,selectedMeals=[];
 let foodMode=false,foodOffset=0,foodCount=0,foodScrollFrame=0;
 const itemMeals=new Map();
 const albumPreload=new Image();albumPreload.src='assets/album-meals.png';albumPreload.decode?.().catch(()=>{});
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>1-Math.pow(1-clamp(x),3);
 function surface(value){
  const tools=value.retract===0;
  return {...value,bgTop:tools?506+96*value.empty:value.y-12*value.layer,bgBottom:tools?783:value.y+value.height+12*value.layer,bgOpacity:tools?1:value.layer,icons:tools?1:0};
 }
 function endpoint(next){
  if(next==='menu'&&menuReturn==='keyboard'){const value={...endpoint('keyboard'),menu:1};if(variant==='2'&&!items.length)Object.assign(value,{x:12,y:493,width:378,records:-25,flat:1});return surface(value);}
  const value={...endpoints[next]};
  if(variant==='1'&&next==='menu'&&items.length)Object.assign(value,{x:24,y:627,width:354,records:97,layer:1});
  if(variant==='1'&&next==='keyboard'&&items.length)Object.assign(value,{x:24,y:385,width:354,records:-145,layer:1});
  if(!items.length){Object.assign(value,{height:48,empty:1});
   if(next==='closed')Object.assign(value,{y:723,records:84});
   if(next==='keyboard')Object.assign(value,variant==='2'?{x:12,y:493,width:378,records:-25,flat:1}:{x:24,y:481,width:354,records:-49,layer:1});
   if(next==='menu')Object.assign(value,variant==='2'?{x:12,y:735,width:378,records:217,flat:1}:{x:24,y:723,width:354,records:143,layer:1});
  }return surface(value);
 }
 function positionMenu(){
  const a=app.getBoundingClientRect(),s=a.width/402,b=(items.length?add:camera).getBoundingClientRect();
  if(!add.hidden||!items.length)lastTrigger={tx:(b.left+b.width/2-a.left)/s,ty:(b.top+b.height/2-a.top)/s};
  const {tx,ty}=lastTrigger??{tx:201,ty:current.y+50};
  const left=Math.max(12,Math.min(245,tx-72.5)),top=current.y-112-12*current.layer;
  anchor.style.left=`${left}px`;anchor.style.top=`${top}px`;
  const p=current.menu;
  menu.style.transform=`translate(${(tx-left-72.5)*(1-p)}px,${(ty-top-52)*(1-p)}px) scale(${.12+.88*p})`;
  menu.style.opacity=String(p);
 }
 function render(value){
  current={...value};
  // One continuous source-derived surface: never swap or overlap translucent cards.
  const layerTop=current.bgTop,layerBottom=current.bgBottom;
  underlay.style.top=`${layerTop-20}px`;underlay.style.height=`${layerBottom-layerTop+40}px`;
  underlay.style.transform='none';underlay.style.opacity=String(current.bgOpacity);
  underlay.style.visibility=current.bgOpacity>0?'visible':'hidden';
  const iconStrip=underlay.querySelector('.panelTop');
  iconStrip.style.opacity=String(current.icons);
  iconStrip.style.clipPath=`inset(0 0 ${Math.max(0,153-(layerBottom-layerTop))}px 0)`;
  const middle=underlay.querySelector('.panelMiddle');middle.style.top='40px';middle.style.height=`${Math.max(0,layerBottom-layerTop-40)}px`;
  underlay.querySelector('.panelCap').style.opacity='1';
  card.style.height=`${current.height}px`;card.style.borderRadius=`${16+10*current.empty}px`;
  const borderOpacity=variant==='2'?1-clamp(current.retract):1;
  card.style.borderColor=`rgba(223, 223, 225, ${borderOpacity})`;
  card.style.boxShadow=variant==='2'?`inset 0 0 0 1px rgba(223, 223, 225, ${borderOpacity})`:'';
  viewport.style.opacity=String(1-current.empty);viewport.style.pointerEvents=current.empty>.01?'none':'auto';
  $('#keyboardSend').style.opacity=String(1-current.empty);$('#keyboardSend').style.pointerEvents=current.empty>.01?'none':'auto';
  camera.style.opacity=String(current.empty);camera.style.pointerEvents=current.empty>.99?'auto':'none';
  $('#keyboardInputRow').style.bottom=`${11-2*current.empty+(variant==='2'?1:0)}px`;
  $('#keyboardCompactBase').style.opacity='0';$('#keyboardCompactBase').style.top=`${current.y-32}px`;$('#keyboardCompactBase').style.height=`${current.height+64}px`;
  card.style.left=`${current.x}px`;card.style.top=`${current.y}px`;card.style.width=`${current.width}px`;
  if(followTrailing)viewport.scrollLeft=Math.max(0,track.offsetWidth-viewport.clientWidth);
  sheet.style.transform=`translateY(${325*(1-current.keyboard)}px)`;
  const foodShift=mediaMotion==='center'?foodOffset:0;
  records.style.transform=`translateY(${current.records+foodShift}px)`;
  foodRecords.style.transform=`translateY(${current.records+foodShift}px)`;
  foodRecords.hidden=mediaMotion!=='center';
  foodTool.hidden=mediaMotion!=='center'||mode!=='closed'||current.icons<.99;
  foodTool.style.top=`${current.bgTop+20}px`;
  // Cut the continuous line beneath the exported nodes instead of drawing over them.
  const holes=(variant==='2'?[current.records-227.5,current.records-183,current.records-86.5,current.records+10.5]:[current.records-126.5,current.records-82,current.records+15]).filter(y=>y>0&&y<768);
  const stops=['#000 0px'];for(const y of holes)stops.push(`#000 ${y-4}px`,`transparent ${y-4}px`,`transparent ${y+4}px`,`#000 ${y+4}px`);stops.push('#000 100%');
  $('#keyboardTimeline').style.maskImage=`linear-gradient(to bottom,${stops.join(',')})`;
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
  restoreTop=current.y-12*current.layer;restoreBottom=current.y+current.height+12*current.layer;
  mode=next;
  scene.dataset.mode=next;scene.dataset.state=next==='closed'?'closing':'opening';
  scene.dataset.keyboardActive=String(to.keyboard===1);
  scene.dataset.flatInput=String(to.flat===1);
  const cameraOption=menu.querySelector('[data-source="camera"]');cameraOption.dataset.visibleLabel=cameraOption.lastChild.textContent=!items.length?'拍照':'相机';cameraOption.setAttribute('aria-label',cameraOption.dataset.visibleLabel);
  viewport.dispatchEvent(new Event('reset-photo-drag'));
  viewport.style.overflowX=next==='menu'?'hidden':'auto';
  text.setAttribute('aria-expanded',String(to.keyboard===1));add.setAttribute('aria-expanded',String(next==='menu'));
  $('#keyboardPlaceholder').textContent=to.keyboard===1&&to.flat!==1?'输入你想记录的':'点击输入或按住语音记录';
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
 function mealImage(index){
  const image=document.createElement('span');image.className='meal-image';
  image.style.setProperty('--meal-col',index%3);image.style.setProperty('--meal-row',Math.floor(index/3));
  return image;
 }
 function renderPhotos(newIds=[],autoScroll=true){
  photos.replaceChildren();
  for(const id of items){
   const el=document.createElement('div');el.className='photo';
   const img=itemMeals.has(id)?mealImage(itemMeals.get(id)):document.createElement('img');
   if(!itemMeals.has(id))img.src='assets/camera-photo-2x.png';
   img.setAttribute('role','img');img.setAttribute('aria-label',`已添加图片 ${id}`);
   const remove=document.createElement('button');remove.setAttribute('aria-label',`删除图片 ${id}`);remove.innerHTML='<img src="assets/remove.svg" alt="">';
   remove.onclick=()=>{if(mode!=='closed'&&mode!=='keyboard')return;items=items.filter(x=>x!==id);itemMeals.delete(id);renderPhotos();if(!items.length)animate('closed');};
   el.append(img,remove);photos.append(el);
   if(newIds.includes(id)&&!reduced.matches)el.animate([{opacity:0,transform:'translateY(12px) scale(.9)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:333,delay:150,easing:EASING,fill:'both'});
  }
  add.hidden=!items.length||items.length>=9;
  if(autoScroll)requestAnimationFrame(()=>{viewport.scrollTo({left:track.offsetWidth-viewport.clientWidth,behavior:reduced.matches?'instant':'smooth'});});
 }
 function openCamera(){
  if(cameraState!=='closed')return;
  cameraState='opening';cameraScreen.hidden=false;
  document.querySelector('.scene-tabs').inert=true;
  animate(menuReturn);
  cameraAnimation?.cancel();
  cameraAnimation=cameraScreen.animate([{transform:'translateY(100%)'},{transform:'translateY(0)'}],
   {duration:reduced.matches?1:DURATION,easing:EASING,fill:'both'});
  cameraAnimation.onfinish=()=>{cameraState='open';cameraClose.focus({preventScroll:true});};
 }
 function closeCamera(capture=false){
  if(cameraState!=='open'&&cameraState!=='opening')return;
  const previousTransform=getComputedStyle(cameraScreen).transform;
  cameraState='closing';
  if(capture&&items.length<9){items.push(++nextId);pendingReveal=true;renderPhotos();}
  animate(items.length?'keyboard':'closed');
  cameraAnimation?.cancel();
  cameraAnimation=cameraScreen.animate([{transform:previousTransform==='none'?'translateY(0)':previousTransform},{transform:'translateY(100%)'}],
   {duration:reduced.matches?1:DURATION,easing:EASING,fill:'forwards'});
  cameraAnimation.onfinish=()=>{cameraScreen.hidden=true;cameraAnimation.cancel();cameraAnimation=null;cameraState='closed';document.querySelector('.scene-tabs').inert=false;};
 }
 function renderAlbum(){
  const atLimit=(foodMode?0:items.length)+selectedMeals.length>=9;
  albumGrid.classList.toggle('is-limit',atLimit);
  albumTrack.replaceChildren();
  for(let index=0;index<12;index++){
   const tile=document.createElement('button');tile.type='button';tile.setAttribute('aria-label',`餐食照片 ${index+1}`);
   if(foodMode){tile.append(mealImage(index));tile.onclick=()=>closeFood([index]);albumTrack.append(tile);continue;}
   const position=selectedMeals.indexOf(index);tile.setAttribute('aria-pressed',String(position!==-1));
   tile.setAttribute('aria-disabled',String(atLimit&&position===-1));
   const number=document.createElement('span');number.className='selection-number';number.textContent=position<0?'':String(position+1);
   tile.append(mealImage(index),number);
   tile.onclick=()=>{const at=selectedMeals.indexOf(index);if(at>=0)selectedMeals.splice(at,1);else if(selectedMeals.length<9-(foodMode?0:items.length))selectedMeals.push(index);renderAlbum();};
   albumTrack.append(tile);
  }
  const count=selectedMeals.length;
  albumConfirm.classList.toggle('selected',count>0);
  albumConfirm.setAttribute('aria-label',count?`添加${count}张照片`:'所有照片');
  const label=albumConfirm.querySelector('span');
  if(count){
   let number=label.querySelector('[data-count]');
   if(!number){number=document.createElement('span');number.dataset.count='';label.replaceChildren('添加',number,'张照片');}
   number.textContent=String(count);
  }else if(label.textContent!=='所有照片')label.textContent='所有照片';
 }
 // Scroll normally within the album, with a bounded elastic pull at either edge.
 let albumGesture=null,albumOffset=0,albumFrame=0,albumSuppressClick=false;
 const albumPaint=value=>{albumOffset=value;albumTrack.style.transform=`translate3d(0,${value}px,0)`;};
 function albumRebound(){
  cancelAnimationFrame(albumFrame);
  if(reduced.matches){albumPaint(0);return;}
  let velocity=0,last=performance.now();
  function tick(now){const dt=Math.min(32,now-last)/1000;last=now;velocity+=(-210*albumOffset-25*velocity)*dt;albumPaint(albumOffset+velocity*dt);if(Math.abs(albumOffset)<.08&&Math.abs(velocity)<1){albumPaint(0);albumFrame=0;}else albumFrame=requestAnimationFrame(tick);}
  albumFrame=requestAnimationFrame(tick);
 }
 albumGrid.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0)return;
  cancelAnimationFrame(albumFrame);albumSuppressClick=false;
  albumGesture={id:event.pointerId,x:event.clientX,y:event.clientY,scroll:albumGrid.scrollTop,offset:albumOffset,scale:app.getBoundingClientRect().width/402,moved:false};
 });
 albumGrid.addEventListener('pointermove',event=>{
  const g=albumGesture;if(!g||event.pointerId!==g.id)return;
  const delta=(event.clientY-g.y)/g.scale;
  if(!g.moved){if(Math.abs(delta)<6)return;if(Math.abs(event.clientX-g.x)>Math.abs(event.clientY-g.y)){albumGesture=null;return;}g.moved=true;albumGrid.setPointerCapture(event.pointerId);}
  event.preventDefault();
  const max=Math.max(0,albumGrid.scrollHeight-albumGrid.clientHeight),raw=g.scroll-delta,clamped=Math.max(0,Math.min(max,raw));
  albumGrid.scrollTop=clamped;
  const beyond=g.offset+clamped-raw;albumPaint(Math.sign(beyond)*94*(1-Math.exp(-Math.abs(beyond)/94)));
 },{passive:false});
 function albumEnd(event){
  const g=albumGesture;if(!g||g.id!==event.pointerId)return;
  albumGesture=null;if(albumGrid.hasPointerCapture(event.pointerId))albumGrid.releasePointerCapture(event.pointerId);
  if(g.moved){event.preventDefault();albumSuppressClick=true;}if(albumOffset)albumRebound();
 }
 albumGrid.addEventListener('pointerup',albumEnd);
 albumGrid.addEventListener('pointercancel',albumEnd);
 albumGrid.addEventListener('lostpointercapture',event=>{if(event.target===albumGrid&&albumGesture?.id===event.pointerId){albumGesture=null;albumSuppressClick=true;albumRebound();}});
 albumGrid.addEventListener('click',event=>{if(albumSuppressClick){event.preventDefault();event.stopImmediatePropagation();albumSuppressClick=false;}},true);
 function localRect(element){
  const base=app.getBoundingClientRect(),rect=element.getBoundingClientRect(),scale=base.width/402;
  return {x:(rect.left-base.left)/scale,y:(rect.top-base.top)/scale,width:rect.width/scale,height:rect.height/scale};
 }
 function panelTransform(rect){
  const x=rect.x+rect.width/2-201,y=rect.y+rect.height/2-610;
  return `translate(${x}px,${y}px) scale(${rect.width/378},${rect.height/504})`;
 }
 function menuMorphFrame(rect,opacity,radius){return {left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`,borderRadius:`${radius}px`,opacity};}
 function removeMenuMorph(){mediaMorphGhost?.remove();mediaMorphGhost=null;}
 function createMenuMorph(){
  removeMenuMorph();
  const rect=mediaMenuCenter,ghost=document.createElement('div'),copy=menu.cloneNode(true);
  ghost.style.cssText=`position:absolute;left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;overflow:hidden;background:white;border-radius:12px;box-shadow:0 0 20px #00000014;pointer-events:none;z-index:3;`;
  copy.removeAttribute('id');copy.removeAttribute('style');copy.classList.add('menuMorphContent');copy.inert=true;
  copy.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);box-shadow:none;';
  ghost.append(copy);mediaLayer.append(ghost);mediaMorphGhost=ghost;return ghost;
 }
 function triggerRectAt(destination){
  const trigger=localRect(items.length?add:camera),target=endpoint(destination);
  return {...trigger,x:trigger.x+target.x-current.x,y:trigger.y+target.y-current.y};
 }
 function openMedia(type){
  if(mediaState!=='closed')return;
  if(mediaMotion==='center')mediaMenuCenter=localRect(anchor);
  mediaType=type;mediaPreviousMode=menuReturn;mediaState='opening';selectedMeals=[];
  cameraPanel.hidden=type!=='camera';albumPanel.hidden=type!=='album';mediaLayer.hidden=false;
  scene.classList.add('media-active');
  document.querySelector('.scene-tabs').inert=true;
  if(type==='album'){cancelAnimationFrame(albumFrame);albumGesture=null;albumPaint(0);albumGrid.scrollTop=0;renderAlbum();}
  if(mediaMotion==='center'){cancelAnimationFrame(frame);frame=0;clock?.cancel();}
  else animate(mediaPreviousMode);
  const panel=type==='camera'?cameraPanel:albumPanel;
  mediaAnimation?.cancel();
  let opening,duration=300;
  if(mediaMotion==='center'){
   anchor.style.visibility='hidden';
   const ghost=createMenuMorph(),end={x:12,y:358,width:378,height:504};duration=180;
   ghost.animate([{...menuMorphFrame(mediaMenuCenter,1,12),offset:0},{opacity:.8,offset:.25},{...menuMorphFrame(end,0,48),offset:1}],{duration:reduced.matches?1:duration,easing:EASING,fill:'forwards'});
   ghost.firstElementChild.animate([{transform:'translate(-50%,-50%) scale(1)'},{transform:'translate(-50%,-50%) scale(1.6)'}],{duration:reduced.matches?1:duration,easing:EASING,fill:'forwards'});
   opening=[{transform:panelTransform(mediaMenuCenter),opacity:0,offset:0},{opacity:.2,offset:.25},{transform:'translate(0,0) scale(1)',opacity:1,offset:1}];
  }else opening=[{transform:'translateY(516px)'},{transform:'translateY(0)'}];
  mediaAnimation=panel.animate(opening,{duration:reduced.matches?1:duration,easing:EASING,fill:'both'});
  mediaAnimation.onfinish=()=>{removeMenuMorph();mediaState='open';};
 }
 function closeMedia(action){
  if(mediaState!=='open'&&mediaState!=='opening')return;
  const panel=mediaType==='camera'?cameraPanel:albumPanel;
  const transform=getComputedStyle(panel).transform;
  const visiblePanel=localRect(panel);
  removeMenuMorph();
  mediaState='closing';
  const single=mediaMotion==='center'&&(action==='capture'||(action==='add'&&selectedMeals.length===1));
  const multiple=mediaMotion==='center'&&action==='add'&&selectedMeals.length>1;
  const multipleTrigger=multiple?localRect(items.length?add:camera):null;
  let newPhoto=null,preview=null,photoDestination=null;
  if(action==='capture'||action==='add'){
   const additions=action==='capture'?[null]:selectedMeals.slice();
   const newIds=[];
   for(const index of additions){if(items.length>=9)break;const id=++nextId;items.push(id);newIds.push(id);if(index!==null)itemMeals.set(id,index);}
   pendingReveal=newIds.length>0;renderPhotos(single?[]:newIds,!single);
   if(single)viewport.scrollLeft=Math.max(0,track.offsetWidth-viewport.clientWidth);
   animate(mediaPreviousMode);
   if(single&&newIds.length){
    newPhoto=photos.lastElementChild;
    const destination=localRect(newPhoto),target=endpoint(mediaPreviousMode);
    // The photo strip narrows as the panel returns. Include its final scroll
    // position now so the flying image lands on the actual thumbnail.
    const finalScroll=Math.max(0,track.offsetWidth-target.width);
    destination.x+=target.x-current.x+viewport.scrollLeft-finalScroll;destination.y+=target.y-current.y;
    photoDestination=destination;
    newPhoto.style.visibility='hidden';
    preview=document.createElement('div');preview.className='mediaPanel';preview.style.cssText='left:0;top:0;width:76px;height:76px;border-radius:8px;transform-origin:0 0;pointer-events:none';
    if(action==='capture'){const img=document.createElement('img');img.src='assets/camera-photo-2x.png';img.style.cssText='width:100%;height:100%;object-fit:cover';preview.append(img);}
    else preview.append(mealImage(additions[0]));
    mediaLayer.append(preview);
    const size=Math.min(visiblePanel.width,visiblePanel.height),start=`translate(${visiblePanel.x+(visiblePanel.width-size)/2}px,${visiblePanel.y+(visiblePanel.height-size)/2}px) scale(${size/76})`,end=`translate(${destination.x}px,${destination.y}px) scale(${destination.width/76})`,duration=reduced.matches?1:DURATION;
    preview.animate([{transform:start},{transform:end}],{duration,easing:EASING,fill:'forwards'});
    preview.animate([{opacity:0,offset:0},{opacity:1,offset:.45},{opacity:1,offset:1}],{duration,easing:EASING,fill:'forwards'});
   }
  }else if(action==='back'){
   if(mediaMotion!=='center')animate('menu');
  }else if(action==='outside'&&mediaMotion==='center'){
   animate(items.length?mediaPreviousMode:'closed');
  }
  mediaAnimation?.cancel();
  let closing=[{transform:transform==='none'?'translateY(0)':transform},{transform:'translateY(516px)'}],duration=250;
  if(mediaMotion==='center'&&(single||multiple||action==='back'||action==='outside')){
   const destination=single&&newPhoto?photoDestination:multiple?(()=>{const target=endpoint(mediaPreviousMode);return {...multipleTrigger,x:multipleTrigger.x+target.x-current.x,y:multipleTrigger.y+target.y-current.y};})():action==='back'?mediaMenuCenter:triggerRectAt(items.length?mediaPreviousMode:'closed');
   closing=single?[{transform:transform==='none'?'translate(0,0) scale(1)':transform,opacity:1,offset:0},{opacity:0,offset:.45},{transform:panelTransform(destination),opacity:0,offset:1}]:[{transform:transform==='none'?'translate(0,0) scale(1)':transform,opacity:1},{transform:panelTransform(destination),opacity:0}];duration=single?DURATION:multiple?250:180;
   if(action==='back'){
    const ghost=createMenuMorph();
    ghost.animate([{...menuMorphFrame(visiblePanel,0,48),offset:0},{opacity:.2,offset:.25},{...menuMorphFrame(mediaMenuCenter,1,12),offset:1}],{duration:reduced.matches?1:duration,easing:EASING,fill:'forwards'});
    ghost.firstElementChild.animate([{transform:'translate(-50%,-50%) scale(1.6)'},{transform:'translate(-50%,-50%) scale(1)'}],{duration:reduced.matches?1:duration,easing:EASING,fill:'forwards'});
   }
  }
  mediaAnimation=panel.animate(closing,{duration:reduced.matches?1:duration,easing:mediaMotion==='center'?EASING:'cubic-bezier(0.4, 0, 1, 1)',fill:'forwards'});
  mediaAnimation.onfinish=()=>{if(newPhoto)newPhoto.style.visibility='';preview?.remove();removeMenuMorph();mediaLayer.hidden=true;cameraPanel.hidden=albumPanel.hidden=true;mediaAnimation.cancel();mediaAnimation=null;mediaState='closed';mediaType=null;anchor.style.visibility='';scene.classList.remove('media-active');document.querySelector('.scene-tabs').inert=false;};
 }
 function foodPanelTransform(rect){
  return panelTransform(rect);
 }
 function openFood(){
  if(mediaMotion!=='center'||mode!=='closed'||mediaState!=='closed')return;
  foodMode=true;mediaState='opening';mediaType='food-camera';selectedMeals=[];
  renderAlbum();
  mediaLayer.hidden=false;foodPanel.hidden=false;cameraPanel.hidden=albumPanel.hidden=true;
  scene.classList.add('media-active');document.querySelector('.scene-tabs').inert=true;
  const origin=localRect(foodTool),duration=reduced.matches?1:180;
  mediaAnimation=foodPanel.animate([{transform:foodPanelTransform(origin),opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],{duration,easing:EASING,fill:'both'});
  mediaAnimation.onfinish=()=>{mediaState='open';};
 }
 function switchFoodMedia(toAlbum){
  if(!foodMode||mediaState!=='open')return;
  mediaState='opening';const from=toAlbum?foodPanel:albumPanel,to=toAlbum?albumPanel:foodPanel;
  if(toAlbum){albumGrid.scrollTop=0;albumPaint(0);}
  to.hidden=false;const duration=reduced.matches?1:180;
  from.animate([{opacity:1},{opacity:0}],{duration,easing:EASING,fill:'forwards'});
  mediaAnimation=to.animate([{opacity:0},{opacity:1}],{duration,easing:EASING,fill:'forwards'});
  mediaAnimation.onfinish=()=>{from.hidden=true;from.getAnimations().forEach(a=>a.cancel());mediaAnimation.cancel();mediaAnimation=null;mediaType=toAlbum?'food-album':'food-camera';mediaState='open';};
 }
 function foodPicture(index){
  const picture=document.createElement('div'),img=document.createElement('img');
  picture.className='food-record-picture';
  if(index===null){img.className='food-card-photo';img.src='assets/food-card-2x.png';}
  else{img.className='food-album-photo';img.src='assets/album-meals.png';img.style.setProperty('--meal-col',index%3);img.style.setProperty('--meal-row',Math.floor(index/3));}
  picture.append(img);return picture;
 }
 function finishFood(){
  foodPanel.hidden=albumPanel.hidden=true;mediaLayer.hidden=true;scene.classList.remove('media-active');
  document.querySelector('.scene-tabs').inert=false;foodMode=false;mediaType=null;mediaState='closed';
 }
 function closeFood(additions=null){
  if(!foodMode||mediaState!=='open')return;
  mediaState='closing';const source=mediaType==='food-album'?albumPanel:foodPanel;
  const sourceRect=localRect(source),duration=reduced.matches?1:(additions?DURATION:180);
  if(!additions){
   const origin=localRect(foodTool),end=source===foodPanel?foodPanelTransform(origin):panelTransform(origin);
   mediaAnimation=source.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:end,opacity:0}],{duration,easing:EASING,fill:'forwards'});
   mediaAnimation.onfinish=()=>{mediaAnimation.cancel();finishFood();};return;
  }
  const created=[];
  for(const index of additions){
   const row=document.createElement('div');row.className='food-record';row.style.top=`${400+foodCount*337}px`;
   const base=document.createElement('img');base.src='assets/food-card-2x.png';base.alt='正在识别食物的记录';
   const picture=foodPicture(index);picture.style.background='#fff';picture.firstElementChild.style.visibility='hidden';row.append(base,picture);foodRecords.append(row);foodCount++;created.push({row,picture,index});
   row.animate([{opacity:0},{opacity:1}],{duration,easing:EASING,fill:'both'});
  }
  const last=created[created.length-1],targetOffset=current.bgTop-20-(106+400+(foodCount-1)*337+329+current.records);
  const startOffset=foodOffset,start=performance.now();cancelAnimationFrame(foodScrollFrame);
  function scroll(now){const p=Math.min(1,(now-start)/duration),e=1-Math.pow(1-p,3);foodOffset=startOffset+(targetOffset-startOffset)*e;render(current);if(p<1)foodScrollFrame=requestAnimationFrame(scroll);}
  foodScrollFrame=requestAnimationFrame(scroll);
  const target=localRect(last.picture);target.y+=targetOffset-startOffset;
  const flight=foodPicture(last.index);flight.className='food-fly-picture';mediaLayer.append(flight);
  const scale=sourceRect.width/180,startX=sourceRect.x,startY=sourceRect.y+(sourceRect.height-240*scale)/2;
  flight.animate([{transform:`translate(${startX}px,${startY}px) scale(${scale})`},{transform:`translate(${target.x}px,${target.y}px) scale(1)`}],{duration,easing:EASING,fill:'forwards'});
  flight.animate([{opacity:0},{opacity:1,offset:.45},{opacity:1}],{duration,easing:EASING,fill:'forwards'});
  mediaAnimation=source.animate([{opacity:1},{opacity:0,offset:.45},{opacity:0}],{duration,easing:EASING,fill:'forwards'});
  mediaAnimation.onfinish=()=>{for(const item of created)item.picture.firstElementChild.style.visibility='';flight.remove();mediaAnimation.cancel();finishFood();};
 }
 foodTool.onclick=openFood;
 $('#foodCameraBack').onclick=()=>closeFood();
 $('#foodCameraCapture').onclick=()=>closeFood([null]);
 $('#foodCameraAlbum').onclick=()=>switchFoodMedia(true);
 window.attachPhotoDrag(viewport,track,photos,()=>app.dataset.scene==='3'&&((mode==='closed'&&scene.dataset.state==='closed')||(mode==='keyboard'&&scene.dataset.state==='open')));
 text.onclick=()=>{if(mode==='closed')animate('keyboard');};
 camera.onclick=()=>{if(mode==='closed'||mode==='keyboard')animate('menu');};
 add.onclick=()=>{if(mode==='closed'||mode==='keyboard')animate('menu');};
 dismiss.onclick=hideKey.onclick=()=>animate('closed');
 menu.querySelector('[data-source="camera"]').onclick=()=>{if(variant==='2')openMedia('camera');else openCamera();};
 menu.querySelector('[data-source="album"]').onclick=()=>{if(variant==='2'){openMedia('album');return;}if(items.length<9)items.push(++nextId);pendingReveal=true;renderPhotos();animate(menuReturn);};
 cameraClose.onclick=()=>closeCamera(false);
 cameraCapture.onclick=()=>closeCamera(true);
 $('#cameraPanelBack').onclick=()=>closeMedia('back');
 $('#cameraPanelCapture').onclick=()=>closeMedia('capture');
 $('#albumBack').onclick=()=>foodMode?switchFoodMedia(false):closeMedia('back');
 $('#mediaOutside').onclick=()=>foodMode?closeFood():closeMedia('outside');
 albumConfirm.onclick=()=>{if(selectedMeals.length)foodMode?closeFood(selectedMeals.slice()):closeMedia('add');};
 document.addEventListener('pointerdown',event=>{
  if(app.dataset.scene!=='3'||mode!=='menu'||mediaState!=='closed'||cameraState!=='closed'||anchor.contains(event.target))return;
  event.preventDefault();event.stopImmediatePropagation();suppressOutsideClick=true;animate(menuReturn);
 },true);
 document.addEventListener('click',event=>{if(suppressOutsideClick){suppressOutsideClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('pointerdown',event=>{if(!blocker.hidden&&anchor.contains(event.target))suppressOutsideClick=false;},true);
 blocker.onclick=event=>{event.stopPropagation();if(mode==='menu')animate(menuReturn);};
 document.addEventListener('keydown',event=>{if(event.key!=='Escape'||app.dataset.scene!=='3')return;if(mediaState==='open'){foodMode?closeFood():closeMedia('outside');return;}if(cameraState==='open'){closeCamera(false);return;}if(cameraState==='closed'&&mediaState==='closed'&&mode!=='closed')animate(mode==='menu'?menuReturn:'closed');});
 function reset(){cancelAnimationFrame(frame);clock?.cancel();mode='closed';scene.dataset.variant=variant;scene.dataset.flatInput='false';scene.dataset.keyboardActive='false';scene.dataset.mode='closed';scene.dataset.state='closed';suppressOutsideClick=false;render(endpoint('closed'));text.setAttribute('aria-expanded','false');add.setAttribute('aria-expanded','false');viewport.style.overflowX='auto';$('#keyboardPlaceholder').textContent='点击输入或按住语音记录';}
 function setRecordsAsset(){records.src=variant==='2'?'assets/variant-records-three-2x.png':'assets/variant-records-2x.png';records.style.top=variant==='2'?'-254px':'-153px';records.style.height=variant==='2'?'646px':'545px';}
 document.querySelectorAll('.scene-tabs [data-variant]').forEach(tab=>tab.addEventListener('click',()=>{variant=tab.dataset.variant;mediaMotion=tab.dataset.motion;setRecordsAsset();document.querySelectorAll('.scene-tabs [data-variant]').forEach(t=>t.setAttribute('aria-selected',String(t===tab)));reset();}));
 window.addEventListener('resize',()=>{if(mode==='menu')positionMenu();});
 viewport.addEventListener('scroll',()=>{if(mode==='menu')positionMenu();});
 const slices='<img class="panelCap" src="assets/panel-cap-2x.png" alt=""><img class="panelMiddle" src="assets/panel-middle-2x.png" alt=""><img class="panelBottom" src="assets/panel-bottom-2x.png" alt=""><img class="panelTop" src="assets/panel-icons-2x.png" alt="">';
 underlay.innerHTML=slices;
 const base=document.createElement('div');base.id='keyboardCompactBase';base.innerHTML=slices.replace(/<img class="panelTop"[^>]*>/,'');scene.insertBefore(base,card);
 setRecordsAsset();
 reset();renderPhotos();
 window.keyboardSceneDemo={get state(){return mode},get values(){return {...current}},get imageCount(){return items.length},addPhoto(){if(items.length<9)items.push(++nextId);renderPhotos();animate('closed');},duration:DURATION};
})();
