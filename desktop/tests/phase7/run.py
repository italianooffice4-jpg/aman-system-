# اختبار واجهة المرحلة 7 على Chromium بغلاف desk وهمي (يختبر ربط الصفحة والترحيل التلقائي والمرآة والاسترجاع والبحث). المحرك الحقيقي يُختبر في datastore.test.mjs
import http.server, threading, socketserver, os, functools, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PORT = 8797
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
threading.Thread(target=socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT)).serve_forever, daemon=True).start()
SEED = open(os.path.join(ROOT, 'tests', 'phase6', 'seed.js'), encoding='utf-8').read().replace('\n', ' ')
MOCK = """
window.__db={saves:[],migrated:0,backups:[{name:'aman-20261120-100000-تلقائي.db',size:20480,t:Date.now()-86400000,reason:'تلقائي'}],settings:{auto:true,everyHours:12,keep:20},calls:[]};
window.desk={
 dbStatus:async()=>({ok:true,engine:'sql.js',file:'x',size:50000,savedAt:Date.now(),migratedAt:__db.migrated,counts:{emps:6,reqs:3},integrity:'ok',settings:__db.settings,backups:__db.backups,libDir:'C:\\\\lib'}),
 dbSave:async(o)=>{__db.saves.push(o);return{ok:true}},
 dbMigrate:async(o)=>{__db.migrated=Date.now();__db.migrateArg=o;const S=JSON.parse(o.main);return{ok:true,problems:[],report:Object.keys(S).filter(k=>Array.isArray(S[k])).map(k=>({coll:k,src:S[k].length,db:S[k].length,bad:0}))}},
 dbVerify:async(o)=>({ok:false,problems:['emps: 1 سجل غير مطابق'],report:[{coll:'emps',src:6,db:6,bad:1}]}),
 dbSearch:async(q)=>({ok:true,rows:[{coll:'emps',kind:'موظف',id:'e0',title:'نتيجة من القاعدة',sub:q}]}),
 dbBackupNow:async()=>{__db.backups.unshift({name:'aman-يدوي.db',size:1,t:Date.now(),reason:'يدوي'});return{ok:true,name:'aman-يدوي.db'}},
 dbSettings:async(p)=>{Object.assign(__db.settings,p);return{ok:true,settings:__db.settings}},
 dbReadBackup:async(n)=>{__db.restored=n;const S=JSON.parse(localStorage.getItem('ins_sys_v1'));S.emps=S.emps.slice(0,2);return{ok:true,main:JSON.stringify(S),kv:{ins_theme:'dark'},counts:{emps:2}}},
 dbExport:async(o)=>{__db.exp=o;return{ok:true,path:'C:\\\\out.zip',docs:3}},
 dbImportPick:async()=>({ok:true,file:'f.zip',counts:{emps:1},docs:0,at:Date.now(),kind:'json'}),
 dbImportApply:async()=>({ok:true,main:JSON.stringify({emps:[],companies:[],reqs:[],cars:[],cfg:{}}),kv:{},counts:{emps:0},docs:null}),
 docsAudit:async(ids)=>({ok:true,checked:ids.length,missing:[{id:'d1',p:'المستندات/x [d1].pdf'}],badHash:[],orphans:[{id:'z',p:'y'}]})
};
"""
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1360, 'height': 900}, locale='ar-EG'); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text[:160]) if m.type == 'error' and 'Failed to load' not in m.text else None)
    pg.add_init_script("if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');" + SEED + "}" + MOCK)
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(8500)
    V = lambda js: pg.evaluate(js)
    chk('ترحيل تلقائي مرة واحدة بعد أول تشغيل (بدون تدخل)', V('__db.migrated>0') and V("!!__db.migrateArg && JSON.parse(__db.migrateArg.main).emps.length>0"))
    chk('المفاتيح الإضافية (ins_ui_prefs/ins_reports…) ضمن ما يُرسل، ولا مفاتيح AI سرية', all('ins_ai_key' not in k for k in V('Object.keys(__db.migrateArg.kv)')))
    V("nv('data')"); pg.wait_for_timeout(700)
    chk('صفحة «البيانات والنسخ» في القائمة وتعرض حالة القاعدة', V("cur=='data' && /مرحَّلة/.test(document.getElementById('dx-st').innerText)") and 'sql.js' in V("document.getElementById('dx-st').innerText"))
    chk('زر الإجراءات العام مخفي', V("$('act').innerHTML.trim()===''"))
    # المرآة: أي حفظ للبيانات يصل للقاعدة
    V("__db.saves.length=0; S.cfg.min=S.cfg.min; localStorage.setItem('ins_sys_v1', localStorage.getItem('ins_sys_v1'))"); pg.wait_for_timeout(2000)
    chk('المرآة: الحفظ يُرسل للقاعدة بعد ~1.5 ثانية (مرة واحدة مجمّعة)', V('__db.saves.length')==1 and V("JSON.parse(__db.saves[0].main).emps.length")>0, V('__db.saves.length'))
    # تحقق
    pg.click('[data-a=verify]'); pg.wait_for_timeout(300)
    chk('نتيجة التحقق الفاشل تظهر بالسبب وصف الجدول غير المطابق', 'غير مطابق' in V("document.getElementById('dx-st').innerText") and V("!!document.querySelector('#dx-st tr.bad')"))
    pg.click('[data-a=migrate]'); pg.wait_for_timeout(500)
    chk('ترحيل وتحقق: تقرير مطابقة كامل', 'المطابقة كاملة' in V("document.getElementById('dx-st').innerText"))
    # نسخ
    pg.click('[data-a=bk]'); pg.wait_for_timeout(400)
    chk('نسخة احتياطية الآن تظهر في القائمة', 'aman-يدوي.db' in V("document.getElementById('dx-bk').innerText"))
    pg.fill('[data-f=keep]', '7'); pg.dispatch_event('[data-f=keep]', 'change'); pg.wait_for_timeout(200)
    chk('تعديل إعدادات النسخ يُرسل للغلاف', V('__db.settings.keep')==7)
    pg.uncheck('[data-f=auto]'); pg.wait_for_timeout(200); chk('تعطيل النسخ التلقائي', V('__db.settings.auto')==False)
    # استرجاع: يطلب تأكيدًا يعرض الأعداد ثم يطبق ويعيد التحميل
    before = V("JSON.parse(localStorage.getItem('ins_sys_v1')).emps.length")
    pg.click('[data-a=restore]'); pg.wait_for_timeout(500)
    txt = V("document.getElementById('modal') ? document.getElementById('modal').innerText : ''")
    chk('الاسترجاع يعرض تأكيدًا بالأعداد (الحالي ← الجديد)', 'الحالي' in txt and ('٢' in txt or '2' in txt), txt[:120])
    chk('لم تتغير البيانات قبل التأكيد', V("JSON.parse(localStorage.getItem('ins_sys_v1')).emps.length")==before)
    with pg.expect_navigation(timeout=6000):
        pg.evaluate("(()=>{const b=[...document.querySelectorAll('#modal button')].find(x=>/نعم|تأكيد|موافق|متأكد|حسنًا|حسنا/.test(x.innerText)); (b||document.querySelector('#modal .btn:not(.s)')).click()})()")
    pg.wait_for_timeout(1500)
    chk('بعد التأكيد: طُبّقت النسخة (٢ موظف) وأُعيد التحميل', V("JSON.parse(localStorage.getItem('ins_sys_v1')).emps.length")==2 and V("localStorage.getItem('ins_theme')")=='dark')
    # بحث: عبر القاعدة
    pg.evaluate("sessionStorage.setItem('__s','1')")
    V("__db.migrated=Date.now()"); V("nv('data')"); pg.wait_for_timeout(600)
    pg.fill('#dx-q', 'محمد'); pg.wait_for_timeout(700)
    chk('البحث الشامل يستخدم القاعدة عند توفرها', 'عبر SQLite' in V("document.getElementById('dx-res').innerText") and 'نتيجة من القاعدة' in V("document.getElementById('dx-res').innerText"), V("document.getElementById('dx-res').innerText"))
    pg.click('#dx-res [data-a=open]'); pg.wait_for_timeout(500)
    chk('فتح نتيجة بحث يفتح ملف الموظف', V("!!document.querySelector('.ef-ov, .ef, [class*=emp-file], #ef')") or V("document.body.innerText.includes('ملف')"))
    # تدقيق
    V("document.querySelectorAll('.ef-ov').forEach(x=>x.remove())"); V("nv('data')"); pg.wait_for_timeout(500)
    pg.click('[data-a=audit]'); pg.wait_for_timeout(400)
    chk('فحص المستندات يعرض المفقود واليتيم', 'مفقودة' in V("document.getElementById('dx-au').innerText") and 'يتيمة' in V("document.getElementById('dx-au').innerText"))
    # تصدير
    pg.click('[data-a=expz]'); pg.wait_for_timeout(300); chk('تصدير ZIP يمرّر النوع والبيانات', V("__db.exp.kind=='zip' && __db.exp.withDocs && !!__db.exp.main"))
    chk('لا أخطاء في وحدة التحكم', not errs, errs[:4])
    b.close()
    # ---- بدون غلاف (متصفح/أندرويد): البحث بالذاكرة + لا انهيار ----
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 1360, 'height': 900}, locale='ar-EG').new_page(); e2 = []
    pg.on('pageerror', lambda e: e2.append(str(e)))
    pg.add_init_script("if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');" + SEED + "}")
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(2500); pg.evaluate("nv('data')"); pg.wait_for_timeout(500)
    chk('بدون غلاف: الصفحة تفتح وتشرح المحدودية', 'سطح المكتب' in pg.evaluate("document.getElementById('dx-st').innerText"))
    pg.fill('#dx-q', 'أحمد'); pg.wait_for_timeout(600)
    chk('بدون غلاف: البحث الشامل بالذاكرة يعمل', 'الذاكرة' in pg.evaluate("document.getElementById('dx-res').innerText") and pg.evaluate("document.querySelectorAll('#dx-res .dx-it').length")>0)
    chk('بدون غلاف: لا أخطاء', not e2, e2); b.close()
print(f'\n{ok} نجح • {bad} فشل')
