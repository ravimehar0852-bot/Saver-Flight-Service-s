/* Saver Flight Service - admin dashboard */
(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY="saver_admin_ok";
let all=[];
async function sha(p){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("saver:"+p));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function show(on){$("#login").hidden=on;$("#dash").hidden=!on;if(on)load()}
if(DB.online){DB.resume().then(ok=>{if(ok)show(true)}).catch(()=>{})}
else{try{if(localStorage.getItem(KEY)===CFG.adminHash)show(true)}catch(e){}}
$("#lf").addEventListener("submit",async e=>{
  e.preventDefault();$("#lerr").textContent="";
  if(DB.online){
    try{await DB.login($("#pw").value)}catch(x){
      const m=String(x.message||"");
      $("#lerr").textContent=/INVALID_LOGIN|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(m)?"Wrong email or password, or the admin user is not created in Firebase Authentication":/OPERATION_NOT_ALLOWED/.test(m)?"Enable Email/Password in Firebase Authentication":/API_KEY|REFERER|BLOCKED/.test(m)?"Firebase API key problem: "+m:/TOO_MANY/.test(m)?"Too many attempts. Try again later":"Login failed: "+m;
      return}
    $("#pw").value="";show(true);return;
  }
  if(!(window.crypto&&crypto.subtle)){$("#lerr").textContent="Open the site on https to log in.";return}
  const h=await sha($("#pw").value);
  if(h!==CFG.adminHash){$("#lerr").textContent="Wrong password";return}
  try{localStorage.setItem(KEY,h)}catch(x){}
  $("#pw").value="";show(true);
});
$("#lo").addEventListener("click",()=>{try{localStorage.removeItem(KEY)}catch(e){}DB.logout();show(false)});
$("#rf").addEventListener("click",load);
["q","fs","fp"].forEach(i=>$("#"+i).addEventListener("input",render));

async function load(){
  try{all=await DB.list()}catch(e){all=[];alert("Could not load bookings. Check Firebase settings and log in again.")}
  all.sort((a,b)=>String(b.created).localeCompare(String(a.created)));
  render();
}
function render(){
  const q=$("#q").value.toLowerCase(),fs=$("#fs").value,fp=$("#fp").value;
  const rows=all.filter(b=>(!fs||b.status===fs)&&(!fp||b.pay===fp)&&(!q||[b.name,b.phone,b.trip,b.id].join(" ").toLowerCase().includes(q)));
  const ver=all.filter(b=>b.pay==="Verified").reduce((s,b)=>s+Number(b.advance||0),0);
  $("#stats").innerHTML=[["Total bookings",all.length],["New",all.filter(b=>b.status==="New").length],["Confirmed",all.filter(b=>b.status==="Confirmed").length],["Payments to verify",all.filter(b=>b.pay==="Submitted").length],["Advance verified","₹"+ver.toLocaleString("en-IN")]].map(s=>'<div class="stat"><b>'+s[1]+'</b><span>'+s[0]+'</span></div>').join("");
  const opt=(a,v)=>a.map(x=>'<option'+(x===v?' selected':'')+'>'+x+'</option>').join("");
  $("#rows").innerHTML=rows.length?rows.map(b=>'<tr data-id="'+esc(b.id)+'"><td>'+esc(String(b.created).slice(0,10))+'</td><td>'+esc(b.id)+'</td><td>'+esc(b.name)+'<br><a href="tel:+91'+esc(b.phone)+'">'+esc(b.phone)+'</a></td><td>'+esc(b.trip)+'</td><td>'+esc(b.n)+'</td><td>'+esc(b.date||"-")+'</td><td>₹'+esc(b.advance)+'</td><td>'+esc(b.utr||"-")+'</td>'+
    '<td><select data-k="pay">'+opt(["Unpaid","Submitted","Verified","Pay later","Paid"],b.pay)+'</select></td><td><select data-k="status">'+opt(["New","Confirmed","Cancelled"],b.status)+'</select></td><td><button class="xs" data-del="1">Delete</button></td></tr>').join(""):'<tr><td colspan="11">No bookings yet.</td></tr>';
  const c={};all.forEach(b=>c[b.trip]=(c[b.trip]||0)+1);
  const m=Math.max(1,...Object.values(c));
  $("#tops").innerHTML=Object.keys(c).sort((a,b)=>c[b]-c[a]).map(k=>'<p style="margin-top:.8rem">'+esc(k)+' <b>'+c[k]+'</b></p><div class="bar2" style="width:'+Math.round(c[k]/m*100)+'%"></div>').join("")||"<p>No data yet.</p>";
}
$("#rows").addEventListener("change",async e=>{
  const t=e.target,tr=t.closest("tr");if(!t.dataset.k||!tr)return;
  const p={};p[t.dataset.k]=t.value;
  try{await DB.update(tr.dataset.id,p);const b=all.find(x=>x.id===tr.dataset.id);if(b)b[t.dataset.k]=t.value;render()}catch(x){alert("Could not save the change")}
});
$("#rows").addEventListener("click",async e=>{
  if(!e.target.dataset.del)return;const id=e.target.closest("tr").dataset.id;
  if(!confirm("Delete this booking?"))return;
  try{await DB.remove(id);all=all.filter(b=>b.id!==id);render()}catch(x){alert("Could not delete")}
});
$("#csv").addEventListener("click",()=>{
  const cols=["created","id","name","phone","trip","n","date","advance","utr","pay","status","note"];
  const cell=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';
  const csv=[cols.join(",")].concat(all.map(b=>cols.map(c=>cell(b[c])).join(","))).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="bookings.csv";a.click();
});
})();
