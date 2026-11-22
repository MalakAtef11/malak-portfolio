(() => {
  const d = document;
  const body=d.body;
  try { if(localStorage.getItem('malak-theme')==='dark')body.classList.add('dark'); }catch{}
  d.querySelectorAll('[data-theme]').forEach(btn=>btn.addEventListener('click',()=>{
    body.classList.toggle('dark');try{localStorage.setItem('malak-theme',body.classList.contains('dark')?'dark':'light')}catch{}
  }));
  d.querySelectorAll('[data-menu]').forEach(btn=>btn.addEventListener('click',()=>{
    const n=d.querySelector('.nav');n?.classList.toggle('open');btn.setAttribute('aria-expanded',String(!!n?.classList.contains('open')));
  }));

  /* Native-sized pixel paw: draw at the actual pointer position without lag. */
  const paw=d.querySelector('.cursor-paw');
  const fine=window.matchMedia('(hover:hover) and (pointer:fine)');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage=d.querySelector('[data-gaze-stage]');
  const canvas=stage?.querySelector('[data-gaze-canvas]');
  const fallback=stage?.querySelector('.portrait-fallback');
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  let gazeTargetX=0,gazeTargetY=0,gazeX=0,gazeY=0;
  let frameActive=false,frameImages=null,blinkImage=null,blinkUntil=0,eyeAnim=0;
  let requestGazeFrame=()=>{};
  const leftFiles=['assets/gaze-frames/c-010.webp', 'assets/gaze-frames/l-140.webp', 'assets/gaze-frames/l-139.webp', 'assets/gaze-frames/l-138.webp', 'assets/gaze-frames/l-137.webp', 'assets/gaze-frames/l-136.webp', 'assets/gaze-frames/l-135.webp', 'assets/gaze-frames/l-134.webp', 'assets/gaze-frames/l-133.webp', 'assets/gaze-frames/l-132.webp', 'assets/gaze-frames/l-131.webp', 'assets/gaze-frames/l-130.webp', 'assets/gaze-frames/l-129.webp', 'assets/gaze-frames/l-128.webp', 'assets/gaze-frames/l-127.webp', 'assets/gaze-frames/l-126.webp', 'assets/gaze-frames/l-125.webp', 'assets/gaze-frames/l-124.webp', 'assets/gaze-frames/l-123.webp', 'assets/gaze-frames/l-122.webp', 'assets/gaze-frames/l-121.webp', 'assets/gaze-frames/l-120.webp', 'assets/gaze-frames/l-119.webp', 'assets/gaze-frames/l-118.webp', 'assets/gaze-frames/l-117.webp', 'assets/gaze-frames/l-116.webp', 'assets/gaze-frames/l-115.webp'];
  const rightFiles=['assets/gaze-frames/c-010.webp', 'assets/gaze-frames/r-019.webp', 'assets/gaze-frames/r-020.webp', 'assets/gaze-frames/r-022.webp', 'assets/gaze-frames/r-023.webp', 'assets/gaze-frames/r-025.webp', 'assets/gaze-frames/r-026.webp', 'assets/gaze-frames/r-027.webp', 'assets/gaze-frames/r-029.webp', 'assets/gaze-frames/r-030.webp', 'assets/gaze-frames/r-031.webp', 'assets/gaze-frames/r-033.webp', 'assets/gaze-frames/r-034.webp', 'assets/gaze-frames/r-036.webp', 'assets/gaze-frames/r-037.webp', 'assets/gaze-frames/r-038.webp', 'assets/gaze-frames/r-040.webp', 'assets/gaze-frames/r-041.webp', 'assets/gaze-frames/r-042.webp', 'assets/gaze-frames/r-044.webp', 'assets/gaze-frames/r-045.webp', 'assets/gaze-frames/r-047.webp', 'assets/gaze-frames/r-048.webp', 'assets/gaze-frames/r-049.webp', 'assets/gaze-frames/r-051.webp', 'assets/gaze-frames/r-052.webp', 'assets/gaze-frames/r-053.webp', 'assets/gaze-frames/r-055.webp', 'assets/gaze-frames/r-056.webp', 'assets/gaze-frames/r-058.webp', 'assets/gaze-frames/r-059.webp'];
  const blinkFile='assets/gaze-frames/b-178.webp';
  const centerX=()=>window.innerWidth/2;

  function updatePawState(){
    const enabled=fine.matches&&!reduced.matches;
    d.documentElement.classList.toggle('paw-enabled',enabled);
    if(!enabled)paw?.classList.remove('visible');
  }
  updatePawState();
  fine.addEventListener?.('change',updatePawState);
  reduced.addEventListener?.('change',updatePawState);

  d.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
    if(fine.matches&&!reduced.matches&&paw){
      paw.style.transform=`translate3d(${e.clientX-12}px,${e.clientY-4}px,0) rotate(var(--paw-angle,-6deg)) scale(var(--paw-scale,1))`;
      const el=e.target;
      const typing=el instanceof Element&&!!el.closest('textarea,input,[contenteditable="true"]');
      const clickable=el instanceof Element&&!!el.closest('a,button,[role="button"],label,select');
      paw.classList.toggle('visible',!typing);
      paw.classList.toggle('hovering',clickable&&!typing);
    }
    if(stage&&fine.matches&&!reduced.matches){
      // Match subject's actual left/centre/right poses to the mouse position.
      // The supplied clip is converted to pre-decoded sprites; no video seeking or loops.
      gazeTargetX=clamp((e.clientX-centerX())/(Math.min(window.innerWidth*.44,650)), -1,1);
      const r=stage.getBoundingClientRect();
      gazeTargetY=clamp((e.clientY-(r.top+r.height*.45))/(r.height*.76),-1,1);
      requestGazeFrame();
    }
  },{passive:true});
  d.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')paw?.classList.add('pressing')});
  for(const ev of ['pointerup','pointercancel'])d.addEventListener(ev,()=>paw?.classList.remove('pressing'));
  d.addEventListener('mouseout',e=>{if(!e.relatedTarget)paw?.classList.remove('visible')});
  window.addEventListener('blur',()=>{paw?.classList.remove('visible');gazeTargetX=0;gazeTargetY=0;requestGazeFrame()});

  if(canvas&&stage&&fine.matches&&!reduced.matches){
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    const loadImage=src=>new Promise((resolve,reject)=>{
      const im=new Image();im.onload=async()=>{try{if(im.decode)await im.decode();}catch{}resolve(im)};
      im.onerror=reject;im.src=src;
    });
    // Keep the poster visible until all eye positions are decoded to prevent any lag on first hover.
    Promise.all([Promise.all(leftFiles.map(loadImage)),Promise.all(rightFiles.map(loadImage)),loadImage(blinkFile)])
      .then(([left,right,blink])=>{
        frameImages={left,right};blinkImage=blink;frameActive=true;
        stage.classList.add('is-ready');
        const paint=(now)=>{
          eyeAnim=0;
          if(!frameActive)return;
          gazeX+=(gazeTargetX-gazeX)*.22;
          gazeY+=(gazeTargetY-gazeY)*.16;
          const imgs=gazeX<0?frameImages.left:frameImages.right;
          const idx=Math.abs(gazeX)*(imgs.length-1);
          const first=Math.floor(idx), second=Math.min(imgs.length-1,first+1);
          const mix=idx-first;
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.globalAlpha=1;ctx.drawImage(imgs[first],0,0,canvas.width,canvas.height);
          if(mix>.001&&second!==first){ctx.globalAlpha=mix;ctx.drawImage(imgs[second],0,0,canvas.width,canvas.height)}
          if(now<blinkUntil&&blinkImage){
            const remaining=(blinkUntil-now)/230;
            const opacity=Math.sin((1-remaining)*Math.PI)*.92;
            ctx.globalAlpha=Math.max(0,opacity);
            ctx.drawImage(blinkImage,0,0,canvas.width,canvas.height);
          }
          ctx.globalAlpha=1;
          // The real head/eye rotation comes from the supplied frames. Vertical changes are a tiny
          // supporting tilt only; they do not substitute for gaze direction.
          const tilt=(gazeX*1.35).toFixed(2);
          const rise=(-gazeY*5).toFixed(2);
          canvas.style.transform=`translate3d(0,${rise}px,0) rotate(${tilt}deg)`;
          // Sleep completely while the cursor is still, without sacrificing instant response.
          if(Math.abs(gazeTargetX-gazeX)+Math.abs(gazeTargetY-gazeY)>.003||now<blinkUntil){requestGazeFrame();}
        };
        requestGazeFrame=()=>{if(!eyeAnim)eyeAnim=requestAnimationFrame(paint)};
        requestGazeFrame();
      }).catch(err=>{console.warn('Gaze frames unavailable; keeping the static portrait.',err);stage.classList.remove('is-ready')});
    stage.addEventListener('click',()=>{if(frameActive){blinkUntil=performance.now()+230;requestGazeFrame()}});
  }

  const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');obs.unobserve(e.target)}}),{threshold:.07});
  d.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
  d.querySelectorAll('[data-filter-group]').forEach(group=>{
    const target=d.getElementById(group.dataset.filterGroup);if(!target)return;
    group.querySelectorAll('button[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      group.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===btn));
      target.querySelectorAll('[data-filter-item]').forEach(item=>item.classList.toggle('hidden',btn.dataset.filter!=='all'&&!item.dataset.filterItem.split(' ').includes(btn.dataset.filter)));
    }));
  });
  const modal=d.getElementById('media-modal');
  d.querySelectorAll('[data-modal-title]').forEach(el=>el.addEventListener('click',()=>{
    if(!modal)return;
    modal.querySelector('[data-modal-heading]').textContent=el.dataset.modalTitle;
    modal.querySelector('[data-modal-description]').textContent=el.dataset.modalDescription||'Replace this placeholder with your real certificate, photo, diagram or project media.';
    const src=el.dataset.modalSrc,stage=modal.querySelector('[data-modal-stage]');stage.innerHTML='';
    if(src){const m=/\.(mp4|webm|mov)$/i.test(src)?d.createElement('video'):d.createElement('img');if(m.tagName==='VIDEO')m.controls=true;else m.alt=el.dataset.modalTitle;m.src=src;stage.append(m)}
    else stage.innerHTML='<span class="symbol">✦</span><small>Media slot — add your actual file to the media folder and update the data-modal-src attribute.</small>';
    modal.classList.add('show');body.style.overflow='hidden';modal.querySelector('.modal-close').focus();
  }));
  function closeModal(){modal?.classList.remove('show');body.style.overflow=''}
  modal?.querySelector('.modal-close')?.addEventListener('click',closeModal);
  modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  d.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  // The contact form uses a native HTML POST to FormSubmit.
  // Do not preventDefault() here: it would stop the message reaching FormSubmit.
  const form=d.getElementById('contact-form');
  if(form && location.protocol==='file:'){
    const tip=d.createElement('p');
    tip.className='contact-local-warning';
    tip.setAttribute('role','status');
    tip.textContent='Local preview only — To send messages, open the website from an HTTPS link (e.g. GitHub Pages). A downloaded index.html file cannot submit to FormSubmit.';
    form.appendChild(tip);
  }

})();

