(() => {
  const d = document;
  const body=d.body;
  try { if(localStorage.getItem('malak-theme')==='dark')body.classList.add('dark'); }catch{}
  /* Consistent SVG theme control for iOS Safari */
  d.querySelectorAll('[data-theme]').forEach(btn=>{
    btn.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"></path></svg>';
  });
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
  // FormSubmit's official AJAX endpoint keeps visitors on this page.
  // The site remains frontend-only; FormSubmit handles delivery.
  const form = d.getElementById('contact-form');
  const sendButton = d.getElementById('contact-submit');
  const feedback = d.getElementById('contact-feedback');
  if (form && sendButton && feedback) {
    const originalButtonHTML = sendButton.innerHTML;
    const setFeedback = (message, type) => {
      feedback.hidden = false;
      feedback.className = 'contact-feedback is-' + type;
      feedback.textContent = message;
    };
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity() || sendButton.disabled) return;
      // Silently reject bots that filled in the hidden honeypot.
      if (form.querySelector('[name="_honey"]')?.value.trim()) return;

      sendButton.disabled = true;
      sendButton.textContent = 'Sending…';
      form.setAttribute('aria-busy', 'true');
      setFeedback('Sending your message…', 'sending');

      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const response = await fetch('https://formsubmit.co/ajax/malakatef614@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Service unavailable');
        const result = await response.json();
        // FormSubmit may return "true" / "false" as strings, so don't use truthiness.
        if (result.success !== true && String(result.success).toLowerCase() !== 'true') {
          throw new Error(result.message || 'Message was not accepted');
        }
        setFeedback('✓ Message sent! Thank you — I’ll get back to you soon. ♡', 'success');
        form.reset();
      } catch (error) {
        console.error('Contact form could not send:', error);
        setFeedback('Couldn’t send your message. Please try again, or use the email link beside this form.', 'error');
      } finally {
        sendButton.disabled = false;
        sendButton.innerHTML = originalButtonHTML;
        form.removeAttribute('aria-busy');
      }
    });
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



