(function(){
 const buttons=[...document.querySelectorAll('[data-al-filter]')];
 if(buttons.length){buttons.forEach(b=>b.addEventListener('click',()=>{const kind=b.getAttribute('data-al-filter');buttons.forEach(x=>x.classList.toggle('is-active',x===b));document.querySelectorAll('[data-analysis-category]').forEach(c=>c.hidden=kind!=='all'&&c.getAttribute('data-analysis-category')!==kind)}))}
 const viewer=document.getElementById('analysis-lightbox');
 if(!viewer)return;
 const pic=viewer.querySelector('img'), caption=viewer.querySelector('.analysis-lightbox-title'), close=viewer.querySelector('.analysis-lightbox-close');
 let before=null;
 const hide=()=>{viewer.hidden=true;document.body.style.overflow='';pic.src='';before?.focus?.()};
 document.querySelectorAll('[data-al-image]').forEach(btn=>btn.addEventListener('click',()=>{before=btn;caption.textContent=btn.getAttribute('data-al-title')||'Original source diagram';pic.src=btn.getAttribute('data-al-image');pic.alt=caption.textContent;viewer.hidden=false;document.body.style.overflow='hidden';close.focus()}));
 close?.addEventListener('click',hide);
 viewer.addEventListener('click',e=>{if(e.target===viewer)hide()});
 document.addEventListener('keydown',e=>{if(!viewer.hidden&&e.key==='Escape'){e.preventDefault();hide()}});
})();
