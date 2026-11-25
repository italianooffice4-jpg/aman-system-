# اختبار المرحلة 3 (منطق نموذج الموظف وملفه) على التطبيق الحقيقي في Chromium. التشغيل من مجلد desktop:
#   pip install playwright && playwright install chromium && python3 tests/phase3/run.py
# يختبر ui/src/core/empform.js مباشرة (وحدة JS عادية بلا Vue) ويقارنها بسلوك الدوال القديمة (pd, dmask, chk, editE, calc).
# مكوّنات .vue نفسها (EmpForm/EmpFile) لا تُختبر هنا لأنها تحتاج بناء Vite — انظر PHASE3_NOTES.md.
import http.server, threading, socketserver, os, sys, json, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = 8794
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = bad = 0
def chk(name, cond, extra=''):
    global ok, bad
    if cond: ok += 1; print('✔', name)
    else: bad += 1; print('✘', name, extra)

SEED = r"""
(function(){
 var S={cfg:{emp:11,er:18.75,min:2700,max:16700,retAge:60},companies:[{id:'c1',name:'شركة النيل'},{id:'c2',name:'مصنع الدلتا'},{id:'c3',name:'الإسكندرية للتجارة'}],
  emps:[
   {id:'e0',cid:'c1',name:'أحمد محمد علي',code:'A1',job:'محاسب',insno:'1001',nid:'29001010100012',wage:3000,start:'2020-01-01',status:'active',end:'',docs:[{id:'d1',name:'عقد.pdf',kind:'عقد العمل',type:'application/pdf',size:1200},{id:'d2',name:'بطاقة.jpg',kind:'بطاقة',type:'image/jpeg',size:900}],inSt:'تم التأكيد'},
   {id:'e1',cid:'c2',name:'سمير حسن',code:'S2',job:'عامل',insno:'2002',nid:'29505050200035',wage:2000,start:'2019-03-01',status:'resigned',end:'2023-05-01',rtype:'استقالة',docs:[]},
   {id:'e2',cid:'c1',name:'منى سعيد',code:'M3',job:'سكرتيرة',insno:'',nid:'30001010100011',wage:20000,start:'2024-02-01',status:'active',end:'',docs:[]}
  ],
  reqs:[{id:'q1',name:'خالد إبراهيم',code:'K9',job:'محاسب',hdate:'2026-11-01',cname:'شركة النيل',status:'معتمد'}],pay:[],log:[],cars:[],tasks:[]};
 localStorage.setItem('ins_sys_v1',JSON.stringify(S));
 localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'Tester',name:'Tester',p:'x',r:'admin',role:'admin'}]));
 sessionStorage.setItem('ins_sess','t');
})();
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1360, 'height': 900}, locale='ar-EG'); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text and 'boom' not in m.text else None)  # خطوط Google وملفات OCR المحلية غير موجودة في بيئة الاختبار
    pg.add_init_script("if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');" + SEED.replace('\n', ' ') + "}")
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(1500)
    keys = pg.evaluate("import('/ui/src/core/empform.js').then(m=>{window.EMF=m;return Object.keys(m)})")
    chk('الوحدة تُحمَّل كـ ES module على التطبيق الحقيقي', 'validate' in keys and 'saveEmployee' in keys, keys)

    # ---------- تطابق مع الدوال القديمة ----------
    ins = ['', '2', '25', '250', '2503', '25032', '25032026', '٢٥٠٣٢٠٢٦', '2503202699', '25/03/2026', '25-03-2026', 'ab12']
    old = pg.evaluate("(a)=>a.map(v=>{const el=document.createElement('input');el.value=v;dmask(el);return el.value})", ins)
    new = pg.evaluate("(a)=>a.map(v=>EMF.maskDate(v))", ins)
    chk('maskDate يطابق dmask القديمة', old == new, (old, new))
    ds = ['', '25/03/2026', '٢٥/٠٣/٢٠٢٦', '1/1/2020', '31/02/2020', '29/02/2021', '29/02/2020', '25-03-2026', '25.03.2026', '2026-03-25', 'abc', '25/03/26', ' 05/06/2024 ']
    old = pg.evaluate("(a)=>a.map(v=>pd(v))", ds); new = pg.evaluate("(a)=>a.map(v=>EMF.parseDate(v))", ds)
    chk('parseDate يطابق pd القديمة', old == new, (old, new))

    # ---------- الرقم القومي والحساب ----------
    st = pg.evaluate("[EMF.nidState(''),EMF.nidState('2900'),EMF.nidState('29001010100012'),EMF.nidState('29013010100012'),EMF.nidState('290010101000123'),EMF.nidState('٢٩٠٠١٠١٠١٠٠٠١٢')].map(x=>x.state)")
    chk('حالات الرقم القومي: فارغ/ناقص/سليم/خاطئ/طويل/أرقام عربية', st == ['empty', 'partial', 'ok', 'bad', 'long', 'ok'], st)
    n = pg.evaluate("EMF.nidState('29001010100012')")
    chk('استخراج النوع والميلاد والمحافظة وسن المعاش', n['gender'] == 'ذكر' and n['birth'] == '1990-01-01' and n['gov'] == 'القاهرة' and n['retire'] == '2050-01-01', n)
    chk('النوع: الرقم الثالث عشر زوجي = أنثى', pg.evaluate("EMF.nidState('30001010100022').gender") == 'أنثى')
    cs = pg.evaluate("[EMF.contrib('1000'),EMF.contrib('5000'),EMF.contrib('30000'),EMF.contrib(''),EMF.contrib('-5'),EMF.contrib('٥٠٠٠')]")
    chk('حساب الاشتراك: أقل من الحد الأدنى', cs[0]['base'] == 2700 and cs[0]['capped'] == 'min')
    chk('حساب الاشتراك: عادي يطابق calc', abs(cs[1]['emp'] - 5000 * 0.11) < 1e-9 and abs(cs[1]['er'] - 5000 * 0.1875) < 1e-9 and cs[1]['capped'] == '' and pg.evaluate("calc({wage:5000}).a") == cs[1]['emp'])
    chk('حساب الاشتراك: أعلى من الحد الأقصى', cs[2]['base'] == 16700 and cs[2]['capped'] == 'max')
    chk('حساب الاشتراك: فارغ/سالب = null وأرقام عربية تعمل', cs[3] is None and cs[4] is None and cs[5]['wage'] == 5000)

    # ---------- التحقق وتكرار الموظفين ----------
    V = lambda js: pg.evaluate(js)
    r = V("(()=>{const m=EMF.toModel({},false);m.cid='c1';return EMF.validate(m,{id:'',rs:false,orig:{}})})()")
    chk('نموذج فارغ: مطلوب (الاسم/الرقم القومي/الأجر/تاريخ الالتحاق)', all(k in r['err'] and r['err'][k]['req'] for k in ['name', 'nid', 'wage', 'start']), r)
    base = "const m=EMF.toModel({},false);Object.assign(m,{name:'موظف جديد',cid:'c1',wage:'4000',start:'01/01/2026',nid:%s,insno:%s});"
    r = V("(()=>{" + base % ("'29001010100012'", "''") + "return EMF.validate(m,{id:'',rs:false,orig:{}})})()")
    chk('تكرار الرقم القومي لموظف مؤمن عليه = خطأ بنفس رسالة chk القديمة', r['err'].get('nid', {}).get('m') == "الرقم القومي مسجل بالفعل للموظف المؤمن عليه «أحمد محمد علي»", r)
    legacy = V("chk({nid:'29001010100012',insno:''},true,{})")
    chk('رسالة chk القديمة مطابقة', legacy == "الرقم القومي مسجل بالفعل للموظف المؤمن عليه «أحمد محمد علي»", legacy)
    r = V("(()=>{" + base % ("'29505050200035'", "'2002'") + "return EMF.validate(m,{id:'',rs:false,orig:{}})})()")
    chk('رقم قومي لموظف مستقيل سابقًا: تحذير فقط (لا يمنع)', 'nid' not in r['err'] and 'nid' in r['warn'], r)
    r = V("(()=>{" + base % ("'29505050200035'", "'1001'") + "return EMF.validate(m,{id:'',rs:false,orig:{}})})()")
    chk('تكرار الرقم التأميني لموظف مؤمن عليه = خطأ على خانة الرقم التأميني', 'insno' in r['err'] and 'nid' not in r['err'], r)
    r = V("(()=>{" + base % ("'29505050200035'", "'1001'") + "return EMF.validate(m,{id:'',rs:true,orig:{}})})()")
    chk('موظف مستقيل: التكرار تحذير وليس خطأ (مثل chk القديمة)', 'insno' not in r['err'] and 'insno' in r['warn'], r)
    r = V("(()=>{" + base % ("'1234'", "''") + "return EMF.validate(m,{id:'',rs:false,orig:{}})})()")
    chk('رقم قومي أقل من 14 رقمًا = خطأ', 'nid' in r['err'], r)
    r = V("(()=>{" + base % ("'29013010100012'", "''") + "return EMF.validate(m,{id:'',rs:false,orig:{}})})()")
    chk('14 رقمًا بتركيب خاطئ = تحذير (لا يمنع، كما في القديم)', 'nid' not in r['err'] and 'nid' in r['warn'], r)
    r = V("(()=>{const e=S.emps[0];const m=EMF.toModel(e,false);m.nid='123';return EMF.validate(m,{id:'e0',rs:false,orig:e})})()")
    chk('تعديل الرقم القومي لقيمة قصيرة = خطأ', 'nid' in r['err'], r)
    r = V("(()=>{const e={id:'x',nid:'123',name:'قديم',cid:'c1',wage:3000,start:'2020-01-01'};const m=EMF.toModel(e,false);return EMF.validate(m,{id:'x',rs:false,orig:e})})()")
    chk('رقم قومي قديم غير مكتمل وغير معدَّل = تحذير فقط', 'nid' not in r['err'] and 'nid' in r['warn'], r)
    r = V("(()=>{" + base % ("'29201010100013'", "''") + "m.start='31/02/2026';m.wage='abc';return EMF.validate(m,{id:'',rs:false,orig:{}})})()")
    chk('تاريخ غير صحيح وأجر غير رقمي = أخطاء بجانب الحقلين', 'start' in r['err'] and 'wage' in r['err'], r)
    r = V("(()=>{const e=S.emps[1];const m=EMF.toModel(e,true);m.end='01/01/2018';return EMF.validate(m,{id:'e1',rs:true,orig:e})})()")
    chk('الاستقالة قبل الالتحاق = خطأ على تاريخ الاستقالة', r['err'].get('end', {}).get('m') == 'تاريخ الاستقالة قبل تاريخ الالتحاق', r)

    # ---------- الانتقال بين المنشآت (قاعدة التحقق) ----------
    r = V("(()=>{const e=S.emps[0];const m=EMF.toModel(e,false);m.cid='c2';return [EMF.moveIntent(m,{id:'e0',rs:false,orig:e}),EMF.validate(m,{id:'e0',rs:false,orig:e}).err]})()")
    chk('تغيير الشركة لموظف قائم = نية انتقال بلا أخطاء (التاريخ الافتراضي اليوم)', r[0] is True and not r[1], r)
    r = V("(()=>{const e=S.emps[0];const m=EMF.toModel(e,false);m.cid='c2';m.moveKind='fix';return EMF.moveIntent(m,{id:'e0',rs:false,orig:e})})()")
    chk('«تصحيح شركة بالخطأ» لا يُسجَّل انتقالًا', r is False)
    r = V("(()=>{const e=S.emps[0];const m=EMF.toModel(e,false);m.cid='c2';m.moveDate='99/99/2020';return EMF.validate(m,{id:'e0',rs:false,orig:e}).err})()")
    chk('تاريخ انتقال غير صحيح = خطأ بجانب حقله', 'moveDate' in r, r)

    # ---------- اقتراحات ----------
    s1 = V("EMF.suggestInsNo('29505050200035','',null)")
    chk('اقتراح رقم تأميني من نفس الرقم القومي (ملف سابق)', s1 and s1['value'] == '2002' and not s1['weak'], s1)
    s2 = V("EMF.suggestInsNo('','أحمد محمد علي',null)")
    chk('اقتراح ضعيف من نفس الاسم عند غياب الرقم القومي', s2 and s2['value'] == '1001' and s2['weak'], s2)
    chk('لا اقتراح لشخص جديد تمامًا', V("EMF.suggestInsNo('29201010100013','شخص لا يوجد',null)") is None)
    chk('لا يقترح من ملف الموظف نفسه', V("EMF.suggestInsNo('29001010100012','',  'e0')") is None)
    nm = V("EMF.nameMatches('أحمد',null)")
    chk('إكمال الاسم يجد الموظف', len(nm) == 1 and nm[0]['kind'] == 'emp' and nm[0]['name'] == 'أحمد محمد علي', nm)
    nm = V("EMF.nameMatches('خالد',null)")
    chk('إكمال الاسم يجد طلب الدخول', len(nm) == 1 and nm[0]['kind'] == 'req', nm)
    chk('أقل من حرفين = لا اقتراحات', V("EMF.nameMatches('أ',null)") == [])
    chk('يستثني الموظف نفسه', V("EMF.nameMatches('أحمد','e0')") == [])
    pf = V("EMF.prefillFrom(EMF.nameMatches('خالد',null)[0])")
    chk('نقل بيانات طلب الدخول (الاسم/الكود/الوظيفة/التاريخ/الشركة)', pf == {'name': 'خالد إبراهيم', 'code': 'K9', 'job': 'محاسب', 'start': '01/11/2026', 'cid': 'c1'}, pf)
    pf = V("EMF.prefillFrom(EMF.nameMatches('سمير',null)[0])")
    chk('نقل بيانات موظف سابق: الاسم والرقم القومي والتأميني والوظيفة فقط (بدون أجر/تواريخ)', pf == {'name': 'سمير حسن', 'nid': '29505050200035', 'insno': '2002', 'job': 'عامل'}, pf)

    # ---------- المراجعة قبل الحفظ ----------
    d = V("(()=>{const e=S.emps[0];const m=EMF.toModel(e,false);m.wage='3500';m.job='محاسب أول';m.start='02/01/2020';return EMF.diffModel(e,m,false,false).map(x=>[x.k,x.from,x.to])})()")
    chk('مراجعة التعديلات: الأجر والوظيفة والتاريخ فقط', sorted(d) == sorted([['wage', '3000', '3500'], ['job', 'محاسب', 'محاسب أول'], ['start', '01/01/2020', '02/01/2020']]), d)
    d = V("(()=>{const e=S.emps[0];return EMF.diffModel(e,EMF.toModel(e,false),false,false)})()")
    chk('بدون تغيير = قائمة فارغة', d == [])

    # ---------- الحفظ: مطابقة editE القديمة ----------
    pg.evaluate("S.emps=S.emps.slice(0,3);save()")
    LEG = r"""async()=>{
      editE(); const set=(k,v)=>{const el=$('f_'+k); el.value=v;};
      set('name','محمود فتحي');set('code','C77');set('cid','c2');set('insno','5555');set('job','فني');set('nid','29201010100013');set('wage','4500');set('start','05/03/2026');set('reqIn','R1');set('reqInDate','04/03/2026');set('nat','مصري');set('addr_g','الجيزة');
      $('ok').click(); await new Promise(r=>setTimeout(r,400));
      const e=S.emps[S.emps.length-1]; const o={...e}; delete o.id; delete o._u; return o }"""
    leg = pg.evaluate(LEG)
    pg.evaluate("S.emps=S.emps.slice(0,3);S.log=[];save()")
    NEW = r"""async()=>{
      const m=EMF.toModel({},false);Object.assign(m,{name:'محمود فتحي',code:'C77',cid:'c2',insno:'5555',job:'فني',nid:'29201010100013',wage:'4500',start:'05/03/2026',reqIn:'R1',reqInDate:'04/03/2026',nat:'مصري',addr_g:'الجيزة'});
      const r=await EMF.saveEmployee(m,{id:'',rs:false,files:[]}); save();
      const e=S.emps[S.emps.length-1]; const o={...e}; delete o.id; delete o._u; return [r.ok,o] }"""
    ok2, new_o = pg.evaluate(NEW)
    chk('حفظ موظف جديد ينتج نفس كائن editE القديمة تمامًا', ok2 and new_o == leg, (leg, new_o))
    chk('سجل العمليات: «إضافة موظف» مع معرّف الموظف', pg.evaluate("S.log[0].a=='إضافة موظف'&&S.log[0].eid==S.emps[3].id"))
    # تكرار عند الحفظ: يرفض ولا يضيف
    r = pg.evaluate("""async()=>{const m=EMF.toModel({},false);Object.assign(m,{name:'مكرر',cid:'c1',nid:'29001010100012',wage:'3000',start:'01/01/2026'});const n=S.emps.length;const r=await EMF.saveEmployee(m,{id:'',rs:false,files:[]});return [r.ok,r.field,r.err,S.emps.length-n]}""")
    chk('الحفظ يرفض التكرار برسالة chk ويحدد الحقل ولا يضيف شيئًا', r[0] is False and r[1] == 'nid' and r[3] == 0, r)
    # تعديل موظف + نقل + تصحيح
    r = pg.evaluate("""async()=>{const e=S.emps[0];const m=EMF.toModel(e,false);m.cid='c3';m.moveDate='15/06/2025';m.moveNote='نقل إداري';m.wage='3300';
      const r=await EMF.saveEmployee(m,{id:'e0',rs:false,files:[]});return [r.ok,r.moved,e.cid,e.wage,e.moves.length,e.moves[0].date,e.moves[0].fromName,e.moves[0].toName,e.moves[0].note,S.log[0].a]}""")
    chk('تعديل + تغيير شركة = تسجيل انتقال بتاريخه وملاحظته وسجل عمليات', r == [True, True, 'c3', 3300, 1, '2025-06-15', 'شركة النيل', 'الإسكندرية للتجارة', 'نقل إداري', 'تعديل موظف'], r)
    r = pg.evaluate("""async()=>{const e=S.emps[0];const m=EMF.toModel(e,false);m.cid='c1';m.moveKind='fix';const r=await EMF.saveEmployee(m,{id:'e0',rs:false,files:[]});return [r.moved,e.cid,e.moves.length]}""")
    chk('«تصحيح» يغيّر الشركة بدون إضافة انتقال', r == [False, 'c1', 1], r)
    # حذف مستند + طلب دخول
    r = pg.evaluate("""async()=>{const e=S.emps[0];const m=EMF.toModel(e,false);const r=await EMF.saveEmployee(m,{id:'e0',rs:false,files:[],removeDocs:new Set(['d2'])});return [e.docs.map(d=>d.id),S.log.slice(0,2).map(l=>l.a)]}""")
    chk('حذف مستند محدد عند الحفظ (ويُسجَّل في السجل)', r == [['d1'], ['تعديل موظف', 'حذف مستند']], r)
    r = pg.evaluate("""async()=>{const m=EMF.toModel({},false);Object.assign(m,{name:'خالد إبراهيم',cid:'c1',nid:'29301010100014',wage:'5000',start:'01/11/2026'});const r=await EMF.saveEmployee(m,{id:'',rs:false,files:[],reqId:'q1'});return [r.ok,S.reqs.length,S.log[0].a]}""")
    chk('التسجيل من طلب دخول يحذف الطلب ويسجّل العملية', r == [True, 0, 'تسجيل موظف من طلب دخول'], r)

    # ---------- الانتقال من شاشة الملف ----------
    r = pg.evaluate("""[EMF.transferEmp(null,'c2','',''),EMF.transferEmp(S.emps[0],'','',''),EMF.transferEmp(S.emps[0],'c1','',''),EMF.transferEmp(S.emps[0],'c2','31/02/2020',''),EMF.transferEmp(S.emps[0],'c2','01/01/2000',''),EMF.transferEmp(S.emps[1],'c1','','')].map(x=>x.ok)""")
    chk('رفض الانتقال: بلا موظف/بلا شركة/نفس الشركة/تاريخ خاطئ/قبل الالتحاق/موظف مستقيل', r == [False] * 6, r)
    r = pg.evaluate("""(()=>{const e=S.emps[0];const n=e.moves.length;const r=EMF.transferEmp(e,'c2','10/10/2026','ملاحظة');return [r.ok,e.cid,e.moves.length-n,e.moves[e.moves.length-1].date,S.log[0].a]})()""")
    chk('انتقال ناجح من شاشة الملف', r == [True, 'c2', 1, '2026-10-10', 'نقل موظف'], r)

    # ---------- الملاحظات ----------
    r = pg.evaluate("""(()=>{const e=S.emps[0];const a=EMF.addNote(e,'  أولى  ',false),b=EMF.addNote(e,'ثانية',true),c=EMF.addNote(e,'',false);
      const order=EMF.notesOf(e,false).map(n=>n.text);
      EMF.pinNote(e,a.note.id,true);const o2=EMF.notesOf(e,false).map(n=>n.pin);
      EMF.archiveNote(e,b.note.id);const act=EMF.notesOf(e,false).length,arc=EMF.notesOf(e,true).length,pinAfter=e.notes.find(n=>n.id==b.note.id).pin;
      const delActive=EMF.deleteNote(e,a.note.id);EMF.restoreNote(e,b.note.id);const delArch=(EMF.archiveNote(e,b.note.id),EMF.deleteNote(e,b.note.id));
      return [a.ok,b.ok,c.ok,order,o2,act,arc,pinAfter,delActive,delArch,e.notes.length,a.note.u]})()""")
    chk('الملاحظات: إضافة/تثبيت أولًا/أرشفة تلغي التثبيت/حذف نهائي للمؤرشف فقط', r == [True, True, False, ['ثانية', 'أولى'], [True, True], 1, 1, False, False, True, 1, 'Tester'], r)

    # ---------- الخط الزمني ----------
    r = pg.evaluate("""(()=>{const e=S.emps[0];EMF.addNote(e,'ملاحظة للخط الزمني',true);const tl=EMF.buildTimeline(e);
      return [tl.map(x=>x.type),tl.some(x=>x.title=='تاريخ الالتحاق'),tl.filter(x=>x.type=='move').length,tl.filter(x=>x.type=='note').length,tl.some(x=>x.title=='نقل موظف'),tl.some(x=>x.title=='إضافة ملاحظة'),tl.every((x,i)=>i==0||tl[i-1].ts>=x.ts)]})()""")
    chk('الخط الزمني: التحاق + انتقالات + ملاحظات، بلا تكرار من السجل، ومرتّب تنازليًا', r[1] and r[2] == 2 and r[3] == 2 and not r[4] and not r[5] and r[6], r)
    chk('الخط الزمني يتضمن أحداث السجل (تعديل)', 'edit' in r[0], r[0])


    # ---------- تغليف editE / regQ / prof (src/merge/aman-v13-ui.js) ----------
    chk('الحزمة القديمة بلا openEmpForm ⇒ editE القديمة تعمل (نافذة #modal)', pg.evaluate("(()=>{editE('e0');const ok=document.getElementById('modal').classList.contains('on')&&!!$('f_nid');closeM();return ok})()"))
    chk('prof القديمة تعمل عند غياب الحزمة', pg.evaluate("(()=>{prof('e0');const ok=document.getElementById('modal').classList.contains('on');closeM();return ok})()"))
    pg.evaluate("window.__c=[];window.AmanUI=Object.assign(window.AmanUI||{},{hostReady:()=>true,openEmpForm:(id,o)=>__c.push(['form',id,o]),openEmpFile:(id)=>__c.push(['file',id])})")
    pg.evaluate("editE('e0');editE();regQ('q9');prof('e0');prof('nope')")
    c = pg.evaluate("__c")
    chk('الحزمة جاهزة ⇒ editE/regQ/prof تذهب للواجهة الجديدة', c[:4] == [['form', 'e0', None], ['form', '', None], ['form', '', {'reqId': 'q9'}], ['file', 'e0']], c)
    chk('prof لموظف غير موجود ⇒ يرجع للقديمة (لا يُرسل للجديدة)', len(c) == 4)
    pg.evaluate("closeM();localStorage.setItem('ins_ui_form','0');window.__c=[];editE('e0')")
    chk('ins_ui_form=0 ⇒ الشكل القديم', pg.evaluate("__c.length==0&&document.getElementById('modal').classList.contains('on')"))
    pg.evaluate("closeM();localStorage.removeItem('ins_ui_form');AmanUI.openEmpForm=()=>{throw new Error('boom')};editE('e0')")
    chk('خطأ في الواجهة الجديدة ⇒ يرجع للنموذج القديم تلقائيًا', pg.evaluate("document.getElementById('modal').classList.contains('on')&&!!$('f_nid')"))
    pg.evaluate("closeM()")

    # ---------- لا أخطاء في الصفحة ----------
    chk('لا أخطاء JS في الصفحة أثناء الاختبار', not errs, errs)
    b.close()
print(f'\n{ok} نجح • {bad} فشل')
sys.exit(1 if bad else 0)
