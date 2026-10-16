(function(){
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// theme
const root=document.documentElement; const pref=localStorage.bdTheme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
const setTheme=t=>{root.dataset.theme=t;localStorage.bdTheme=t;if(window._tiles)swapTiles();}; setTheme(pref);
$('#theme').onclick=()=>setTheme(root.dataset.theme==='dark'?'light':'dark');
// tabs
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button,.tab').forEach(e=>e.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active');history.replaceState(null,'','#'+b.dataset.tab);if(b.dataset.tab==='map')setTimeout(()=>map.invalidateSize(),50);if(b.dataset.tab==='tree'&&window.loadTree)window.loadTree();});
if(location.hash){const b=document.querySelector(`nav [data-tab="${location.hash.slice(1)}"]`);b&&b.click();setTimeout(()=>scrollTo(0,0),0);}
$('#fishreport').innerHTML=window.FISH_HTML; $('#planbody').innerHTML=window.PLAN_HTML;

// MAP
const map=L.map('leaflet',{zoomSnap:0.5,wheelPxPerZoomLevel:90,maxZoom:19,zoomControl:false}).setView([41.15,-74.93],10);
L.control.zoom({position:'topleft'}).addTo(map);
let baseMode=localStorage.bdBase||'soft';
const esriAttr='Tiles &copy; Esri, HERE, Garmin, USGS, &copy; OpenStreetMap contributors';
function swapTiles(){ if(window._tiles)map.removeLayer(window._tiles);
 const dark=root.dataset.theme==='dark';
 if(baseMode==='sat'){window._tiles=L.layerGroup([L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:19,maxZoom:19,attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics'}),L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:19,maxZoom:19})]);}
 else if(baseMode==='topo'){window._tiles=L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:19,attribution:'USGS The National Map'});}
 else {const g=dark?'Dark':'Light';const base='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_'+g+'_Gray_';
  window._tiles=L.layerGroup([L.tileLayer(base+'Base/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:19,attribution:esriAttr}),L.tileLayer(base+'Reference/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:16,maxZoom:19})]);}
 window._tiles.addTo(map); window._tiles.eachLayer&&0; document.querySelectorAll('.basebtn').forEach(b=>b.classList.toggle('active',b.dataset.b===baseMode));}
