(() => {
 'use strict';
 // Time is monotonic; hidden/unfocused intervals never accrue. Clamp long
 // scheduling gaps (sleep/frozen tabs) rather than claiming unobserved time.
 function createMeter(o){let last=o.now(),active=false,ms=0;return{
  sample(visible){const now=o.now(),delta=Math.max(0,now-last);if(active&&delta<=5000)ms+=delta;last=now;active=visible;},
  take(){const seconds=Math.floor(ms/1000);ms-=seconds*1000;return seconds;}
 };}
 window.PLCreateVisibleMeter=createMeter;
 const c=window.PETLOSOPHY_USAGE_PUBLIC,script=document.currentScript;if(!c||!script)return;
 const surface=script.dataset.surface;if(!['landing','app'].includes(surface))return;
 let operator=false;try{const me=new URLSearchParams(location.search).get('me');if(me==='1')localStorage.setItem('pl_dev','1');if(me==='0')localStorage.removeItem('pl_dev');operator=localStorage.getItem('pl_dev')==='1'||!!window.__plDev;}catch{}
 function send(seconds,visit=false){if(!seconds&&!visit)return;const payload={p_id:crypto.randomUUID(),p_surface:surface,p_seconds:seconds,p_visit:visit,p_is_operator:operator};void(async()=>{for(let i=0;i<3;i++){try{const r=await fetch(c.url+'/rest/v1/rpc/record_engagement',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true});if(r.ok||(r.status<500&&r.status!==429))return;}catch{}if(i<2)await new Promise(r=>setTimeout(r,500*(i+1)));}})();}
 const meter=createMeter({now:()=>performance.now()}),visible=()=>!document.hidden&&document.hasFocus();let counted=false,countedDay="";
 const day=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 function claimVisit(){if(counted&&countedDay===day())return;try{const key='pl_engagement_visit_'+surface,old=JSON.parse(localStorage.getItem(key)||'null'),now=Date.now();if(!old||old.day!==day()||now-old.last>=1800000)send(0,true);localStorage.setItem(key,JSON.stringify({day:day(),last:now}));}catch{send(0,true);}counted=true;countedDay=day();}
 function tick(){const on=visible();meter.sample(on);if(on){claimVisit();try{localStorage.setItem('pl_engagement_visit_'+surface,JSON.stringify({day:day(),last:Date.now()}));}catch{}}}
 function flush(){tick();let n=meter.take();while(n>0){const part=Math.min(n,60);send(part);n-=part;}}
 document.addEventListener('visibilitychange',()=>{flush();if(document.hidden)counted=false;});window.addEventListener('blur',flush);window.addEventListener('focus',()=>{counted=false;tick();});window.addEventListener('pagehide',flush);
 tick();setInterval(tick,1000);setInterval(flush,15000);
})();