(function(){
  const showcase=document.querySelector('[data-card-showcase]');
  if(!showcase)return;
  const cards=[...showcase.querySelectorAll('[data-card]')];
  const prev=showcase.querySelector('[data-card-prev]');
  const next=showcase.querySelector('[data-card-next]');
  const counter=showcase.parentElement.querySelector('[data-card-counter]');
  const desc=showcase.parentElement.querySelector('[data-card-description]');
  const link=showcase.parentElement.querySelector('[data-card-link]');
  const info=cards.map(card=>({href:card.getAttribute('href')||'#',description:card.querySelector('p')?.textContent?.trim()||'',title:card.querySelector('h3')?.textContent?.trim()||''}));
  let active=0;
  let autoTimer;
  const wrap=(n)=> (n+cards.length)%cards.length;
  function render(){
    cards.forEach((card,i)=>{
      const raw=i-active;
      const offset=((raw + cards.length + Math.floor(cards.length/2)) % cards.length) - Math.floor(cards.length/2);
      const abs=Math.abs(offset);
      const limited=Math.min(abs,3);
      const dir=Math.sign(offset)||0;
      const tx=offset*164;
      const tz=abs===0?130:abs===1?18:-100-(limited-2)*35;
      const ry=offset* -13;
      const scale=abs===0?1:abs===1?.9:abs===2?.78:.66;
      const opacity=abs>3?0:abs===3?.16:abs===2?.34:abs===1?.68:1;
      const blur=abs>0?Math.min(abs*1.5,4):0;
      card.style.transform=`translateX(calc(-50% + ${tx}px)) translateZ(${tz}px) rotateY(${ry}deg) scale(${scale})`;
      card.style.opacity=String(opacity);
      card.style.filter=`blur(${blur}px)`;
      card.style.zIndex=String(40-abs);
      card.classList.toggle('is-active',abs===0);
      card.setAttribute('aria-hidden',abs>2?'true':'false');
      card.tabIndex=abs===0?0:-1;
    });
    if(counter)counter.textContent=`${String(active+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
    if(desc)desc.textContent=info[active].description;
    if(link){link.href=info[active].href;link.innerHTML=`Open ${info[active].title} &#8599;`;}
  }
  function go(step){active=wrap(active+step);render();restartAuto()}
  function restartAuto(){clearInterval(autoTimer);autoTimer=setInterval(()=>{active=wrap(active+1);render()},6200)}
  prev?.addEventListener('click',()=>go(-1));
  next?.addEventListener('click',()=>go(1));
  cards.forEach((card,i)=>{
    card.addEventListener('mouseenter',()=>{active=i;render();clearInterval(autoTimer)});
    card.addEventListener('mouseleave',restartAuto);
    card.addEventListener('focus',()=>{active=i;render();clearInterval(autoTimer)});
    card.addEventListener('click',(e)=>{if(i!==active){e.preventDefault();active=i;render();restartAuto();}});
  });
  showcase.addEventListener('keydown',(e)=>{if(e.key==='ArrowLeft'){e.preventDefault();go(-1)} if(e.key==='ArrowRight'){e.preventDefault();go(1)}});
  render();restartAuto();
})();

