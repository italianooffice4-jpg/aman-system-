# اختبار المرحلة 4 على التطبيق الحقيقي في Chromium (بعد npm run ui:build). التشغيل من مجلد desktop:
#   pip install playwright && playwright install chromium && python3 tests/phase4/run.py
# يغطي: إصلاح البحث/الفلترة في صفحة الموظفين (يرسم Vue فعليًا)، ومحرك التنبيهات 53–61، وصفحات Vue الجديدة وKanban الطلبات.
import http.server, threading, socketserver, os, sys, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = 8795
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
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1360, 'height': 900}, locale='ar-EG'); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.add_init_script("if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');" + SEED.replace('\n', ' ') + "}")
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(1800)
    V = lambda js: pg.evaluate(js)
    chk('حزمة Vue محمّلة والمضيف جاهز', V("!!window.AmanUI && AmanUI.hostReady()"))

    # ---------- إصلاح: البحث والفلترة في شاشة الموظفين تُنفَّذ فورًا بدون مغادرة الشاشة ----------
    V("go('emp')"); pg.wait_for_timeout(700)
    rows = lambda: pg.locator('.aman-ui table tbody tr:not(.p-datatable-empty-message)').count()
    n0 = rows()
    chk('صفحة الموظفين تُرسم بـ Vue وفيها كل الموظفين', n0 == 9, n0)
    pg.locator('.at-sb input').fill('منى'); pg.wait_for_timeout(500)
    chk('البحث بالاسم يُطبَّق فورًا (صف واحد)', rows() == 1, rows())
    pg.locator('.at-sb input').fill(''); pg.wait_for_timeout(500)
    chk('مسح البحث يعيد كل الصفوف فورًا', rows() == n0, rows())
    pg.locator('.at-sb input').fill('رقم قومي ناقص'); pg.wait_for_timeout(500)
    chk('بحث ثانٍ يُطبَّق أيضًا', rows() == 1, rows())
    pg.locator('.at-sb input').fill(''); pg.wait_for_timeout(400)
    # فلتر الحالة (PrimeVue Select)
    pg.locator('.tb .p-select').nth(1).click(); pg.wait_for_timeout(250)
    pg.get_by_role('option', name='مستقيل').click(); pg.wait_for_timeout(450)
    chk('فلتر الحالة «مستقيل» يُطبَّق فورًا', rows() == 1, rows())
    pg.locator('.tb .p-select').nth(1).click(); pg.wait_for_timeout(250)
    pg.get_by_role('option', name='مؤمن عليه').click(); pg.wait_for_timeout(450)
    chk('فلتر الحالة «مؤمن عليه» يُطبَّق فورًا', rows() == 8, rows())
    pg.locator('.tb .p-select').nth(0).click(); pg.wait_for_timeout(250)
    pg.get_by_role('option', name='مصنع الدلتا').click(); pg.wait_for_timeout(450)
    chk('فلتر الشركة مع الحالة (مركّب) يُطبَّق فورًا', rows() == 3, rows())
    pg.locator('.chips2 button').nth(1).click(); pg.wait_for_timeout(400)
    chk('شريحة «بانتظار التأكيد» تُطبَّق فورًا مع الفلاتر الأخرى', rows() == 3, rows())
    pg.locator('.chips2 button').nth(2).click(); pg.wait_for_timeout(400)
    chk('شريحة «تم التأكيد» تُطبَّق فورًا (لا أحد)', rows() == 0, rows())
    pg.locator('.chips2 button').nth(0).click(); pg.wait_for_timeout(300)

    # ---------- محرك التنبيهات ----------
    A = V("alerts().map(a=>({k:a.k||'',s:a.s,t:a.t,g:a.g,x:a.x||'',id:a.id||'',rec:a.rec||'',cf:a.cf,month:a.month||''}))")
    K = {a['k']: a for a in A if a['k']}
    chk('53: تنبيه 7 أيام/منتهٍ مجمَّع (سيارتان)', 'doc7' in K and K['doc7']['t'].startswith('٢') , K.get('doc7'))
    chk('53: تنبيه 15 يومًا لسيارة واحدة باسم المستند واللوحة', 'doc15' in K and '222' in K['doc15']['t'] and 'التأمين' in K['doc15']['t'], K.get('doc15'))
    chk('53: تنبيه 30 يومًا', 'doc30' in K and '333' in K['doc30']['t'], K.get('doc30'))
    chk('53: التنبيهان القديمان المجمَّعان للسيارات اختفيا', not any('ترخيص أو تأمين أو فحص' in a['t'] or 'خلال 30 يومًا' in a['t'] and not a['k'] for a in A), [a['t'] for a in A if a['g']=='cars'])
    ids = lambda k: V("S.emps.filter(XF2['%s']).map(e=>e.id).sort()" % k)
    chk('54: مستندات ناقصة = مؤمن عليه بلا مستند + مستقيل بلا مستند استقالة', ids('nodocs') == ['e1', 'e5'], ids('nodocs'))
    chk('55: مستقيل بلا طلب خروج', ids('noout') == ['e5'], ids('noout'))
    chk('56: بيانات ناقصة (رقم قومي غير مكتمل/بلا تاريخ التحاق)', ids('inc') == ['e2'], ids('inc'))
    chk('60: بلغ سن المعاش: رجل 60 وسيدة 55 (ولا يشمل رجلًا عمره 56)', ids('retnow') == ['e4', 'e6'], ids('retnow'))
    chk('60: المقبلون على سن المعاش خلال 6 أشهر: السيدة فقط', ids('retsoon') == ['e3'], ids('retsoon'))
    chk('61: طلب التحاق لم يُقدَّم بعد المهلة (7 أيام)', ids('latein') == ['e1'], ids('latein'))
    chk('61: طلبات دخول موعد تعيينها قريب/فات (طلب فات واحد + معتمد لا يُحسب)', 'reqdue' in K and 'طلب فات موعده' in K['reqdue']['t'], K.get('reqdue'))
    chk('57: اختلاف الكشوف عن البرنامج (آخر شهر مرفوع)', 'recon' in K and K['recon']['g'] == 'rec' and K['recon']['month'] != '', K.get('recon'))
    chk('58: مهمة متأخرة ومهمة اليوم', 'tasks' in K and any('مهمة متأخرة' in a['t'] for a in A) and any('مهمة اليوم' in a['t'] for a in A))
    chk('تنبيهات السجل الواحد تحمل رقم السجل (59)', K['latein']['rec'] == 'emp' and K['latein']['id'] == 'e1', K['latein'])
    chk('الترتيب بالخطورة: الأحمر أولًا', [a['s'] for a in A] == sorted([a['s'] for a in A], key=lambda s: 'rwi'.index(s)), [a['s'] for a in A])

    # 59: زر التنبيه يفتح السجل المطلوب
    V("window.__p=null;window.__prof=window.prof;window.prof=function(id){window.__p=id}")
    i = V("AL=alerts();AL.findIndex(a=>a.k=='latein')"); V("aGo(%d)" % i)
    chk('59: تنبيه سجل واحد يفتح ملف الموظف مباشرة', V("window.__p") == 'e1', V("window.__p"))
    V("window.prof=window.__prof")
    i = V("AL=alerts();AL.findIndex(a=>a.k=='retnow')"); V("aGo(%d)" % i); pg.wait_for_timeout(500)
    chk('59: تنبيه عدة سجلات يفتح القائمة مصفّاة (صفحة الموظفين + مرشح)', V("cur=='emp' && flt.x=='retnow'") and rows() == 2, (V("cur"), V("flt.x"), rows()))
    i = V("AL=alerts();AL.findIndex(a=>a.k=='recon')"); V("aGo(%d)" % i); pg.wait_for_timeout(300)
    chk('59: تنبيه الكشوف يفتح مطابقة الشهر', V("cur=='rec' && RC==alerts().find(a=>a.k=='recon').month"), V("[cur,RC]"))
    i = V("AL=alerts();AL.findIndex(a=>a.k=='doc7')"); V("aGo(%d)" % i); pg.wait_for_timeout(300)
    chk('59: تنبيه السيارات يفتح صفحة السيارات بمرشح «منتهية»', V("cur=='cars' && cf=='r'"), V("[cur,cf]"))
    # الجرس
    V("go('dash')"); pg.wait_for_timeout(500)
    pg.locator('#bell').click(); pg.wait_for_timeout(400)
    chk('الجرس يعرض التنبيهات الجديدة بزر الإجراء', pg.locator('.at-bell .al').count() >= 8 and pg.locator('.at-bell .al .at-go').count() >= 8, pg.locator('.at-bell .al').count())
    pg.locator('.at-bell .al', has_text='لم يُسجَّل له طلب التحاق').click(); pg.wait_for_timeout(600)
    chk('الضغط على تنبيه في الجرس يفتح ملف الموظف (Vue)', pg.locator('text=بدون مستندات').count() >= 1 and V("cur") == 'dash', V("cur"))
    # إيقاف نوع تنبيه
    V("AmanCore.prefs.setPrefs({alerts:{fileDays:7,retDays:180,off:['inc']}})")
    chk('إيقاف نوع تنبيه (56) من الإعدادات يخفيه', not V("alerts().some(a=>a.k=='inc')"))
    V("AmanCore.prefs.setPrefs({alerts:{fileDays:30,retDays:180,off:[]}})")
    chk('مهلة التقديم 30 يومًا تلغي تنبيه الالتحاق المتأخر (التحاقه منذ 10 أيام)', not V("alerts().some(a=>a.k=='latein')"))
    V("AmanCore.prefs.setPrefs({alerts:{fileDays:7,retDays:180,off:[]}})")
    # الأداء
    t = V("(()=>{const o=S.emps.slice();for(let i=0;i<4000;i++)S.emps.push({...o[i%o.length],id:'x'+i,nid:String(29001010100000+i)});const t0=performance.now();for(let i=0;i<5;i++)alerts();const dt=(performance.now()-t0)/5;S.emps=o;return dt})()")
    chk('الأداء: alerts() مع 4000 موظف أقل من 400ms للاستدعاء', t < 400, t)


    # ---------- Kanban المتابعة (50): المنطق ----------
    V("import('/ui/src/core/filings.js').then(m=>{window.FL=m})"); pg.wait_for_timeout(300)
    st = lambda id, k='in': V("FL.stateOf(S.emps.find(e=>e.id=='%s'),'%s')" % (id, k))
    chk('50: الحالات المشتقة: مسودة/قُدِّم', st('e1') == 'draft' and st('e0') == 'submitted')
    r = V("FL.move('e1','in','submitted')"); chk('50: الخروج من المسودة بلا رقم طلب مرفوض ويطلب الرقم', not r['ok'] and r.get('need') == 'num', r)
    r = V("FL.move('e1','in','submitted',{num:'N1',date:'31/02/2026'})"); chk('50: تاريخ غير صحيح مرفوض', not r['ok'] and r.get('need') == 'date', r)
    nl = V("S.log.length")
    r = V("FL.move('e1','in','submitted',{num:'N1',date:'05/03/2026'})")
    e1 = V("(({reqIn,reqInDate,inSt})=>({reqIn,reqInDate,inSt}))(S.emps.find(e=>e.id=='e1'))")
    chk('50: نقل مسودة ← قُدِّم يكتب رقم وتاريخ الطلب ولا يؤكّد', r['ok'] and e1 == {'reqIn': 'N1', 'reqInDate': '2026-03-05', 'inSt': 'بانتظار التأكيد'}, (r, e1))
    chk('50: النقل يُسجَّل في سجل العمليات', V("S.log.length") == nl + 1 and 'قُدِّم' in V("S.log[0].d"))
    r = V("FL.move('e1','in','confirmed')"); e1 = V("(({inSt,inDt})=>({inSt,inDt}))(S.emps.find(e=>e.id=='e1'))")
    chk('50: قُدِّم ← مؤكَّد يضبط رسالة التأكيد وتاريخها (نفس حقول صفحة الموظفين)', r['ok'] and e1['inSt'] == 'تم التأكيد' and e1['inDt'] == V("today()"), e1)
    r = V("FL.move('e1','in','draft')"); chk('50: الرجوع إلى مسودة مرفوض (لا يُفقد رقم الطلب)', not r['ok'] and V("S.emps.find(e=>e.id=='e1').reqIn") == 'N1', r)
    r = V("FL.move('e1','in','submitted')"); chk('50: مؤكَّد ← قُدِّم يلغي التأكيد', r['ok'] and st('e1') == 'submitted' and V("S.emps.find(e=>e.id=='e1').inDt") == '')
    chk('50: طلبات الخروج للمستقيلين فقط ومسودة لو بلا رقم', st('e5', 'out') == 'draft' and not V("FL.inScope(S.emps.find(e=>e.id=='e0'),'out')"))
    r = V("FL.move('e5','out','confirmed',{num:'X9'})"); chk('50: خروج: مسودة ← مؤكَّد مباشرة مع رقم الطلب', r['ok'] and V("S.emps.find(e=>e.id=='e5').reqOut") == 'X9' and st('e5', 'out') == 'confirmed')
    bd = V("FL.board('in',{})"); chk('50: اللوحة تُخفي المؤكَّد القديم (بلا تاريخ تأكيد حديث) وتعدّه في الإجمالي', bd['total']['confirmed'] == 0 and len(bd['cols']['submitted']) >= 7, bd['total'])

    # ---------- صفحات Vue الجديدة ----------
    pg.reload(); pg.wait_for_timeout(1500)   # يغلق ملف الموظف المفتوح من اختبار الجرس
    V("import('/ui/src/core/filings.js').then(m=>{window.FL=m})")
    V("go('comp')"); pg.wait_for_timeout(700)
    cards = lambda: pg.locator('.grid.k3 > .card').count()
    chk('13: صفحة الشركات تُرسم بـ Vue (بطاقتان)', cards() == 2 and V("!!document.getElementById('vue-comp')"), cards())
    pg.locator('.at-sb input').fill('الدلتا'); pg.wait_for_timeout(500)
    chk('13: بحث الشركات فوري', cards() == 1, cards())
    pg.locator('.at-sb input').blur(); pg.wait_for_timeout(300)
    pg.locator('.grid.k3 > .card button', has_text='الموظفون').click(timeout=5000); pg.wait_for_timeout(700)
    chk('13: زر «الموظفون» ينقل لقائمة الشركة', V("cur=='emp' && flt.c=='c2'") and rows() == 3, (V("cur"), rows()))
    V("go('fin')"); pg.wait_for_timeout(700)
    frows = lambda: pg.locator('.aman-ui table tbody tr:not(.p-datatable-empty-message)').count()
    chk('13: التقارير المالية بـ Vue: صفّان للشركتين وأربع بطاقات', frows() == 2 and pg.locator('.grid.k4 .kpi').count() == 4, (frows(), pg.locator('.grid.k4 .kpi').count()))
    pg.locator('.p-select').first.click(); pg.wait_for_timeout(250)
    pg.get_by_role('option', name='مصنع الدلتا').click(); pg.wait_for_timeout(450)
    chk('13: فلتر الشركة في التقارير المالية فوري', frows() == 1, frows())
    V("lg('عملية اختبار','تفاصيل س1');lg('عملية أخرى','تفاصيل س2');save();go('log')"); pg.wait_for_timeout(700)
    lrows = lambda: pg.locator('.aman-ui table tbody tr:not(.p-datatable-empty-message)').count()
    n_l = lrows(); chk('13: السجل بـ Vue ويعرض العمليات', n_l >= 2 and V("!!document.getElementById('vue-log')"), n_l)
    pg.locator('.at-sb input').fill('س2'); pg.wait_for_timeout(500)
    chk('13: بحث السجل فوري', lrows() == 1, lrows())
    # صفحة الطلبات
    V("go('req')"); pg.wait_for_timeout(800)
    chk('13: الطلبات بـ Vue: ثلاثة أعمدة Kanban وكل طلب في عموده', pg.locator('.kb .kc').count() == 3 and pg.locator('.kb .kc').nth(0).locator('.kcard').count() == 2 and pg.locator('.kb .kc').nth(1).locator('.kcard').count() == 1)
    pg.locator('.kb .kc').nth(0).locator('.kcard').first.drag_to(pg.locator('.kb .kc').nth(1)); pg.wait_for_timeout(500)
    chk('13: سحب طلب إلى «معتمد» يغيّر حالته ويُسجَّل', V("Q().filter(q=>q.status=='معتمد').length") == 2 and V("S.log[0].a") == 'تغيير حالة طلب دخول', V("Q().map(q=>q.status)"))
    pg.get_by_role('button', name='قائمة', exact=True).click(); pg.wait_for_timeout(400)
    chk('13: وضع القائمة يعرض الطلبات الثلاثة', lrows() == 3, lrows())
    pg.locator('.p-datatable tbody input[type=checkbox]').nth(0).check(); pg.locator('.p-datatable tbody input[type=checkbox]').nth(1).check()
    pg.locator('.tb button', has_text='رفض المحدد').click(); pg.wait_for_timeout(400)
    chk('13: الرفض الجماعي للمحدد', V("Q().filter(q=>q.status=='مرفوض').length") == 2, V("Q().map(q=>q.status)"))
    chk('20: وضع العرض يُحفظ في التفضيلات', V("AmanCore.prefs.getPrefs().view.req") == 'list')
    pg.get_by_role('button', name='لوحة', exact=True).click(); pg.wait_for_timeout(300)
    # متابعة التقديم (Kanban 50)
    pg.locator('button', has_text='متابعة التقديم').first.click(); pg.wait_for_timeout(500)
    fcol = lambda i: pg.locator('.fl-board .kc').nth(i)
    n_draft = fcol(0).locator('.kcard').count()
    chk('50: لوحة المتابعة تعرض المسودة/قُدِّم/مؤكَّد', pg.locator('.fl-board .kc').count() == 3 and n_draft == 0 and fcol(1).locator('.kcard').count() >= 6, (n_draft, fcol(1).locator('.kcard').count()))
    V("(()=>{const e=S.emps.find(x=>x.id=='e2');e.reqIn='';e.inSt='بانتظار التأكيد';save()})()"); pg.wait_for_timeout(500)
    chk('50: التحديث التلقائي: موظف بلا رقم طلب يظهر في «مسودة»', fcol(0).locator('.kcard').count() == 1, fcol(0).locator('.kcard').count())
    V("""(()=>{const c=document.querySelectorAll('.fl-board .kc');const card=c[0].querySelector('.kcard');const dt=new DataTransfer();const ev=(t,el)=>el.dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,dataTransfer:dt}));ev('dragstart',card);ev('dragover',c[1]);ev('drop',c[1])})()"""); pg.wait_for_timeout(500)
    chk('50: السحب من المسودة يفتح نافذة رقم الطلب', pg.locator('.p-dialog').count() == 1)
    pg.locator('.p-dialog input').first.fill('Z77'); pg.locator('.p-dialog button', has_text='حفظ ونقل').click(); pg.wait_for_timeout(500)
    chk('50: تأكيد النافذة يسجّل الرقم وينقل البطاقة', V("S.emps.find(e=>e.id=='e2').reqIn") == 'Z77' and fcol(0).locator('.kcard').count() == 0 and pg.locator('.p-dialog').count() == 0)
    fcol(1).locator('.kcard', has_text='رقم قومي ناقص').locator('button', has_text='تأكيد').click(); pg.wait_for_timeout(500)
    chk('50: زر «تأكيد» ينقل البطاقة إلى مؤكَّد', fcol(2).locator('.kcard', has_text='رقم قومي ناقص').count() == 1 and V("S.emps.find(e=>e.id=='e2').inSt") == 'تم التأكيد')
    pg.locator('button', has_text='طلبات الخروج').click(); pg.wait_for_timeout(500)
    chk('50: تبويب الخروج يعرض المستقيل (e5 مؤكَّد خروجه حديثًا)', fcol(2).locator('.kcard', has_text='مستقيل بلا طلب').count() == 1, [fcol(i).locator('.kcard').count() for i in range(3)])
    # شبكة الأمان
    V("localStorage.setItem('ins_ui_req','0');go('req')"); pg.wait_for_timeout(500)
    chk('شبكة الأمان: ins_ui_req=0 ⇒ صفحة الطلبات القديمة', V("!document.getElementById('vue-req') && !!document.querySelector('.kb .kcard')"))
    V("localStorage.removeItem('ins_ui_req');go('req')"); pg.wait_for_timeout(600)
    V("amanReqFail()"); pg.wait_for_timeout(500)
    chk('شبكة الأمان: خطأ وقت العرض ⇒ الشكل القديم داخل نفس الصفحة', V("!!document.querySelector('#vue-req .kcard, #vue-req .kb')"))
    V("go('comp');go('dash')"); pg.wait_for_timeout(600)
    chk('مغادرة صفحة Vue تفكّ التركيب (لا تطبيق يتيم)', V("AmanUI.active()") is True and V("!!document.getElementById('vue-dash')"))

    chk('لا أخطاء JS أثناء الاختبار', not errs, errs[:5])
    b.close()
print(f'\n{ok} نجح • {bad} فشل')
sys.exit(1 if bad else 0)
