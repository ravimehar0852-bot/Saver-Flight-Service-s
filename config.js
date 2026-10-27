/* Saver Flight Service - site settings. Edit the values below. */
const CFG={
  name:"Saver Flight Service's",
  phone:"+91 87696 99454",
  phoneRaw:"918769699454",
  address:"Jaipur, Rajasthan",
  email:"saverflightservice@gmail.com",
  hours:"9:00 AM to 6:00 PM",
  insta:"saver_flight_service",
  /* UPI for advance payment: put the real UPI ID here */
  upi:"PASTE-UPI-ID@bank",
  upiName:"Saver Flight Service",
  advance:500,
  routes:[
    {name:"Flight ticket booking",price:0},
    {name:"Hotel booking",price:0},
    {name:"Rajasthan Land Package (6N/7D)",price:24999},
    {name:"Goa Tour Package (3N/4D)",price:14500},
    {name:"Other Pan India or international package",price:0}
  ],
  /* Admin password is stored as a SHA-256 hash, not as plain text */
  adminHash:"a6a4356108a0df51a5a7b34529edb80a7794f20d6d403522adb8d99de6bf1d2d",
  /* Firebase: fill projectId and apiKey (Project settings > Your apps > Web app), and adminEmail (the admin user you create in Firebase Authentication). If empty, bookings are saved in this browser only. */
  adminEmail:"",
  firebase:{projectId:"",apiKey:""}
};

/* Storage helper used by app.js and admin.js (Firestore REST + Firebase Auth for admin) */
const DB=(function(){
  const LS="saver_bookings", AK="saver_admin_auth", fb=CFG.firebase, on=!!(fb.projectId&&fb.apiKey);
  const base=on?"https://firestore.googleapis.com/v1/projects/"+fb.projectId+"/databases/(default)/documents/bookings":"";
  let tok="";
  const hd=()=>{const h={"Content-Type":"application/json"};if(tok)h.Authorization="Bearer "+tok;return h};
  const toFS=o=>{const f={};for(const k in o){const v=o[k];f[k]=typeof v==="number"?{integerValue:String(v)}:{stringValue:String(v==null?"":v)};}return f};
  const fromFS=d=>{const o={};for(const k in d.fields){const v=d.fields[k];o[k]=v.integerValue!==undefined?Number(v.integerValue):(v.stringValue||"");}return o};
  const lsGet=()=>{try{return JSON.parse(localStorage.getItem(LS)||"[]")}catch(e){return[]}};
  const lsSet=a=>{try{localStorage.setItem(LS,JSON.stringify(a))}catch(e){}};
  const keep=j=>{tok=j.idToken||j.id_token;const rt=j.refreshToken||j.refresh_token;try{localStorage.setItem(AK,rt)}catch(e){}};
  return{
    online:on,
    /* admin sign-in with the Firebase Auth user (email + password) */
    async login(pw){
      const r=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key="+fb.apiKey,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:CFG.adminEmail,password:pw,returnSecureToken:true})});
      const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error((j.error&&j.error.message)||"bad login");keep(j)
    },
    /* stay logged in on this device using the saved refresh token */
    async resume(){
      let rt="";try{rt=localStorage.getItem(AK)||""}catch(e){}
      if(!rt)return false;
      const r=await fetch("https://securetoken.googleapis.com/v1/token?key="+fb.apiKey,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=refresh_token&refresh_token="+encodeURIComponent(rt)});
      if(!r.ok)return false;keep(await r.json());return true
    },
    logout(){tok="";try{localStorage.removeItem(AK)}catch(e){}},
    async save(b){
      if(on){const r=await fetch(base+"?documentId="+encodeURIComponent(b.id)+"&key="+fb.apiKey,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fields:toFS(b)})});if(!r.ok)throw new Error("save failed");return b}
      const a=lsGet();a.push(b);lsSet(a);return b
    },
    async list(){
      if(on){const r=await fetch(base+"?pageSize=300&key="+fb.apiKey,{headers:hd()});if(!r.ok)throw new Error("load failed");const j=await r.json();return(j.documents||[]).map(fromFS)}
      return lsGet()
    },
    async update(id,patch){
      if(on){const q=Object.keys(patch).map(k=>"updateMask.fieldPaths="+k).join("&");const r=await fetch(base+"/"+encodeURIComponent(id)+"?"+q+"&key="+fb.apiKey,{method:"PATCH",headers:hd(),body:JSON.stringify({fields:toFS(patch)})});if(!r.ok)throw new Error("update failed");return}
      lsSet(lsGet().map(b=>b.id===id?Object.assign(b,patch):b))
    },
    async remove(id){
      if(on){const r=await fetch(base+"/"+encodeURIComponent(id)+"?key="+fb.apiKey,{method:"DELETE",headers:hd()});if(!r.ok)throw new Error("delete failed");return}
      lsSet(lsGet().filter(b=>b.id!==id))
    }
  };
})();
