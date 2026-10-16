(function(){
const ITEMS=['Colin sighted near Peters campsites?','Bacon reported missing?','Wood left unchopped?','Heard "I learned so much" nearby?','Suspicious lounging in a camp chair during setup?','Last s\'more taken without asking?','Paddle "forgotten" at the put-in?'];
const st=JSON.parse(localStorage.bdColin||'{}');const ul=document.getElementById('clist');if(!ul)return;
document.getElementById('cdate2').textContent=new Date().toLocaleDateString([], {month:'long',day:'numeric',year:'numeric'});
function draw(){ul.innerHTML=ITEMS.map((t,i)=>`<li><span>${t}</span><button type="button" class="yn ${st[i]?'yes':'no'}" data-i="${i}" aria-pressed="${!!st[i]}">${st[i]?'YES':'NO'}</button></li>`).join('');
 const n=ITEMS.filter((_,i)=>st[i]).length,p=Math.round(n/ITEMS.length*100);
 document.getElementById('marc').setAttribute('stroke-dasharray',`${Math.max(p,1)} 100`);
 document.getElementById('needle').style.transform=`rotate(${-90+p*1.8}deg)`;
 const L=p>=80?['COLIN IMMINENT','imm']:p>=50?['HIGH','high']:p>=20?['ELEVATED','elev']:['LOW','low'];
 const m=document.getElementById('mlevel');m.textContent=L[0];m.className='mlevel '+L[1];
 document.getElementById('mpct').textContent=`${n} of ${ITEMS.length} indicators reported · ${p}%`;}
ul.onclick=e=>{const b=e.target.closest('.yn');if(!b)return;st[b.dataset.i]=!st[b.dataset.i];localStorage.bdColin=JSON.stringify(st);draw();};
document.getElementById('creset').onclick=()=>{for(const k in st)delete st[k];localStorage.bdColin='{}';draw();};
draw();
})();