const BaseCtl=L.Control.extend({onAdd(){const d=L.DomUtil.create('div','basectl');d.innerHTML='<button class="basebtn" data-b="soft">Soft</button><button class="basebtn" data-b="topo">Topo</button><button class="basebtn" data-b="sat">Satellite</button>';L.DomEvent.disableClickPropagation(d);d.onclick=e=>{if(e.target.dataset.b){baseMode=e.target.dataset.b;localStorage.bdBase=baseMode;swapTiles();}};return d;}});
new BaseCtl({position:'topright'}).addTo(map); swapTiles();
// river highlight
if(window.RIVER){L.polyline(window.RIVER,{color:'#fff',weight:9,opacity:.35,interactive:false}).addTo(map);L.polyline(window.RIVER,{color:'#3f9fb8',weight:4.5,opacity:.85,interactive:false}).addTo(map);}
const SVGI={camp:'<path d="M12 3 3 20h18L12 3Zm0 6 4.5 9h-9L12 9Z" fill="#fff"/>',acc:'<path d="M4 15c3 0 3 2 6 2s3-2 6-2 3 2 4 2v2c-1 0-1-2-4-2s-3 2-6 2-3-2-6-2v-2Zm8-12 5 8h-4v3h-2v-3H7l5-8Z" fill="#fff"/>',fish:'<path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3Zm11-1.2a1 1 0 1 0 0 .1Z" fill="#fff"/>',gauge:'<path d="M5 17c2 0 2-1.5 3.5-1.5S10 17 12 17s2-1.5 3.5-1.5S17 17 19 17v2c-2 0-2-1.5-3.5-1.5S14 19 12 19s-2-1.5-3.5-1.5S7 19 5 19v-2Zm6-13h2v10h-2z" fill="#fff"/>'};
const COL={camp:'#4c9a6a',acc:'#2a7f8f',fish:'#d08a3a',gauge:'#7a5fb0',visited:'#c0567a',group:'#8a6a3a'};
const icon=(t,visited,label)=>L.divIcon({className:'bd-ic',html:`<div class="pin ${visited?'visited':''}" style="background:${COL[t]||COL.camp}"><svg viewBox="0 0 24 24" width="16" height="16">${SVGI[t]||SVGI.camp}</svg>${visited?'<span class="vbadge">✓</span>':''}</div>`,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-12]});
const fmtC=c=>`${c[0].toFixed(5)}, ${c[1].toFixed(5)}`;
const coordTools=(c,label)=>`<div class="ctools"><button class="copyc" data-c="${fmtC(c)}" type="button">⧉ Copy coordinates</button> · <a href="https://www.google.com/maps/search/?api=1&query=${c[0]},${c[1]}" target="_blank" rel="noopener">Google Maps</a> · <a href="https://maps.apple.com/?ll=${c[0]},${c[1]}&q=${encodeURIComponent(label)}" target="_blank" rel="noopener">Apple Maps</a></div>`;
async function copyText(t){try{if(navigator.clipboard&&isSecureContext){await navigator.clipboard.writeText(t);return true;}}catch(e){}
 const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:-1000px;opacity:0';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,t.length);let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();if(!ok)prompt('Copy coordinates:',t);return ok;}
document.addEventListener('click',async e=>{const b=e.target.closest('.copyc');if(!b)return;e.preventDefault();const ok=await copyText(b.dataset.c);const o=b.textContent;b.textContent=ok?'✓ Copied':'Copy manually';b.classList.add('done');setTimeout(()=>{b.textContent=o;b.classList.remove('done');},1600);});
const D=window.BD;
// individual sites list
const SITES=[];D.campsites.forEach(g=>{ if(g.sites&&g.sites.length) g.sites.forEach(s=>SITES.push({...s,g,type:'camp'})); else SITES.push({id:g.key,c:g.c,g,type:'group',precise:g.precise,src:g.src}); });
const cluster=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:38,spiderfyOnMaxZoom:true,disableClusteringAtZoom:16,iconCreateFunction:cl=>L.divIcon({className:'bd-cl',html:`<div>${cl.getChildCount()}</div>`,iconSize:[34,34]})});
map.addLayer(cluster);
const markers={}; const VISITS={}; let onlyVisited=false;
const typeOn={camp:true,acc:true,fish:true};
function sitePopup(s){const g=s.g,v=VISITS[s.id]||[];
 return `<div class="pop"><h4>${s.type==='group'?esc(g.n):`${esc(s.id)} · ${esc(g.n)}`} <span class="muted">(${g.st})</span></h4>
 <div>${s.type==='group'?esc(g.s):`Zone ${g.z} · RM ≈ ${g.rm}`}</div><div class="small muted">${esc(g.note)}</div>
 <div class="small ${s.precise?'ok':'muted'}">${s.precise?'📍 Precise location':'≈ Approximate location'} — ${esc(s.src||'')}</div>
 ${coordTools(s.c,s.id+' '+g.n)}
 <div class="visits">${v.length?`<b>${v.length} check-in${v.length>1?'s':''}</b> · last ${esc(v[0].visitDate)}`:'<span class="muted small">No check-ins yet</span>'}</div>
 <button class="btn sm checkin-btn" data-site="${esc(s.id)}">⛺ We've been here</button> ${v.length?`<button class="btn sm ghost hist-btn" data-site="${esc(s.id)}">History & photos</button>`:''}</div>`;}
