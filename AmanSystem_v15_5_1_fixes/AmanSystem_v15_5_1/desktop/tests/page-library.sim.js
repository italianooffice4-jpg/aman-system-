// محاكاة سكربت الواجهة aman-v12-library.js مع desk وهمي (addDocs/dbx/نسخ البيانات). التشغيل: node tests/page-library.sim.js
const fs=require('fs'),vm=require('vm'),os=require('os'),path=require('path');
const {Library}=require('../library.js');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sim-'));const lib=new Library(dir);
const store={};const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},get length(){return Object.keys(store).length},key:i=>Object.keys(store)[i]};
class Storage{} ;Storage.prototype.setItem=function(k,v){store[k]=String(v)};Storage.prototype.removeItem=function(k){delete store[k]};
// make localStorage an instance of Storage so `this===localStorage`
const ls=Object.create(Storage.prototype);Object.defineProperty(ls,'length',{get:()=>Object.keys(store).length});ls.getItem=k=>k in store?store[k]:null;ls.key=i=>Object.keys(store)[i];
const desk={libInfo:async()=>({on:true,dir}),libStats:async()=>({ok:true,dir,...lib.stats()}),libSave:async o=>lib.save(o),libGet:async id=>lib.get(id),libDelete:async id=>lib.remove(id),libOpenFolder:async()=>{},libChoose:async()=>({cancel:1}),libSaveData:async j=>lib.writeData(j),libLoadData:async()=>lib.readData(),libSnapshot:async()=>({ok:true,path:'x'})};
const idb={};
const ctx={window:{},desk,Storage,localStorage:ls,document:{addEventListener(){},getElementById(){return null}},setTimeout,clearTimeout,console,Buffer,
 toast:m=>console.log('TOAST:',m),uid:()=>Math.random().toString(36).slice(2,9),rd:async f=>'data:'+f.type+';base64,'+Buffer.from(f.content).toString('base64'),
 cn:id=>({c1:'شركة النور'})[id],CS:()=>[],S:{emps:[]},R:{set:()=>'<div></div>'},ic:()=>'',esc:s=>s,ask:()=>{},save:()=>{},location:{reload(){}},
 addDocs:async()=>{throw new Error('orig addDocs should not run')},dbx:async(m,a)=>{if(m==='put'){idb[a.id]=a;return a.id}if(m==='get')return idb[a];if(m==='delete'){delete idb[a]}}};
ctx.window=ctx;vm.createContext(ctx);
// run in same global scope: functions assigned as globals
vm.runInContext(`var addDocs=addDocs,dbx=dbx;`+fs.readFileSync(require('path').join(__dirname,'..','src','merge','aman-v12-library.js'),'utf8'),ctx);
(async()=>{
  const e={id:'e1',name:'أحمد حسن',nid:'29501010101010',cid:'c1',docs:[]};
  await ctx.addDocs(e,[{name:'عقد.pdf',type:'application/pdf',size:10,content:'PDFBYTES'}],'عقد');
  console.log('meta:',JSON.stringify(e.docs[0]));
  const rec=await ctx.dbx('get',e.docs[0].id);console.log('get via dbx:',rec.name,rec.type,Buffer.from(rec.data.split(',')[1],'base64').toString());
  await ctx.dbx('delete',e.docs[0].id);console.log('after delete get:',await ctx.dbx('get',e.docs[0].id));
  console.log('trash files:',fs.readdirSync(path.join(dir,'_المحذوفات')).length);
  ls.setItem('ins_sys_v1','{"emps":[1]}');await new Promise(r=>setTimeout(r,1800));
  console.log('mirror:',lib.readData());
  console.log(require('child_process').execSync('find "'+dir+'" -type f | sed "s#'+dir+'##"').toString());
  process.exit(0);
})();