/* Portfolio: cross-device SVG icon normalization v12 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const iconData = {
    "◇":["diamond",'<path d="m12 2 10 10-10 10L2 12 12 2Z"/>'],
    "⌄":["chevron-down",'<path d="m6 9 6 6 6-6"/>'],
    "↗":["arrow-up-right",'<path d="M7 17 17 7M8 7h9v9"/>'],
    "↖":["arrow-up-left",'<path d="M17 17 7 7M7 16V7h9"/>'],
    "↘":["arrow-down-right",'<path d="m7 7 10 10M8 17h9V8"/>'],
    "↙":["arrow-down-left",'<path d="M17 7 7 17M7 8v9h9"/>'],
    "→":["arrow-right",'<path d="M5 12h14m-6-6 6 6-6 6"/>'],
    "←":["arrow-left",'<path d="M19 12H5m6 6-6-6 6-6"/>'],
    "↑":["arrow-up",'<path d="M12 19V5m-6 6 6-6 6 6"/>'],
    "↓":["arrow-down",'<path d="M12 5v14m-6-6 6 6 6-6"/>'],
    "✳":["asterisk",'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>'],
    "✿":["flower",'<circle cx="12" cy="12" r="2.5"/><path d="M12 3c-2-2-5 1-4 4-3-1-6 2-4 5-2 2 1 5 4 4-1 3 2 6 4 4 2 2 5-1 4-4 3 1 6-2 4-4 2-3-1-6-4-5 1-3-2-6-4-4Z"/>'],
    "✦":["sparkle",'<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>'],
    "✧":["sparkle",'<path d="m12 3 2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1L12 3Z"/>'],
    "★":["star",'<path d="m12 2 3.1 6.3L22 9.3l-5 4.9 1.2 6.9L12 17.9 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/>'],
    "✺":["sun",'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5M2 12h2m16 0h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/>'],
    "♡":["heart",'<path d="M20.8 5.8a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.2a5.4 5.4 0 0 0-7.7 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>'],
    "♥":["heart",'<path d="M20.8 5.8a5.4 5.4 0 0 0-7.7 0L12 7l-1.1-1.2a5.4 5.4 0 0 0-7.7 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>'],
    "✉":["mail",'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'],
    "✕":["x",'<path d="M18 6 6 18M6 6l12 12"/>'],
    "⌘":["command",'<path d="M9 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V7Z"/>'],
    "✓":["check",'<path d="m4 12 5 5L20 6"/>'],
    "✔":["check",'<path d="m4 12 5 5L20 6"/>'],
    "›":["chevron-right",'<path d="m9 6 6 6-6 6"/>'],
    "‹":["chevron-left",'<path d="m15 6-6 6 6 6"/>'],
    "☾":["moon",'<path d="M20.8 15.5A9 9 0 0 1 8.5 3.2 9 9 0 1 0 20.8 15.5Z"/>']
  };
  const pattern=/([↗↖↘↙→←↑↓◇⌄✳✿✦✧★✺♡♥✉✕⌘✓✔›‹☾])[\uFE0E\uFE0F]?/gu;
  const check=/[↗↖↘↙→←↑↓◇⌄✳✿✦✧★✺♡♥✉✕⌘✓✔›‹☾]/u;
  const blocked="script,style,textarea,pre,code,svg,math,option,noscript,[data-keep-symbol]";
  function makeIcon(symbol) {
    const data=iconData[symbol];
    if(!data)return document.createTextNode(symbol);
    const svg=document.createElementNS(NS,"svg");
    svg.setAttribute("class","portfolio-svg-icon portfolio-svg-"+data[0]);
    svg.setAttribute("viewBox","0 0 24 24");
    svg.setAttribute("fill","none");
    svg.setAttribute("stroke","currentColor");
    svg.setAttribute("stroke-width","1.8");
    svg.setAttribute("stroke-linecap","round");
    svg.setAttribute("stroke-linejoin","round");
    svg.setAttribute("aria-hidden","true");
    svg.setAttribute("focusable","false");
    svg.innerHTML=data[1];
    return svg;
  }
  function replaceText(node) {
    if(!node || !node.parentElement || !check.test(node.nodeValue || ""))return;
    if(node.parentElement.closest(blocked))return;
    const content=node.nodeValue,frag=document.createDocumentFragment();
    let last=0;
    pattern.lastIndex=0;
    for(const m of content.matchAll(pattern)){
      if(m.index>last)frag.append(document.createTextNode(content.slice(last,m.index)));
      frag.append(makeIcon(m[1]));
      last=m.index+m[0].length;
    }
    if(last===0)return;
    if(last<content.length)frag.append(document.createTextNode(content.slice(last)));
    node.replaceWith(frag);
  }
  function scan(root) {
    if(!root)return;
    if(root.nodeType===3){replaceText(root);return}
    if(root.nodeType!==1 && root.nodeType!==9 && root.nodeType!==11)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const texts=[];
    while(walker.nextNode())texts.push(walker.currentNode);
    texts.forEach(replaceText);
  }
  const css=document.createElement("style");
  css.id="portfolio-svg-cross-device-styles";
  css.textContent=".portfolio-svg-icon{display:inline-block;flex:none;vertical-align:-.16em;width:1em;height:1em;stroke:currentColor;fill:none;stroke-width:1.8;overflow:visible}.hero-actions .portfolio-svg-icon,.hero-text-link .portfolio-svg-icon,.btn .portfolio-svg-icon{width:1.08em;height:1.08em}.nav-panel-item .portfolio-svg-icon,.nav-chevron .portfolio-svg-icon{width:17px;height:17px}.portrait-orbit .portfolio-svg-icon,.hero-art-glyph .portfolio-svg-icon,.hero-art-star .portfolio-svg-icon{width:1em;height:1em}.spotlight-arrow .portfolio-svg-icon,.proof-step .portfolio-svg-icon,.modal-close .portfolio-svg-icon{width:20px;height:20px}.contact-link-icon .portfolio-svg-icon{width:22px;height:22px}@media(max-width:650px){.hero-actions .portfolio-svg-icon{width:17px;height:17px}.social-hub{max-width:100%}.social-orb{min-width:0}}";
  document.head.append(css);
  scan(document.body);
  // Icons may be introduced later by carousels and other page scripts.
  let pending=false;
  const observer=new MutationObserver(mutations=>{
    if(!mutations.some(m=>m.type==="characterData" || [...m.addedNodes].some(n=>n.nodeType===3 || n.nodeType===1)))return;
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{pending=false;scan(document.body)});
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
})();

/* Bilingual interface enhancement shared by every portfolio page. */
(() => {
  if (document.querySelector('script[data-portfolio-i18n]')) return;
  const script=document.createElement('script');
  script.dataset.portfolioI18n='';
  const siteAsset=document.querySelector('script[src*="assets/site.js"]');
  script.src=new URL('i18n-ar.js?v=20261123-v3',siteAsset?.src || document.currentScript?.src || document.baseURI).href;
  script.async=false;
  document.body.appendChild(script);
})();