function buildMarkers(){cluster.clearLayers();
 SITES.forEach(s=>{const vis=!!(VISITS[s.id]&&VISITS[s.id].length);if(onlyVisited&&!vis)return;if(!typeOn.camp)return;
  const m=L.marker(s.c,{icon:icon(vis?'visited':(s.type==='group'?'group':'camp'),vis),title:s.id}).bindPopup(()=>sitePopup(s),{maxWidth:290});
  m.bindTooltip(s.type==='group'?s.g.n:s.id,{permanent:true,direction:'right',offset:[12,0],className:'sitelabel'});markers[s.id]=m;cluster.addLayer(m);});
 if(!onlyVisited){
 if(typeOn.acc)D.access.forEach((a,i)=>{const nx=D.access[i+1];const m=L.marker(a.c,{icon:icon('acc'),title:a.n}).bindPopup(`<div class="pop"><h4>${esc(a.n)} (${a.st})</h4>${esc(a.t)}<br>River mile ≈ ${a.rm}<div class="small muted">${esc(a.note)}</div>${nx?`<div class="small"><b>Next downstream:</b> ${esc(nx.n)} ≈ ${(a.rm-nx.rm).toFixed(1)} mi</div>`:''}<div class="small ${a.precise?'ok':'muted'}">${a.precise?'📍 Location from OpenStreetMap':'≈ Approximate location'}</div>${coordTools(a.c,a.n)}</div>`);m.bindTooltip(a.n,{permanent:true,direction:'right',offset:[12,0],className:'sitelabel'});markers['acc'+i]=m;cluster.addLayer(m);});
 if(typeOn.fish)D.spots.forEach((s,i)=>{const m=L.marker(s.c,{icon:icon('fish'),title:s.n}).bindPopup(`<div class="pop"><h4>${esc(s.n)}</h4><b>${esc(s.sp)}</b><div class="small muted">${esc(s.note)}</div><div class="small muted">≈ Approximate location</div>${coordTools(s.c,s.n)}</div>`);m.bindTooltip(s.n,{permanent:true,direction:'right',offset:[12,0],className:'sitelabel'});markers['fish'+i]=m;cluster.addLayer(m);});}
 labelsByZoom(); renderList();}
function labelsByZoom(){document.getElementById('leaflet').classList.toggle('showlabels',map.getZoom()>=15);}
map.on('zoomend',labelsByZoom);
const gaugeLayer=L.layerGroup().addTo(map);
// sidebar list
function allEntries(){const out=SITES.map(s=>({key:s.id,label:s.type==='group'?s.g.n:`${s.id} — ${s.g.n}`,sub:s.type==='group'?'Separate reservation':`Zone ${s.g.z} · ${s.g.st} · RM ${s.g.rm}`,t:VISITS[s.id]?.length?'visited':(s.type==='group'?'group':'camp'),cat:'camp'}));
 D.access.forEach((a,i)=>out.push({key:'acc'+i,label:a.n,sub:`Access · RM ${a.rm}`,t:'acc',cat:'acc'}));D.spots.forEach((s,i)=>out.push({key:'fish'+i,label:s.n,sub:'Fishing · '+s.sp,t:'fish',cat:'fish'}));return out;}
function renderList(){const q=($('#sitesearch').value||'').toLowerCase().trim();
 const items=allEntries().filter(e=>markers[e.key]&&(!q||(e.label+' '+e.sub).toLowerCase().includes(q)));
 $('#sitelist').innerHTML=items.length?items.slice(0,400).map(e=>`<li data-k="${esc(e.key)}"><i class="dot" style="background:${COL[e.t]}"></i><span><b>${esc(e.label)}</b><small>${esc(e.sub)}</small></span></li>`).join(''):'<li class="muted small">No matches</li>';
 $('#listcount').textContent=items.length+' shown';}
$('#sitesearch').oninput=renderList;
$('#sitelist').onclick=e=>{const li=e.target.closest('li[data-k]');if(!li)return;const m=markers[li.dataset.k];if(!m)return;
 if(innerWidth<820)document.getElementById('leaflet').scrollIntoView({behavior:'smooth',block:'center'});
 cluster.zoomToShowLayer(m,()=>{map.flyTo(m.getLatLng(),Math.max(map.getZoom(),17),{duration:.8});setTimeout(()=>m.openPopup(),850);});};
