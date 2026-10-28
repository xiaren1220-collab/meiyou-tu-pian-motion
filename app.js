(() => {
 const app=document.querySelector('#app'),stage=document.querySelector('#stage');
 const menu=document.querySelector('#menu'),anchor=document.querySelector('#menuAnchor'),dismiss=document.querySelector('#dismiss');
 const camera=document.querySelector('#camera'),add=document.querySelector('#add'),photos=document.querySelector('#photos'),scroller=document.querySelector('#photoScroller');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const MOTION={open:200,close:167,easing:'cubic-bezier(0.2, 0.8, 0.2, 1)',initialScale:.12};
 let scene=Number(app.dataset.scene),opened=false,animation=null,items=[{src:'assets/photo.png',local:false}],serial=0;
 function resize(){const scale=Math.min(1,(innerWidth-0)/402,innerHeight/874);stage.style.setProperty('--scale',Math.max(.2,scale));if(opened)position();}
 function trigger(){return scene===1?camera:add;}
 function position(){const scale=app.getBoundingClientRect().width/402;const box=app.getBoundingClientRect(),t=trigger().getBoundingClientRect();const tx=(t.left+t.width/2-box.left)/scale,ty=(t.top+t.height/2-box.top)/scale;const cardY=scene===1?469:639;const left=Math.max(12,Math.min(390-145,tx-145/2)),top=cardY-8-104;anchor.style.left=left+'px';anchor.style.top=top+'px';return {dx:tx-left-72.5,dy:ty-top-52};}
 function setOpen(next){const {dx,dy}=position();const id=++serial;const current=animation?{transform:getComputedStyle(menu).transform,opacity:getComputedStyle(menu).opacity}:null;animation?.cancel();opened=next;camera.setAttribute('aria-expanded',String(next&&scene===1));add.setAttribute('aria-expanded',String(next&&scene===2));dismiss.hidden=!next;menu.inert=!next;
  const closed={transform:`translate(${dx}px, ${dy}px) scale(${MOTION.initialScale})`,opacity:0};const full={transform:'translate(0px, 0px) scale(1)',opacity:1};
  menu.dataset.open='true';menu.style.visibility='visible';
  animation=menu.animate([current??(next?closed:full),next?full:closed],{duration:reduced.matches?1:next?MOTION.open:MOTION.close,easing:MOTION.easing,fill:'forwards'});
  animation.onfinish=()=>{if(id!==serial)return;if(!next){menu.dataset.open='false';menu.style.visibility='hidden';}else menu.querySelector('button').focus({preventScroll:true});};
 }
 function resetMenu(){++serial;animation?.cancel();opened=false;menu.inert=true;menu.dataset.open='false';menu.style.visibility='hidden';dismiss.hidden=true;camera.setAttribute('aria-expanded','false');add.setAttribute('aria-expanded','false');}
 function renderPhotos(){add.hidden=items.length>=9;const old=new Map([...photos.children].map(el=>[el.dataset.key,el.getBoundingClientRect().left]));photos.replaceChildren();items.forEach((item,i)=>{const el=document.createElement('div');el.className='photo';el.dataset.key=item.src;const img=document.createElement('img');img.src=item.src;img.alt=`已添加图片 ${i+1}`;const remove=document.createElement('button');remove.setAttribute('aria-label',`删除图片 ${i+1}`);remove.innerHTML='<img src="assets/remove.svg" alt="">';remove.onclick=()=>{resetMenu();if(item.local)URL.revokeObjectURL(item.src);items.splice(i,1);renderPhotos();};el.append(img,remove);photos.append(el);});requestAnimationFrame(()=>{for(const el of photos.children){const previous=old.get(el.dataset.key);if(previous!==undefined&&!reduced.matches){const delta=(previous-el.getBoundingClientRect().left)/(app.getBoundingClientRect().width/402);if(delta)el.animate([{transform:`translateX(${delta}px)`},{transform:'translateX(0)'}],{duration:200,easing:MOTION.easing});}}scroller.scrollTo({left:scroller.scrollWidth,behavior:reduced.matches?'instant':'smooth'});});}
 camera.onclick=add.onclick=()=>setOpen(!opened);
 dismiss.onclick=()=>setOpen(false);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){setOpen(false);trigger().focus();}});
 document.querySelectorAll('[data-scene][role=tab]').forEach(tab=>tab.onclick=()=>{resetMenu();scene=Number(tab.dataset.scene);app.dataset.scene=scene;document.querySelector('#cameraLabel').textContent=scene===1?'拍照':'相机';document.querySelectorAll('[role=tab]').forEach(t=>t.setAttribute('aria-selected',String(t===tab)));});
 for(const button of ['#choosePhoto','#takePhoto']){document.querySelector(button).onclick=()=>{resetMenu();app.dataset.scene='3';scene=3;window.keyboardSceneDemo.addPhoto();};}
 scroller.addEventListener('scroll',()=>{if(opened)position();},{passive:true});
 add.addEventListener('contextmenu',e=>e.preventDefault());
 window.addEventListener('resize',resize);document.fonts.ready.then(resize);renderPhotos();resize();
 window.selectionMenuDemo={motion:MOTION,get scene(){return scene},get imageCount(){return items.length},get open(){return opened}};
})();
