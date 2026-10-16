(function(){
const $=s=>document.querySelector(s);
const API='/api/notes';
const MAXP=4, MAXT=600;
const myTokens=JSON.parse(localStorage.bdTokens||'{}');
const saveTok=()=>localStorage.bdTokens=JSON.stringify(myTokens);
const ago=ts=>{const m=(Date.now()-ts)/60000;return m<1?'just now':m<60?Math.round(m)+' min ago':m<1440?Math.round(m/60)+' h ago':new Date(ts).toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'});};
// image compression
async function compress(file){
  if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)&&!/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error(file.name+' is not a supported image');
  if(file.size>25e6) throw new Error(file.name+' is larger than 25 MB');
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error("Couldn't read "+file.name+' (try JPEG/PNG)'));i.src=url;});
   const max=1600;const sc=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
   const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*sc);c.height=Math.round(img.naturalHeight*sc);
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);
   let q=.82,d=c.toDataURL('image/jpeg',q);while(d.length>1.1e6&&q>.4){q-=.12;d=c.toDataURL('image/jpeg',q);}
   if(d.length>1.15e6) throw new Error(file.name+' is still too large after compression');
   return d;}finally{URL.revokeObjectURL(url);}
}
function photoPicker(input,preview,state){
  input.onchange=async()=>{const files=[...input.files];input.value='';
    for(const f of files){if(state.length>=MAXP){toast(`Up to ${MAXP} photos`);break;}
      try{const d=await compress(f);state.push(d);}catch(e){toast(e.message);}}
    draw();};
  function draw(){preview.innerHTML=state.map((d,i)=>`<div class="pv"><img src="${d}" alt=""><button type="button" data-i="${i}" aria-label="Remove photo">×</button></div>`).join('');}
  preview.onclick=e=>{const b=e.target.closest('button[data-i]');if(b){state.splice(+b.dataset.i,1);draw();}};
  return draw;
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),3200);}
window.bdToast=toast;
// lightbox
const lb=$('#lightbox');let lbList=[],lbI=0;
function openLB(list,i){lbList=list;lbI=i;lb.querySelector('img').src=list[i];lb.classList.add('open');lb.querySelector('.lbcount').textContent=list.length>1?`${i+1} / ${list.length}`:'';}
lb.onclick=e=>{if(e.target.closest('.lbprev')){openLB(lbList,(lbI-1+lbList.length)%lbList.length);}else if(e.target.closest('.lbnext')){openLB(lbList,(lbI+1)%lbList.length);}else lb.classList.remove('open');};
document.addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')lb.classList.remove('open');if(e.key==='ArrowRight')openLB(lbList,(lbI+1)%lbList.length);if(e.key==='ArrowLeft')openLB(lbList,(lbI-1+lbList.length)%lbList.length);});
let tsx=0;lb.addEventListener('touchstart',e=>tsx=e.touches[0].clientX,{passive:true});lb.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-tsx;if(Math.abs(dx)>50&&lbList.length>1){e.preventDefault();openLB(lbList,(lbI+(dx<0?1:-1)+lbList.length)%lbList.length);}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-lb]');if(!t)return;const list=JSON.parse(t.closest('[data-photos]').dataset.photos);openLB(list,+t.dataset.lb);});
const thumbs=p=>p&&p.length?`<div class="thumbs" data-photos='${JSON.stringify(p).replace(/'/g,'&#39;')}'>${p.map((u,i)=>`<img loading="lazy" src="${u}" data-lb="${i}" alt="Photo ${i+1}">`).join('')}</div>`:'';
async function post(payload){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});let j={};try{j=await r.json();}catch{}if(!r.ok)throw new Error(j.error||('Error '+r.status));if(j.deleteToken&&j.note)myTokens[j.note.id]=j.deleteToken,saveTok();return j;}
async function delNote(id){const r=await fetch(API+'?id='+id,{method:'DELETE',headers:{'x-delete-token':myTokens[id]||''}});if(!r.ok){let j={};try{j=await r.json()}catch{};throw new Error(j.error||'Delete failed');}delete myTokens[id];saveTok();}
window.bdApi={post,delNote,thumbs,ago,myTokens,compress,photoPicker};

// ---------- TREE ----------
const tree={photos:[],loaded:false,t0:Date.now()};
const drawTP=photoPicker($('#tphotos'),$('#tpreview'),tree.photos);
$('#tanon').onchange=()=>{$('#tname').disabled=$('#tanon').checked;};
$('#ttext').oninput=()=>$('#tcount').textContent=`${$('#ttext').value.length}/${MAXT}`;
const STYLES=['leaf','wood','tag'];
function noteHTML(n,i){const st=STYLES[(parseInt(n.id.slice(0,4),16)||i)%3];const rot=((parseInt(n.id.slice(4,6),16)||0)%9)-4;
 return `<article class="tnote ${st}" style="--r:${rot}deg;--d:${(i%7)*.4}s"><div class="string"></div><div class="tbody"><p>${n.text.replace(/\n/g,'<br>')}</p>${thumbs(n.photos)}<footer>— ${n.anonymous?'<i>Anonymous</i>':n.name} · <time>${ago(n.ts)}</time>${myTokens[n.id]?` <button class="linkbtn tdel" data-id="${n.id}">delete</button>`:''}</footer></div></article>`;}
async function loadTree(force){if(tree.loaded&&!force)return;tree.loaded=true;const box=$('#treenotes');
 box.innerHTML='<div class="tloading">Gathering leaves…</div>';
 try{const r=await fetch(API+'?kind=tree',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();
  box.innerHTML=j.notes.length?j.notes.map(noteHTML).join(''):'<div class="tempty">No notes yet — be the first to hang one on the tree. 🍃</div>';
  $('#tcountall').textContent=j.notes.length?`${j.notes.length} note${j.notes.length>1?'s':''} on the tree`:'';
 }catch(e){tree.loaded=false;box.innerHTML=`<div class="tempty err">Couldn't reach the tree right now (${e.message}). <button class="btn sm" onclick="loadTree(true)">Retry</button></div>`;}}
window.loadTree=loadTree;
$('#treenotes').onclick=async e=>{const b=e.target.closest('.tdel');if(!b)return;if(!confirm('Delete your note?'))return;try{await delNote(b.dataset.id);toast('Note removed');loadTree(true);}catch(err){toast(err.message);}};
$('#treeform').onsubmit=async e=>{e.preventDefault();const btn=$('#tsubmit');const text=$('#ttext').value.trim();
 if(text.length<2)return toast('Write a few words first');btn.disabled=true;btn.textContent='Hanging your note…';
 try{await post({kind:'tree',text,name:$('#tname').value,anonymous:$('#tanon').checked,photos:tree.photos,website:$('#thp').value,t:tree.t0});
  $('#ttext').value='';tree.photos.length=0;drawTP();$('#tcount').textContent=`0/${MAXT}`;toast('Your note is on the tree 🍃');loadTree(true);}
 catch(err){toast(err.message);}finally{btn.disabled=false;btn.textContent='Hang it on the tree';}};
if(location.hash==='#tree')loadTree();
})();