document.querySelectorAll('.filt input').forEach(cb=>cb.onchange=()=>{if(cb.dataset.t==='visited')onlyVisited=cb.checked;else typeOn[cb.dataset.t]=cb.checked;buildMarkers();});
// float planner
const pi=$('#putin'),to=$('#takeout');D.access.forEach((a,i)=>{pi.add(new Option(`${a.n} (RM ${a.rm})`,i));to.add(new Option(`${a.n} (RM ${a.rm})`,i));});
pi.value=D.access.findIndex(a=>/Milford Beach/.test(a.n));to.value=D.access.findIndex(a=>/Dingmans Ferry/.test(a.n));let fl;
function plan(){const a=D.access[pi.value],b=D.access[to.value];const d=a.rm-b.rm;if(fl){map.removeLayer(fl);fl=null;}
 if(d<=0){$('#floatout').innerHTML='<p class="err">Pick a take-out downstream of your put-in.</p>';return;}
 const zs=D.campsites.filter(c=>c.zone&&c.rm<=a.rm&&c.rm>=b.rm);const zones=[...new Set(zs.map(c=>c.z))];const nsites=zs.reduce((n,c)=>n+c.ids.length,0);
 const hrs=[d/3.5,d/2];
 $('#floatout').innerHTML=`<div class="big">${d.toFixed(1)} mi</div><div class="muted small">≈ ${hrs[0].toFixed(1)}–${hrs[1].toFixed(1)} hrs paddling (more with fishing)</div><p class="small">${d>=34?'Meets 3-night camping minimum':d>=26?'Meets 2-night camping minimum':d>=14?'Meets 1-night camping minimum (14 mi)':'Day trip — under the 14 mi river-camping minimum'}${zones.length?`<br>${nsites} river sites en route · zones ${zones.join(', ')}`:''}</p>`;
 if(window.RIVER){const seg=riverBetween(a.c,b.c);fl=L.polyline(seg,{color:'#f0b34a',weight:6,opacity:.85}).addTo(map);}}
