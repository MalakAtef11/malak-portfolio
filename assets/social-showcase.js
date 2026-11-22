(function(){
  const buttons=[...document.querySelectorAll('[data-sm-range]')];
  if(!buttons.length)return;
  const values={
    '30':{views:'141,579',change:'+729.6% compared with Oct 22',followers:'816',followChange:'+34.4% compared with Oct 22',net:'+190',period:'Oct 23–Nov 21, 2026'},
    '7':{views:'109,845',change:'+937.2% compared with Nov 14',followers:'816',followChange:'+16.2% compared with Nov 14',net:'+95',period:'Nov 15–21, 2026'}
  };
  function setPeriod(p){
    const v=values[p];if(!v)return;
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.smRange===p)));
    const ids={'sm-views':v.views,'sm-view-change':v.change,'sm-followers':v.followers,'sm-follow-change':v.followChange,'sm-net':v.net,'sm-range-label':v.period};
    for(const id in ids){const el=document.getElementById(id);if(el)el.textContent=ids[id];}
  }
  buttons.forEach(b=>b.addEventListener('click',()=>setPeriod(b.dataset.smRange)));
})();