
(function(){
 const T=new Date(); const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const off=n=>{const d=new Date(T.getFullYear(),T.getMonth(),T.getDate()+n);return iso(d)};
 const yoff=(y,n)=>{const d=new Date(T.getFullYear()-y,T.getMonth(),T.getDate()+n);return d};
 let ser=0; const nid=(d,male)=>{ser++;const c=d.getFullYear()>=2000?'3':'2';const yy=String(d.getFullYear()).slice(-2),mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');const s3=String(100+ser).slice(-3);return c+yy+mm+dd+'01'+s3+(male?'1':'2')+'1'};
 const doc=[{id:'d1',name:'x.pdf',kind:'عقد العمل',type:'application/pdf',size:10}];
 const E=(id,o)=>Object.assign({id,cid:'c1',name:id,code:id,job:'موظف',insno:'1'+id.slice(1),wage:3000,start:'2020-01-01',status:'active',end:'',docs:doc,reqIn:'R'+id,inSt:'بانتظار التأكيد'},o);
 const S={cfg:{emp:11,er:18.75,min:2700,max:16700,retAge:60},companies:[{id:'c1',name:'شركة النيل'},{id:'c2',name:'مصنع الدلتا'}],
  emps:[
   E('e0',{name:'أحمد محمد علي',nid:nid(yoff(36,0),1)}),
   E('e1',{name:'بدون مستندات',docs:[],reqIn:'',start:off(-10),nid:nid(yoff(30,0),1)}),
   E('e2',{name:'رقم قومي ناقص',nid:'123'}),
   E('e3',{name:'سيدة قاربت المعاش',cid:'c2',nid:nid(yoff(55,60),0)}),
   E('e4',{name:'رجل بلغ ستين',nid:nid(yoff(60,-10),1)}),
   E('e5',{name:'مستقيل بلا طلب',status:'resigned',end:off(-20),rtype:'استقالة',docs:[],reqIn:'',nid:nid(yoff(40,0),1)}),
   E('e6',{name:'سيدة بلغت 55',cid:'c2',nid:nid(yoff(55,-5),0)}),
   E('e7',{name:'رجل 56 لم يبلغ',nid:nid(yoff(56,0),1)}),
   E('e8',{name:'منى سعيد',cid:'c2',nid:nid(yoff(33,0),0)})
  ],
  reqs:[{id:'q1',name:'طلب فات موعده',code:'K1',job:'محاسب',hdate:off(-1),cname:'شركة النيل',status:'قيد الانتظار'},{id:'q2',name:'طلب بعيد',code:'K2',job:'سائق',hdate:off(30),cname:'مصنع الدلتا',status:'قيد الانتظار'},{id:'q3',name:'طلب معتمد',code:'K3',job:'عامل',hdate:off(2),cname:'شركة النيل',status:'معتمد'}],
  pay:[],log:[],cars:[
   {id:'k1',plate:'111',type:'ملاكي',licExp:off(5)},{id:'k2',plate:'222',type:'ملاكي',insExp:off(12)},{id:'k3',plate:'333',type:'نقل',inspExp:off(25)},{id:'k4',plate:'444',type:'نقل',licExp:off(-3)}],
  tasks:[{id:'t1',title:'مهمة متأخرة',due:off(-1),time:'10:00',pri:'عادية',rem:'-1',done:false,nf:{}},{id:'t2',title:'مهمة اليوم',due:off(0),time:'23:59',pri:'عادية',rem:'-1',done:false,nf:{}}]};
 S.pay=[{id:'p1',cid:'c1',month:T.getFullYear()+'-'+String(T.getMonth()+1).padStart(2,'0'),rows:[{nid:S.emps[0].nid,code:'e0',name:'أحمد محمد علي',wage:3000,ded:0}]}];
 localStorage.setItem('ins_sys_v1',JSON.stringify(S));
 localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'Tester',name:'Tester',p:'x',r:'admin',role:'admin'}]));
 sessionStorage.setItem('ins_sess','t');
 localStorage.setItem('ins_ui_prefs',JSON.stringify({v:1,dash:{summary:false}}));
})();
