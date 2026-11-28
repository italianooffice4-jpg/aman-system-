# اختبار المرحلة 5 على Chromium (بعد npm run ui:build): معرض المستندات 62–65، المساعد 68، التدقيق 69، OCR 67 (محلل التاريخ)، تنبيه البطاقة 53.
import http.server, threading, socketserver, os, sys, functools, base64
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PORT = 8797
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
RED = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==')
GRN = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/Ga0YrgAAAABJRU5ErkJggg==')
SEED = r"""
(function(){
 if(sessionStorage.getItem('__s'))return; sessionStorage.setItem('__s','1');
 const T=new Date(); const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const off=n=>iso(new Date(T.getFullYear(),T.getMonth(),T.getDate()+n));
 let ser=0; const nid=(y,mo,d,male)=>{ser++;const c=y>=2000?'3':'2';return c+String(y).slice(-2)+String(mo).padStart(2,'0')+String(d).padStart(2,'0')+'01'+String(100+ser).slice(-3)+(male?'1':'2')+'1'};
 const doc=[{id:'dd',name:'c.pdf',kind:'التحاق',type:'application/pdf',size:10}];
 const E=(id,o)=>Object.assign({id,cid:'c1',name:id,code:id,job:'محاسب',insno:'9'+id.slice(1),wage:3000,start:'2020-03-01',status:'active',end:'',docs:doc,reqIn:'R'+id,inSt:'بانتظار التأكيد',nid:nid(1990,1,1,1)},o);
 const dupn=nid(1985,5,5,1);
 const S={cfg:{emp:11,er:18.75,min:2700,max:16700,retAge:60},companies:[{id:'c1',name:'شركة النيل'},{id:'c2',name:'مصنع الدلتا'}],
  emps:[E('e0',{name:'أحمد المحاسب',wage:6000,nid:dupn}),
   E('e1',{name:'منى المحاسبة',wage:4000,nid:nid(1995,3,3,0),docs:[]}),
   E('e2',{name:'سامي السائق',cid:'c2',job:'سائق',wage:3000,start:'2025-02-10',nid:nid(1992,2,2,1)}),
   E('e3',{name:'خالد مستقيل',wage:7000,status:'resigned',start:'2019-01-01',end:'2025-04-20',rtype:'استقالة',nid:nid(1980,7,7,1)}),
   E('e4',{name:'هالة مستقيلة',cid:'c2',job:'سائق',wage:2500,status:'resigned',start:'2021-01-01',end:'2025-09-05',rtype:'استقالة',nid:nid(1993,4,4,0)}),
   E('e5',{name:'عادل عامل',job:'عامل',wage:3500,status:'resigned',start:'2018-01-01',end:'2024-08-01',rtype:'استقالة',nid:nid(1975,6,6,1)}),
   E('e6',{name:'رقم ناقص',job:'عامل',wage:2000,nid:'123',docs:[]}),
   E('e7',{name:'مكرر الرقم',cid:'c2',wage:5000,nid:dupn}),
   E('e8',{name:'تواريخ معكوسة',cid:'c2',wage:3300,status:'resigned',start:'2023-01-01',end:'2022-01-01',rtype:'استقالة',nid:nid(1991,9,9,1)}),
   E('e9',{name:'بطاقة قاربت',wage:3100,nidExp:off(10),nid:nid(1994,8,8,1)})],
  reqs:[],pay:[],log:[],cars:[],tasks:[]};
 localStorage.setItem('ins_sys_v1',JSON.stringify(S));
 localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'T',name:'T',p:'x',r:'admin',role:'admin'}]));
 localStorage.setItem('ins_ui_prefs',JSON.stringify({v:1,dash:{summary:false}}));
 sessionStorage.setItem('ins_sess','t');
})();"""
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1360, 'height': 900}); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.on('dialog', lambda d: d.accept())
    pg.add_init_script(SEED.replace('\n', ' '))
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(2200)
    V = lambda js: pg.evaluate(js)
    chk('الواجهة والتطبيق العام جاهزان', V("AmanUI.hostReady()"))

    # ======== (68) المساعد: أسئلة مركبة ========
    ask = lambda q: V("(()=>{const r=a9.assist(%r);return r?{t:r.text,h:r.html||''}:null})()" % q)
    r = ask('كم موظف مستقيل من شركة النيل؟')
    chk('68: «كم موظف مستقيل من شركة النيل» = 2 مع شرح الفهم', r and 'العدد: ٢' in r['t'] and 'مستقيلون' in r['t'] and 'شركة شركة النيل' in r['t'], r)
    r = ask('اعرض المحاسبين الذين أجرهم أكبر من 5000')
    chk('68: وظيفة + أجر أكبر من (أحمد 6000 وخالد 7000)', r and 'العدد: ٢' in r['t'] and 'محاسب' in r['t'] and '5000' in r['t'], r)
    r = ask('كم سيدة مؤمن عليها في شركة النيل')
    chk('68: النوع من الرقم القومي + الحالة + الشركة = منى فقط', r and 'العدد: ١' in r['t'] and 'سيدات' in r['t'], r)
    r = ask('الموظفين الذين استقالوا في 2025')
    chk('68: استقالات سنة 2025 = 2 (تاريخ الاستقالة لا الالتحاق)', r and 'العدد: ٢' in r['t'] and 'تاريخ الاستقالة' in r['t'], r)
    r = ask('كم موظف أجره بين 3000 و 4000')
    chk('68: بين (شامل الحدين) = 4 (منى 4000، سامي 3000، عادل 3500، تواريخ 3300)… عدا أحمد/غيره', r and 'العدد: ٦' in r['t'] or (r and 'العدد' in r['t']), r)
    exp = V("S.emps.filter(e=>+e.wage>=3000&&+e.wage<=4000).length")
    chk('68: العدد المحسوب يطابق الحساب المباشر على البيانات', r and ('العدد: ' + V("fm(%d)" % exp)) in r['t'], (exp, r))
    r = ask('كم موظف أجرهم أكبر من 5000 وعمرهم أقل من 40 سنة')
    expc = V("S.emps.filter(e=>+e.wage>5000&&(()=>{const n=a9.nid(e.nid);if(!n.valid)return false;const b=new Date(n.birth),t=new Date();let a=t.getFullYear()-b.getFullYear();if(t<new Date(t.getFullYear(),b.getMonth(),b.getDate()))a--;return a<40})()).length")
    chk('68: شرطان مختلفان (أجر وعمر) لا يختلطان', r and ('العدد: ' + V("fm(%d)" % expc)) in r['t'] and 'السن < 40' in r['t'] and 'الأجر > 5000' in r['t'], (expc, r))
    r = ask('ما متوسط أجر الموظفين المؤمن عليهم')
    avg = V("(()=>{const l=S.emps.filter(e=>e.status=='active');return Math.round(l.reduce((a,e)=>a+ +e.wage,0)/l.length)})()")
    chk('68: متوسط الأجر لنشطين يطابق الحساب', r and r['t'].split('\n')[1].startswith('متوسط الأجر') and V("fm(%d)" % avg) in r['t'].replace(',', ''), (avg, r))
    r = ask('وزّع الموظفين حسب الشركة')
    chk('68: التوزيع حسب الشركة', r and 'شركة النيل' in r['t'] and 'مصنع الدلتا' in r['t'], r)
    r = ask('كم موظف بدون مستندات')
    chk('68: نواقص: بلا مستندات (يطابق مرشح التنبيه 54)', r and ('العدد: ' + V("fm(S.emps.filter(XF2.nodocs).length)")) in r['t'], r)
    r = ask('أحمد المحاسب')
    chk('المنطق القديم لم يتأثر: بحث بالاسم يرجع بطاقة الموظف', r and 'وجدت' in r['t'] or (r and 'تم العثور' in r['t']), r)
    r = ask('المقبلون على المعاش')
    chk('المنطق القديم: المقبلون على المعاش', r is not None and 'المعاش' in r['t'], r)
    r = ask('اعرض موظف')
    chk('سؤال بلا شروط لا يخطف إلى المحرك الجديد', r is None or 'فهمت سؤالك' not in r['t'], r)
    # نافذة النتائج
    V("(()=>{const r=a9.assist('كم موظف مستقيل من شركة النيل');const m=r.html.match(/openReport\\('([^']+)'/);AmanUI.openReport(m[1])})()"); pg.wait_for_timeout(400)
    chk('68: «عرض النتائج» تفتح جدولًا بصفّين والاسم رابط للملف', pg.locator('.rp-box tbody tr').count() == 2 and pg.locator('.rp-box tbody a').count() == 2, pg.locator('.rp-box tbody tr').count())
    pg.locator('.rp-box .ef-x').click(); pg.wait_for_timeout(200)

    # ======== (69) التدقيق ========
    a = V("(()=>{const r=a9.assist('اكتشف التناقضات');return {t:r.text,h:r.html}})()")
    chk('69: المساعد يلخّص التدقيق ويعرض زر التقرير', 'ملاحظة' in a['t'] and 'openReport' in a['h'], a)
    ids = V("import('/ui/src/core/contra.js').then(m=>m.audit().groups.map(g=>g.id+':'+g.items.length))")
    ids = {x.split(':')[0]: int(x.split(':')[1]) for x in ids}
    chk('69: رقم قومي مكرر يلتقط الموظفين المكرّرين (2)', ids.get('dup_nid') == 2, ids)
    chk('69: رقم قومي غير صالح (e6)', ids.get('nid_bad') == 1, ids)
    chk('69: استقالة قبل الالتحاق (e8)', ids.get('dates_order') == 1, ids)
    chk('69: أجر أقل من الحد الأدنى (e4 2500، e6 2000 ⇒ النشط فقط e6)', ids.get('wage_min') == 1, ids)
    chk('69: لا فحص يلتقط موظفًا سليمًا بالخطأ (أحمد خارج dates_order/nid_bad)', V("import('/ui/src/core/contra.js').then(m=>!m.audit().groups.filter(g=>['dates_order','nid_bad','wage_zero'].includes(g.id)).some(g=>g.items.some(i=>i.eid=='e0')))"))
    V("(()=>{const r=a9.assist('اكتشف التناقضات');AmanUI.openReport(r.html.match(/openReport\\('([^']+)'/)[1])})()"); pg.wait_for_timeout(400)
    chk('69: نافذة التقرير مقسَّمة لأقسام بخطورتها', pg.locator('.rp-sec').count() >= 4 and pg.locator('.rp-sec .tag.r').count() >= 2)
    with pg.expect_download(timeout=5000) as dl:
        pg.get_by_role('button', name='تصدير Excel (CSV)').click()
    chk('69: تصدير CSV', dl.value.suggested_filename.endswith('.csv'))
    pg.locator('.rp-box .ef-x').click(); pg.wait_for_timeout(200)

    # ======== (53/67) بطاقة الرقم القومي ========
    chk('53: تنبيه بطاقة تنتهي خلال 30 يومًا', V("alerts().some(a=>a.k=='idexp'&&a.id=='e9'&&a.rec=='emp')"))

    # ======== معرض المستندات 62–65 ========
    V("docs('e1')"); pg.wait_for_timeout(600)
    chk('63: يفتح معرض Vue ويضبط سياق OCR/المسح (#dk و a9.ctx)', pg.locator('.dg-box').count() == 1 and V("!!document.getElementById('dk') && a9.ctx.emp=='e1'"))
    chk('63: الحالة الفارغة تدعو للسحب والإفلات', pg.locator('.dg-empty').count() == 1)
    pg.locator('.dg-up input[type=file]').set_input_files([{'name': 'red.png', 'mimeType': 'image/png', 'buffer': RED}, {'name': 'green.png', 'mimeType': 'image/png', 'buffer': GRN}])
    pg.wait_for_timeout(900)
    chk('62/63: رفع ملفين بالاختيار يظهران في الشبكة بمصغّرات', pg.locator('.dg-card').count() == 2 and pg.locator('.dg-th img').count() == 2, pg.locator('.dg-card').count())
    chk('62: الرفع يُسجَّل في السجل ويحفظ الوصف في e.docs', V("S.emps.find(e=>e.id=='e1').docs.map(d=>d.name).join()") == 'red.png,green.png' and V("S.log[0].a") == 'رفع مستندات')
    # إفلات ملفات (سحب من خارج البرنامج)
    V("""(()=>{const box=document.querySelector('.dg-box');const dt=new DataTransfer();dt.items.add(new File([new Uint8Array([1,2,3])],'notes.txt',{type:'text/plain'}));dt.items.add(new File([new Uint8Array([37,80,68,70])],'scan.pdf',{type:'application/pdf'}));
      const ev=(t)=>box.dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,dataTransfer:dt}));ev('dragover');ev('drop')})()"""); pg.wait_for_timeout(800)
    chk('62: إفلات PDF يُرفع وملف txt يُرفض مع السبب', pg.locator('.dg-card').count() == 3 and 'notes.txt' in pg.locator('.dg-msg').inner_text(), pg.locator('.dg-msg').inner_text() if pg.locator('.dg-msg').count() else '')
    chk('63: بطاقة PDF تحمل شارة PDF', pg.locator('.dg-pdf').count() == 1)
    # ترتيب (64)
    names = lambda: V("S.emps.find(e=>e.id=='e1').docs.map(d=>d.name).join()")
    V("""(()=>{const c=document.querySelectorAll('.dg-card');const dt=new DataTransfer();const ev=(t,el)=>el.dispatchEvent(new DragEvent(t,{bubbles:true,cancelable:true,dataTransfer:dt}));ev('dragstart',c[2]);ev('dragover',c[0]);ev('drop',c[0])})()"""); pg.wait_for_timeout(500)
    chk('64: سحب البطاقة الأخيرة إلى الأولى يعيد الترتيب ويحفظه', names() == 'scan.pdf,red.png,green.png', names())
    pg.locator('.dg-card').nth(0).get_by_role('button', name='◀').click(); pg.wait_for_timeout(300)
    chk('64: زر التأخير يحرّك البطاقة خطوة', names() == 'red.png,scan.pdf,green.png', names())
    V("S.emps.find(e=>e.id=='e1').docs.reverse();save()")   # الأحدث = الأبعد
    # معاينة
    pg.locator('.dg-card').nth(0).locator('.dg-th').click(); pg.wait_for_timeout(500)
    chk('63: المعاينة تعرض الصورة أو PDF داخل النافذة', pg.locator('.dg-pv').count() == 1 and (pg.locator('.dg-pv img').count() + pg.locator('.dg-pv iframe').count()) == 1)
    pg.locator('.dg-pv .ef-x').click(); pg.wait_for_timeout(200)
    # مقارنة (65)
    pg.locator('.dg-card').nth(0).locator('.dg-chk input').check(); pg.locator('.dg-card').nth(2).locator('.dg-chk input').check()
    pg.get_by_role('button', name='مقارنة المحدد (2/2)').click(); pg.wait_for_timeout(600)
    chk('65: مقارنة صورتين جنبًا إلى جنب مع تسمية الأقدم والأحدث', pg.locator('.dg-two .dg-side').count() == 2 and 'الأقدم' in pg.locator('.dg-cap').nth(0).inner_text() and 'الأحدث' in pg.locator('.dg-cap').nth(1).inner_text())
    pg.locator('.dg-cmp input[type=checkbox]').check(); pg.wait_for_timeout(300)
    chk('65: وضع إظهار الفروق (طبقتان بمزج difference)', pg.locator('.dg-diff img').count() == 2 and V("getComputedStyle(document.querySelector('.dg-bl')).mixBlendMode") == 'difference')
    pg.locator('.dg-cmp input[type=checkbox]').uncheck(); pg.get_by_role('button', name='تبديل الجانبين').click(); pg.wait_for_timeout(300)
    chk('65: تبديل الجانبين يقلب الأقدم/الأحدث', 'الأقدم' in pg.locator('.dg-cap').nth(0).inner_text())
    pg.locator('.dg-cmp .ef-x').click(); pg.wait_for_timeout(200)
    chk('65: زر «قارن آخر نسختين» لنفس النوع يظهر', pg.get_by_role('button', name='قارن آخر نسختين').count() >= 1)
    # تغيير النوع، حذف
    pg.locator('.dg-card').nth(0).locator('.dg-mt select').select_option('بطاقة الرقم القومي'); pg.wait_for_timeout(300)
    chk('63: تغيير نوع مستند يُحفظ', V("S.emps.find(e=>e.id=='e1').docs[0].kind") == 'بطاقة الرقم القومي')
    pg.locator('.dg-card').nth(0).get_by_role('button', name='حذف').click(); pg.wait_for_timeout(500)
    chk('63: حذف مستند يزيله من القائمة ومن المخزن', pg.locator('.dg-card').count() == 2 and V("S.emps.find(e=>e.id=='e1').docs.length") == 2)
    # واردة من مجلد الماسح (66) — الغلاف الوهمي
    V("window.desk={scanWatchRead:async n=>({name:n,type:'image/png',data:'data:image/png;base64,%s',size:70})};void 0" % base64.b64encode(RED).decode())
    V("AmanCore.incoming.onFile({name:'hp-scan-001.png',size:70,type:'image/png'})"); pg.wait_for_timeout(300)
    chk('66: ملف وارد يظهر شريطًا داخل المعرض', pg.locator('.dg-inc').count() == 1 and 'hp-scan-001.png' in pg.locator('.dg-inc').inner_text())
    pg.locator('.dg-inc').get_by_role('button', name='إضافة', exact=False).first.click(); pg.wait_for_timeout(900)
    chk('66: «إضافة» تقرأ الملف من الغلاف وتضيفه مستندًا', pg.locator('.dg-card').count() == 3 and pg.locator('.dg-inc').count() == 0 and 'hp-scan-001.png' in names())
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    chk('Esc يغلق المعرض', pg.locator('.dg-box').count() == 0)
    # شبكة الأمان
    V("localStorage.setItem('ins_ui_docs','0');docs('e1')"); pg.wait_for_timeout(500)
    chk('شبكة الأمان: ins_ui_docs=0 ⇒ شاشة المستندات القديمة', pg.locator('.dg-box').count() == 0 and V("!!document.getElementById('df')"))
    V("closeM();localStorage.removeItem('ins_ui_docs')")
    chk('لا أخطاء JS', not errs, errs[:5])
    b.close()
print(f'\n{ok} نجح • {bad} فشل'); sys.exit(1 if bad else 0)
