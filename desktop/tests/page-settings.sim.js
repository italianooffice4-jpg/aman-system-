// محاكاة بطاقات الإعدادات (المكتبة + الطباعة والمسح) وحفظ الإعدادات. التشغيل: node tests/page-settings.sim.js
const fs=require('fs'),vm=require('vm');
const els={};const document={addEventListener(){},getElementById:id=>els[id]||null};
let saved=null;
const desk={libInfo:async()=>({on:true,dir:'C:/x'}),libStats:async()=>({ok:true,dir:'C:/x',count:1,bytes:10,dataTime:0,snaps:0}),
 printers:async()=>[{name:'HP LaserJet',label:'HP LaserJet',isDefault:true},{name:'PDF',label:'PDF',isDefault:false}],
 scanners:async()=>[{id:'{1}',name:'HP Scan'}],cfgGet:async()=>({print:{},scan:{}}),cfgSet:async p=>{saved=p;return{ok:true}}};
class Storage{};
const ctx={desk,document,Storage,localStorage:Object.create(Storage.prototype),setTimeout,clearTimeout,console,toast:m=>console.log('TOAST',m),esc:s=>String(s),ic:()=>'',
 uid:()=>'x',rd:async()=>'',cn:()=>'',CS:()=>[],S:{emps:[]},R:{set:()=>'<div>SET</div>'},ask(){},save(){},location:{},
 addDocs:async()=>{},dbx:async()=>{}};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext('var addDocs=addDocs,dbx=dbx;'+fs.readFileSync(require('path').join(__dirname,'..','src','merge','aman-v12-library.js'),'utf8'),ctx);
(async()=>{
 const html=ctx.R.set();console.log(html.includes('pccard'),html.includes('libcard'));
 els.pc_body={};await new Promise(r=>setTimeout(r,200));console.log('body len',els.pc_body.innerHTML.length,/HP LaserJet/.test(els.pc_body.innerHTML));
 els.pc_printer={value:'HP LaserJet'};els.pc_paper={value:'A4'};els.pc_duplex={value:'auto'};els.pc_color={value:'color'};els.pc_ask={value:'0'};
 els.pc_scanner={value:'{1}',selectedOptions:[{text:'HP Scan'}]};els.pc_dpi={value:'300'};els.pc_scol={value:'color'};
 await ctx.A12.pcSave();console.log(JSON.stringify(saved));process.exit(0)})();