function nearestIdx(c){let bi=0,bd=1e9;window.RIVER.forEach((p,i)=>{const d=(p[0]-c[0])**2+((p[1]-c[1])*.75)**2;if(d<bd){bd=d;bi=i;}});return bi;}
function riverBetween(a,b){let i=nearestIdx(a),j=nearestIdx(b);if(i>j)[i,j]=[j,i];return window.RIVER.slice(i,j+1);}
pi.onchange=to.onchange=plan;plan();
// CHECK-INS
const A=window.bdApi; const ci={photos:[],t0:Date.now(),site:null};
const drawCP=A.photoPicker($('#cphotos'),$('#cpreview'),ci.photos);
const siteName=id=>{const s=SITES.find(x=>x.id===id);return s?(s.type==='group'?s.g.n:`${s.id} · ${s.g.n}`):id;};
async function loadVisits(){try{const r=await fetch('/api/notes?kind=checkin',{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();
  for(const k in VISITS)delete VISITS[k];j.notes.forEach(n=>{(VISITS[n.site]=VISITS[n.site]||[]).push(n);});
  Object.values(VISITS).forEach(v=>v.sort((a,b)=>b.visitDate.localeCompare(a.visitDate)));
  $('#visitcount').textContent=Object.keys(VISITS).length?`${Object.keys(VISITS).length} sites visited`:'';}catch(e){$('#visitcount').textContent='Check-ins unavailable';}
 buildMarkers();}
function openModal(id){document.getElementById(id).classList.add('open');document.body.classList.add('modal-open');}
function closeModal(el){el.classList.remove('open');document.body.classList.remove('modal-open');}
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.mclose'))closeModal(m);}));
document.addEventListener('click',e=>{const c=e.target.closest('.checkin-btn');if(c){ci.site=c.dataset.site;$('#ctitle').textContent=siteName(ci.site);$('#cdate').value=new Date().toLocaleDateString('en-CA');$('#cdate').max=new Date(Date.now()+86400e3).toLocaleDateString('en-CA');openModal('cmodal');return;}
 const h=e.target.closest('.hist-btn');if(h)showHistory(h.dataset.site);});
function showHistory(id){const v=VISITS[id]||[];$('#htitle').textContent=siteName(id);
 $('#hbody').innerHTML=v.length?v.map(n=>`<div class="visit"><div class="vhead"><b>📅 ${n.visitDate}</b> · ${n.anonymous?'<i>Anonymous</i>':n.name}${A.myTokens[n.id]?` <button class="linkbtn vdel" data-id="${n.id}">delete</button>`:''}</div>${n.text?`<p>${n.text.replace(/\n/g,'<br>')}</p>`:''}${A.thumbs(n.photos)}</div>`).join(''):'<p class="muted">No visits yet.</p>';
 $('#hbody').dataset.site=id;openModal('hmodal');}
$('#hbody').onclick=async e=>{const b=e.target.closest('.vdel');if(!b)return;if(!confirm('Delete this check-in?'))return;try{await A.delNote(b.dataset.id);bdToast('Check-in removed');await loadVisits();showHistory($('#hbody').dataset.site);}catch(err){bdToast(err.message);}};
$('#canon').onchange=()=>{$('#cname').disabled=$('#canon').checked;};
$('#cform').onsubmit=async e=>{e.preventDefault();const btn=$('#csubmit');btn.disabled=true;btn.textContent='Saving…';
 try{await A.post({kind:'checkin',site:ci.site,visitDate:$('#cdate').value,text:$('#ctext').value,name:$('#cname').value,anonymous:$('#canon').checked,photos:ci.photos,website:$('#chp').value,t:ci.t0});
  $('#ctext').value='';ci.photos.length=0;drawCP();closeModal($('#cmodal'));bdToast('Checked in! ⛺');map.closePopup();await loadVisits();showHistory(ci.site);}
 catch(err){bdToast(err.message);}finally{btn.disabled=false;btn.textContent="Save check-in";}};
// visited gallery list
$('#galbtn').onclick=()=>{const ids=Object.keys(VISITS).sort((a,b)=>VISITS[b][0].visitDate.localeCompare(VISITS[a][0].visitDate));
 $('#htitle').textContent='Visited campsites';$('#hbody').innerHTML=ids.length?ids.map(id=>`<div class="visit"><div class="vhead"><b>${esc(siteName(id))}</b> · ${VISITS[id].length} visit${VISITS[id].length>1?'s':''} · last ${VISITS[id][0].visitDate} <button class="linkbtn gotosite" data-k="${esc(id)}">show on map</button></div>${A.thumbs(VISITS[id].flatMap(n=>n.photos).slice(0,8))}</div>`).join(''):'<p class="muted">No check-ins yet. Open any campsite and tap “We\'ve been here”.</p>';openModal('hmodal');};
document.addEventListener('click',e=>{const g=e.target.closest('.gotosite');if(!g)return;closeModal($('#hmodal'));const li={dataset:{k:g.dataset.k}};const m=markers[g.dataset.k];if(m)cluster.zoomToShowLayer(m,()=>{map.flyTo(m.getLatLng(),17);setTimeout(()=>m.openPopup(),850);});});
buildMarkers();loadVisits();


// USGS
const GAUGES=[{id:'01434000',n:'Delaware River at Port Jervis, NY (above park)'},{id:'01438500',n:'Delaware River at Montague, NJ',main:1},{id:'01440200',n:'Delaware River near Delaware Water Gap, PA'},{id:'01439500',n:'Bush Kill at Shoemakers, PA (trib)'},{id:'01440000',n:'Flat Brook near Flatbrookville, NJ (trib)'}];
function spark(pts,color){if(!pts||pts.length<2)return '<div class="muted small">No trend data</div>';const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys)||1;const W=300,H=60;
 const path=pts.map((p,i)=>`${i?'L':'M'}${((p[0]-x0)/(x1-x0||1)*W).toFixed(1)},${(H-4-(p[1]-y0)/((y1-y0)||1)*(H-8)).toFixed(1)}`).join('');
 return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${path} L${W},${H} L0,${H}Z" fill="${color}22"/><path d="${path}" fill="none" stroke="${color}" stroke-width="2"/></svg><div class="small muted" style="display:flex;justify-content:space-between"><span>min ${y0}</span><span>max ${y1}</span></div>`;}
function rate(cfs,gh){if(gh!=null&&gh>=15)return['bad','Closed (≥15 ft)'];if((cfs!=null&&cfs>10000)||(gh!=null&&gh>=12))return['bad','High — stay off'];if((cfs!=null&&cfs>5000)||(gh!=null&&gh>=8))return['caution','Caution — PFD mandatory ≥8 ft'];if(cfs!=null&&cfs<1200)return['caution','Low — scrapey riffles'];if(cfs!=null)return['good','Good'];return['na','Unknown'];}
$('#gauges').innerHTML=GAUGES.map(()=>'<div class="card"><div class="skeleton"></div></div>').join('');
async function loadUSGS(){
 try{const r=await fetch(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${GAUGES.map(g=>g.id).join(',')}&parameterCd=00060,00065,00010&period=P7D&siteStatus=all`);if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();
  const by={};j.value.timeSeries.forEach(t=>{const id=t.sourceInfo.siteCode[0].value,p=t.variable.variableCode[0].value;(by[id]=by[id]||{geo:t.sourceInfo.geoLocation.geogLocation})[p]=t.values[0].value.filter(v=>+v.value>-9999).map(v=>[Date.parse(v.dateTime),+v.value]);if(!by[id][p].length)delete by[id][p];});
  gaugeLayer.clearLayers();$('#gauges').innerHTML=GAUGES.map(g=>{const s=by[g.id];if(!s)return `<div class="card"><h3>${g.n}</h3><p class="err">No data returned for this gauge right now.</p></div>`;
   const last=k=>s[k]&&s[k].length?s[k][s[k].length-1]:null;const q=last('00060'),h=last('00065'),w=last('00010');
   const [cls,lbl]=rate(q&&q[1],h&&h[1]);const t=(q||h||w);const ago=t?Math.round((Date.now()-t[0])/60000):null;
   const trend=k=>{const a=s[k];if(!a||a.length<8)return'';const d=a[a.length-1][1]-a[Math.max(0,a.length-9)][1];return d>0.5?' ↑':d<-0.5?' ↓':' →';};
   if(s.geo)L.marker([s.geo.latitude,s.geo.longitude],{icon:icon('gauge')}).bindPopup(`<h4>${g.n}</h4>USGS ${g.id}<br>${q?`Flow: <b>${q[1].toLocaleString()} cfs</b><br>`:''}${h?`Gage: <b>${h[1]} ft</b><br>`:''}${w?`Water: <b>${(w[1]*9/5+32).toFixed(1)} °F</b><br>`:''}<a href="https://waterdata.usgs.gov/monitoring-location/${g.id}/" target="_blank">USGS page</a>${coordTools([s.geo.latitude,s.geo.longitude],g.n)}`).addTo(gaugeLayer);
   if(g.main)$('#statusbar').innerHTML=`<span class="pill ${cls}">${lbl}</span> &nbsp;Montague: <b>${q?q[1].toLocaleString()+' cfs':'—'}</b> · ${h?h[1]+' ft':'—'}${w?` · water ${(w[1]*9/5+32).toFixed(0)}°F`:''} <span class="muted small">· updated ${ago} min ago</span>`;
   return `<div class="card"><h3>${g.n}</h3><div class="small muted">USGS ${g.id} · ${ago!=null?ago+' min ago':''}</div>${g.main?`<p><span class="pill ${cls}">${lbl}</span></p>`:g.id==='01440200'?'<p class="small muted">Stage-only gauge (no discharge published)</p>' :g.id==='01434000'?'<p class="small muted">Main stem just above the park — upstream early warning</p>':'<p class="small muted">Tributary — rising flow means color/debris entering the main river</p>'}
   <div class="metrics">${q?`<div class="metric"><b>${q[1].toLocaleString()}${trend('00060')}</b><span>cfs discharge</span></div>`:'<div class="metric"><b>—</b><span>discharge n/a</span></div>'}${h?`<div class="metric"><b>${h[1]} ft${trend('00065')}</b><span>gage height</span></div>`:''}${w?`<div class="metric"><b>${(w[1]*9/5+32).toFixed(1)}°F</b><span>water temp (${w[1]}°C)</span></div>`:''}</div>
   ${s['00060']?'<div class="small">Discharge, 7 days</div>'+spark(s['00060'],'#2a7f8f'):''}${s['00065']&&!s['00060']?'<div class="small">Gage height, 7 days</div>'+spark(s['00065'],'#4c9a6a'):''}${s['00010']?'<div class="small">Water temp °C, 7 days</div>'+spark(s['00010'],'#d08a3a'):''}
   <a class="small" href="https://waterdata.usgs.gov/monitoring-location/${g.id}/" target="_blank" rel="noopener">Open USGS page ↗</a></div>`;}).join('');
 }catch(e){$('#gauges').innerHTML=`<div class="card"><p class="err">Couldn't load USGS data (${esc(e.message)}).</p><button onclick="location.reload()">Retry</button> <a href="https://waterdata.usgs.gov/monitoring-location/01438500/" target="_blank">Montague gauge on USGS</a></div>`;$('#statusbar').innerHTML='<span class="pill na">River data unavailable</span> <a href="https://waterdata.usgs.gov/monitoring-location/01438500/" target="_blank">Check USGS directly</a>';}}
loadUSGS();setInterval(loadUSGS,15*60000);

// WEATHER
const LOCS=[{n:'Milford, PA',c:[41.3223,-74.8024]},{n:'Dingmans Ferry, PA',c:[41.2198,-74.8640]},{n:'Delaware Water Gap, PA',c:[40.9787,-75.1427]}];
const WC={0:['☀️','Clear'],1:['🌤️','Mostly clear'],2:['⛅','Partly cloudy'],3:['☁️','Overcast'],45:['🌫️','Fog'],48:['🌫️','Rime fog'],51:['🌦️','Light drizzle'],53:['🌦️','Drizzle'],55:['🌧️','Heavy drizzle'],61:['🌦️','Light rain'],63:['🌧️','Rain'],65:['🌧️','Heavy rain'],66:['🌧️','Freezing rain'],67:['🌧️','Freezing rain'],71:['🌨️','Light snow'],73:['🌨️','Snow'],75:['❄️','Heavy snow'],77:['🌨️','Snow grains'],80:['🌦️','Showers'],81:['🌧️','Showers'],82:['⛈️','Violent showers'],85:['🌨️','Snow showers'],86:['🌨️','Snow showers'],95:['⛈️','Thunderstorm'],96:['⛈️','T-storm + hail'],99:['⛈️','T-storm + hail']};
const wc=c=>WC[c]||['🌡️','—'];const dir=d=>['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8];
const tm=s=>new Date(s).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
let cur=0;$('#wxloc').innerHTML=LOCS.map((l,i)=>`<button data-i="${i}" class="${i?'':'active'}">${l.n}</button>`).join('');
$('#wxloc').onclick=e=>{if(!e.target.dataset.i)return;cur=+e.target.dataset.i;[...$('#wxloc').children].forEach(b=>b.classList.toggle('active',+b.dataset.i===cur));loadWx();};
const cache={};
async function loadWx(){const l=LOCS[cur];$('#wx').innerHTML='<div class="card"><div class="skeleton"></div></div>';
 try{const j=cache[cur]||(cache[cur]=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l.c[0]}&longitude=${l.c[1]}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York&forecast_days=7`).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).catch(e=>{delete cache[cur];throw e;}));
  const c=j.current,d=j.daily,h=j.hourly;const nowI=Math.max(0,h.time.findIndex(t=>t>=c.time.slice(0,13)));

  $('#wx').innerHTML=`<div class="wxtop"><div class="card"><div class="muted small">Now in ${l.n}</div><div class="big">${wc(c.weather_code)[0]} ${Math.round(c.temperature_2m)}°F</div><div>${wc(c.weather_code)[1]} · feels ${Math.round(c.apparent_temperature)}°F · ${c.relative_humidity_2m}% RH</div></div>
  <div class="card"><div class="muted small">Wind</div><div class="big">${Math.round(c.wind_speed_10m)} mph ${dir(c.wind_direction_10m)}</div><div>Gusts ${Math.round(c.wind_gusts_10m)} mph${c.wind_gusts_10m>20?' — <b>tough paddling, esp. through the Gap</b>':''}</div></div>
  <div class="card"><div class="muted small">Sun today</div><div class="big">🌅 ${tm(d.sunrise[0])}</div><div>🌇 Sunset ${tm(d.sunset[0])} · precip today ${d.precipitation_sum[0]}"</div></div></div>
  <div class="card"><h3>Next 24 hours</h3><div class="hours">${h.time.slice(nowI,nowI+24).map((t,k)=>{const i=nowI+k;return `<div class="hour"><div class="muted">${new Date(t).toLocaleTimeString([], {hour:'numeric'})}</div><div style="font-size:20px">${wc(h.weather_code[i])[0]}</div><b>${Math.round(h.temperature_2m[i])}°</b><div class="small">💧${h.precipitation_probability[i]??'–'}%</div><div class="small muted">${Math.round(h.wind_speed_10m[i])} mph</div></div>`}).join('')}</div></div>
  <div class="card" style="margin-top:14px"><h3>7-day forecast</h3><div class="days">${d.time.map((t,i)=>`<div class="day"><b>${new Date(t+'T12:00').toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'})}</b><div style="font-size:22px">${wc(d.weather_code[i])[0]}</div>${wc(d.weather_code[i])[1]}<div><b>${Math.round(d.temperature_2m_max[i])}°</b> / ${Math.round(d.temperature_2m_min[i])}°F</div><div class="small">💧 ${d.precipitation_probability_max[i]??'–'}% · ${d.precipitation_sum[i]}"</div><div class="small">💨 ${Math.round(d.wind_speed_10m_max[i])} (g ${Math.round(d.wind_gusts_10m_max[i])}) mph</div><div class="small muted">☀ ${tm(d.sunrise[i])} – ${tm(d.sunset[i])}</div></div>`).join('')}</div></div>`;
 }catch(e){$('#wx').innerHTML=`<div class="card"><p class="err">Weather unavailable right now (${esc(e.message)}).</p><a href="https://forecast.weather.gov/MapClick.php?lat=${l.c[0]}&lon=${l.c[1]}" target="_blank">Open NWS forecast ↗</a></div>`;}}
loadWx();
fetch('https://api.weather.gov/alerts/active?point=41.15,-74.92').then(r=>r.json()).then(j=>{const f=(j.features||[]);$('#alerts').innerHTML=f.length?f.map(a=>`<div class="alert"><b>⚠ ${esc(a.properties.event)}</b> — ${esc(a.properties.headline||'')}</div>`).join(''):'<div class="small muted" style="margin-top:8px">✓ No active NWS alerts for the river corridor.</div>';}).catch(()=>{$('#alerts').innerHTML='<div class="small muted">NWS alerts unavailable — check weather.gov.</div>';});
})();
