(() => {
 'use strict';
 const c=window.PETLOSOPHY_USAGE_PUBLIC;
 if(!c?.url||!c?.key||new URLSearchParams(location.search).get('demo')==='content')return;
 const script=document.currentScript;
 const surface=script?.dataset?.surface;
 if(surface!=='app'&&surface!=='landing')return;
 const params=new URLSearchParams(location.search);
 const disabled=()=>{try{return localStorage.getItem('petlosophy_behavior_measurement_v2')==='disabled'}catch{return false}};
 if(disabled())return;
 const key='petlosophy_measurement_v2_'+surface;
 const pendingKey=key+'_pending';
 const uuid=()=>crypto.randomUUID();
 let browserId;
 try{
  if(surface==='app')browserId=JSON.parse(localStorage.getItem('petlosophy_app_browser_identity_v1')||'null')?.id;
  else browserId=window.__plVid;
  if(!/^[0-9a-f-]{36}$/i.test(browserId||''))browserId=localStorage.getItem(key+'_id');
  if(!/^[0-9a-f-]{36}$/i.test(browserId||'')){browserId=uuid();localStorage.setItem(key+'_id',browserId)}
 }catch{browserId=uuid()}
 const ua=navigator.userAgent||'';
 const device=/iPad|Tablet|SM-T/i.test(ua)?'tablet':/Android|iPhone|iPod|Mobile/i.test(ua)?'mobile':'desktop';
 const rawSource=surface==='app'?(window.PLAppAcquisition?.source||'direct'):(params.get('utm_source')||(()=>{try{return document.referrer?new URL(document.referrer).hostname:'direct'}catch{return'direct'}})());
 const source=String(rawSource||'direct').toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,64)||'direct';
 const rawCampaign=surface==='app'?window.PLAppAcquisition?.campaign:(params.get('utm_campaign')||params.get('campaign_code'));
 const campaign=/^[a-z0-9_-]{1,64}$/.test(rawCampaign||'')?rawCampaign:null;
 // A stored development flag can linger after a normal login. Count normal
 // visitors; classify only explicit test pages or verified operator devices.
 const isTest=params.get('me')==='1'||params.get('preview')==='internal';
 const pending=()=>{try{const rows=JSON.parse(localStorage.getItem(pendingKey)||'[]');return Array.isArray(rows)?rows.filter(x=>x?.p_event_id&&Date.now()-Date.parse(x.p_occurred_at)<72*3600000).slice(-500):[]}catch{return[]}};
 const save=rows=>{try{localStorage.setItem(pendingKey,JSON.stringify(rows))}catch{}};
 const inflight=new Set();
 async function deliver(row){
  if(inflight.has(row.p_event_id))return;
  inflight.add(row.p_event_id);
  try{for(let attempt=0;attempt<3;attempt++){
   try{const response=await fetch(c.url+'/rest/v1/rpc/record_measurement_v2',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify(row),keepalive:true});
    if(response.ok){save(pending().filter(x=>x.p_event_id!==row.p_event_id));return}
    if(response.status>=400&&response.status<500&&response.status!==429)return;
   }catch{}if(attempt<2)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }}finally{inflight.delete(row.p_event_id)}
 }
 function record(event,method=null,eventId=uuid()){
  if(disabled())return;
  const row={p_event_id:eventId,p_browser_id:browserId,p_surface:surface,p_event_name:event,p_source:source,p_campaign_code:campaign,p_method:method,p_device:device,p_is_test:isTest,p_occurred_at:new Date().toISOString()};
  if(pending().some(x=>x.p_event_id===eventId))return;
  save([...pending(),row].slice(-500));void deliver(row);
 }
 const retry=()=>{if(!disabled())pending().forEach(row=>{void deliver(row)})};
 window.addEventListener('online',retry);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)retry()});
 // A new document opened by an external link is a visit. Reload and history traversal are not.
 const navigation=performance.getEntriesByType('navigation')[0];
 if(navigation?.type!=='reload'&&navigation?.type!=='back_forward')record('visit');
 retry();
 if(surface==='app'){
  const starts=new Set();
  window.PLRecordUnifiedAnalysisStart=(key)=>{if(starts.has(key))return;starts.add(key);const method=key.startsWith('camera:')?'camera':key.startsWith('album:')?'album':'manual';record('analysis_start',method)};
  const old=window.PLRecordAppEvent;
  window.PLRecordAppEvent=(name,id,method)=>{old?.(name,id,method);if(name==='scan_completed')record('analysis_complete',null,id);if(name==='pwa_installed')record('install_confirmed',null,id)};
 }
})();