(function(){
  const nav=document.getElementById('primary-nav');
  const groups=[...document.querySelectorAll('[data-nav-dropdown]')];
  groups.forEach((group)=>group.addEventListener('toggle',()=>{if(group.open)groups.forEach(g=>{if(g!==group)g.open=false})}));
  document.addEventListener('click',e=>{if(!(e.target instanceof Element))return;if(!e.target.closest('.nav-group'))groups.forEach(g=>g.open=false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){groups.forEach(g=>g.open=false);nav?.classList.remove('open');document.querySelector('[data-menu]')?.setAttribute('aria-expanded','false');}});
  nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');document.querySelector('[data-menu]')?.setAttribute('aria-expanded','false')}));
  const stage=document.querySelector('.spotlight-stage');
  if(!stage)return;
  let x0=null,y0=null;
  stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='mouse'){x0=e.clientX;y0=e.clientY}});
  stage.addEventListener('pointerup',e=>{if(x0===null)return;const delta=e.clientX-x0,vertical=e.clientY-y0;x0=null;y0=null;if(Math.abs(delta)>55&&Math.abs(delta)>Math.abs(vertical)*1.3){const arrow=document.querySelector(delta<0?'[data-card-next]':'[data-card-prev]');arrow?.click();}});
})();

/* Video case studies: a named file automatically replaces the honest placeholder when present. */
document.querySelectorAll('video[data-demo-video]').forEach(video=>{
  video.addEventListener('loadedmetadata',()=>{
    video.hidden=false;video.parentElement?.querySelector('.demo-center')?.setAttribute('hidden','');
    video.parentElement?.classList.add('has-video');
  });
});
