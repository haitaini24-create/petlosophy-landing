(() => {
 'use strict';
 const c=window.PETLOSOPHY_USAGE_PUBLIC;if(!c||!window.__plVid)return;
 const visitor=window.__plVid,lang=()=>['ko','en','ja'].includes(window.__plLang)?window.__plLang:'ko';
 const source=(()=>{let s=new URLSearchParams(location.search).get('utm_source');if(!s)try{s=document.referrer?new URL(document.referrer).hostname:'direct'}catch{s='unknown'}return /^[a-zA-Z0-9_. -]{1,160}$/.test(s||'')?s:'other';})();
 const device=/iPad/i.test(navigator.userAgent)?'tablet':/Mobi|Android|iPhone/i.test(navigator.userAgent)?'mobile':'desktop';
 const id=()=>crypto.randomUUID();
 const pendingKey='petlosophy_landing_pending_v1';
 function pending(){try{const value=JSON.parse(localStorage.getItem(pendingKey)||'[]');return Array.isArray(value)?value.filter(x=>x&&typeof x.p_id==='string'&&typeof x.p_event_name==='string'&&typeof x.createdAt==='number'&&Date.now()-x.createdAt<36*3600000).slice(-200):[]}catch{return[]}}
 function storePending(rows){try{localStorage.setItem(pendingKey,JSON.stringify(rows))}catch{}}
 function forget(receipt){storePending(pending().filter(x=>x.p_id!==receipt))}
 async function deliver(payload){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(c.url+'/rest/v1/rpc/record_landing_usage',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true});if(r.ok){forget(payload.p_id);return}if(r.status<500&&r.status!==429){forget(payload.p_id);return}}catch{}if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}}
 function retryPending(){for(const payload of pending())void deliver(payload)}
 retryPending();window.addEventListener('online',retryPending);document.addEventListener('visibilitychange',()=>{if(!document.hidden)retryPending()});
 function send(event,product='',store=''){
  if(!/^[a-z0-9_-]{0,80}$/.test(product)||!/^[a-z0-9_-]{0,40}$/.test(store))return;
  const payload={p_id:id(),p_anonymous_id:visitor,p_event_name:event,p_product_id:product,p_store_id:store,p_source:source,p_language:lang(),p_device_type:device,p_is_dev:!!window.__plDev};
  // Keep consequential events across a closed tab; the receipt ID prevents retry inflation.
  if(event!=='activity'){const rows=pending();rows.push({...payload,createdAt:Date.now()});storePending(rows.slice(-200))}
  void deliver(payload);
 }
 let activeAt=0,impressions=new Set();
 function activity(){if(document.hidden)return;if(Date.now()-activeAt>30*60*1000)impressions=new Set();activeAt=Date.now();send('activity');}
 activity();setInterval(activity,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)activity()});
 // Count only time while this landing page is visible. Each milestone is sent
 // once per page view; the dashboard deduplicates it again by visitor.
 const dwellMilestones=[{ms:5*60*1000,event:'landing_dwell_5m'},{ms:10*60*1000,event:'landing_dwell_10m'},{ms:30*60*1000,event:'landing_dwell_30m'}];
 let visibleDwellMs=0,visibleSince=document.hidden?0:Date.now();const reachedDwellMilestones=new Set();
 function updateVisibleDwell(force=false){if((document.hidden&&!force)||!visibleSince)return;const now=Date.now();visibleDwellMs+=Math.max(0,now-visibleSince);visibleSince=now;for(const milestone of dwellMilestones)if(visibleDwellMs>=milestone.ms&&!reachedDwellMilestones.has(milestone.event)){reachedDwellMilestones.add(milestone.event);send(milestone.event);}}
 setInterval(updateVisibleDwell,1000);document.addEventListener('visibilitychange',()=>{if(document.hidden){updateVisibleDwell(true);visibleSince=0;}else visibleSince=Date.now();});
 // The legacy logger is also called through local closures; wrap its sink, not
 // just window.__plLog, so survey starts and app-link clicks cannot bypass us.
 window.__plRecordUsageEvent=function(event,detail){
  const map={'설문 시작':'survey_start','설문 제출':'survey_submit_reported','앱 이동':'app_click'};
  if(map[event])send(map[event]);
  if(event==='추천 제품 보기'){send('product_open',detail);observeReviews(detail);}
 };
 document.addEventListener('toggle',e=>{if(e.target.matches?.('.sm-ing')&&e.target.open){const pid=document.getElementById('selModal')?.dataset.pid;if(pid)send('product_ingredients',pid)}},true);
 document.addEventListener('click',e=>{
  const a=e.target.closest('[data-buy]');if(!a)return;const pid=document.getElementById('selModal')?.dataset.pid;if(!pid)return;
  let store='official';try{const h=new URL(a.href).hostname;store=/coupang/.test(h)?'coupang':/rakuten/.test(h)?'rakuten':/amazon|amzn/.test(h)?'amazon':'official'}catch{}
  send('store_click',pid,store);
 });
 const timers=new Map();
 document.addEventListener('visibilitychange',()=>{for(const timer of timers.values())clearTimeout(timer);timers.clear();if(!document.hidden)document.querySelectorAll('.sel-card').forEach(card=>{observer.unobserve(card);observer.observe(card);});});
 const observer=new IntersectionObserver(entries=>{for(const e of entries){const card=e.target,key=card.dataset.pid+':'+lang();if(e.isIntersecting&&e.intersectionRatio>=.5&&!document.hidden&&!impressions.has(key)){
   if(!timers.has(card))timers.set(card,setTimeout(()=>{timers.delete(card);const r=card.getBoundingClientRect(),visibleWidth=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),visibleHeight=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));if(document.hidden||visibleWidth*visibleHeight<r.width*r.height*.5)return;if(!impressions.has(key)){impressions.add(key);send('product_impression',card.dataset.pid)}},5000));
  }else{clearTimeout(timers.get(card));timers.delete(card);}}},{threshold:[0,.5]});
 function observeCards(){document.querySelectorAll('.sel-card').forEach(card=>{if(!card.dataset.usageObserved){card.dataset.usageObserved='1';observer.observe(card);}});}
 let reviewObserver;
 function observeReviews(pid){reviewObserver?.disconnect();const review=document.querySelector('#selBody .sm-rev');if(!review)return;reviewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.5)&&!document.hidden){send('product_reviews',pid);reviewObserver.disconnect();}},{threshold:.5});reviewObserver.observe(review);}
 observeCards();const track=document.querySelector('.sel-card')?.parentElement;if(track)new MutationObserver(observeCards).observe(track,{childList:true});
})();
