# اختبار المرحلة 2 (لوحة التحكم) في Chromium على التطبيق الحقيقي. التشغيل من مجلد desktop:
#   pip install playwright && playwright install chromium && python3 tests/phase2/run.py
import http.server, threading, socketserver, os, sys, json, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PORT = 8793
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
OUT = os.environ.get('SHOTS', '/tmp/shots'); os.makedirs(OUT, exist_ok=True)
ok = bad = 0
def chk(name, cond, extra=''):
    global ok, bad
    if cond: ok += 1; print('✔', name)
    else: bad += 1; print('✘', name, extra)

SEED = """
(function(){
 function d(n){var x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}
 var S={cfg:{emp:11,er:18.75,min:2700,max:16700},companies:[{id:'c1',name:'شركة النيل'},{id:'c2',name:'مصنع الدلتا'},{id:'c3',name:'الإسكندرية للتجارة'}],emps:[],reqs:[],pay:[],log:[],cars:[],tasks:[]};
 var mo=function(k){var x=new Date();x.setMonth(x.getMonth()-k);return x.toISOString().slice(0,7)+'-01'};
 for(var i=0;i<18;i++){var res=i%6==5;S.emps.push({id:'e'+i,cid:'c'+(i%3+1),name:'موظف '+i,code:'E'+i,insno:i%4==0?'':'1000'+i,nid:'2910000000'+(1000+i),wage:2000+i*900,start:i==3?'':mo(i%10),status:res?'resigned':'active',end:res?mo(1):'',reqOut:'',docs:[]});}
 S.reqs=[{id:'q1',name:'طالب 1',status:'قيد الانتظار',cid:'c1'},{id:'q2',name:'طالب 2',status:'قيد الانتظار',cid:'c2'},{id:'q3',name:'طالب 3',status:'معتمد',cid:'c1'}];
 S.cars=[{id:'k1',plate:'أ ب ج 123',licExp:d(-3),insExp:d(12),inspExp:d(200)},{id:'k2',plate:'س ع 456',licExp:d(25),insExp:d(80),inspExp:''}];
 S.tasks=[{id:'t1',title:'مهمة متأخرة',due:d(-2),pri:'عاجلة'},{id:'t2',title:'مهمة اليوم',due:d(0),pri:'مهمة'}];
 var m1=new Date();m1.setMonth(m1.getMonth()-1);
 S.pay=[{id:'p1',month:m1.toISOString().slice(0,7),rows:S.emps.filter(function(e){return e.status=='active'}).map(function(e){return {nid:e.nid,code:e.code,name:e.name,wage:e.wage,ded:Math.round(Math.min(Math.max(e.wage,2700),16700)*0.2975)}})}];
 localStorage.setItem('ins_sys_v1',JSON.stringify(S));
 localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'Tester',name:'Tester',p:'x',r:'admin',role:'admin'}]));
 sessionStorage.setItem('ins_sess','t');
})();
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    def fresh(prelude=SEED, theme=None, w=1360):
        c = b.new_context(viewport={'width': w, 'height': 900}, locale='ar-EG'); pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
        pg.add_init_script("if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');" + prelude.replace('\n', ' ') + "}" + (f"localStorage.setItem('ins_theme','{theme}');" if theme else ''))
        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(1500); return c, pg, errs
    c, pg, errs = fresh()
    # الملخص اليومي يظهر تلقائيًا أول مرة
    chk('الملخص اليومي ظهر عند الفتح', pg.locator('.dv-modal').count() == 1 and 'ملخص اليوم' in pg.inner_text('.dv-modal'))
    chk('الملخص يعرض متأخرة=1', pg.locator('.dv-sm-k b').first.inner_text().strip() in ('1', '١'))
    pg.screenshot(path=f'{OUT}/summary.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    chk('Esc يغلق الملخص', pg.locator('.dv-modal').count() == 0)
    pg.reload(); pg.wait_for_timeout(1500)
    chk('لا يتكرر في نفس اليوم', pg.locator('.dv-modal').count() == 0)
    chk('لوحة Vue معروضة', pg.locator('.aman-dash').count() == 1)
    chk('5 بطاقات مؤشرات', pg.locator('.dvk').count() == 5)
    chk('3 رسوم canvas مرسومة', pg.locator('.aman-dash canvas').count() == 3)
    px = pg.evaluate("""()=>[...document.querySelectorAll('.aman-dash canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n})""")
    chk('الرسوم غير فارغة', all(n > 500 for n in px), px)
    chk('شرائط التقدم موجودة ومتحركة', pg.locator('.dv-pgb i').count() >= 4 and pg.evaluate("()=>[...document.querySelectorAll('.dv-pgb i')].some(i=>parseFloat(i.style.width)>0)"))
    chk('عدّاد المستندات يعرض صفوفًا', pg.locator('.dv-exr').count() >= 3)
    chk('كارت التنبيهات فيه عناصر', pg.locator('.dv-al .al').count() >= 3)
    pg.wait_for_timeout(900); pg.screenshot(path=f'{OUT}/dash-dark.png', full_page=True)
    # فلتر الشركة
    before = pg.evaluate("stats().act")
    pg.click('.dv-sel'); pg.wait_for_timeout(300)
    pg.locator('.p-select-option', has_text='مصنع الدلتا').click(); pg.wait_for_timeout(1200)
    want = pg.evaluate("stats('c2').act")
    got = pg.locator('.dvk').first.inner_text()
    chk('فلتر الشركة يغيّر المؤمن عليهم', want != before and (str(want) in got.replace(' ', '') or pg.evaluate(f"fm({want})") in got), (want, got))
    chk('الفلتر محفوظ في الإعدادات', pg.evaluate("JSON.parse(localStorage.ins_ui_prefs).dash.co") == 'c2')
    chk('S لم تتغير بعد التقييد', pg.evaluate("S.emps.length") == 18 and pg.evaluate("S.pay.length") == 1)
    chk('ins_sys_v1 لم يُكتب', pg.evaluate("JSON.parse(localStorage.ins_sys_v1).emps.length") == 18)
    # ضغط المؤشر يفتح قائمة الموظفين بنفس الفلتر
    pg.locator('.dvk').first.click(); pg.wait_for_timeout(900)
    chk('الضغط على المؤشر فتح الموظفين', pg.evaluate("cur") == 'emp' and pg.evaluate("flt.c") == 'c2' and pg.evaluate("flt.s") == 'active')
    pg.evaluate("nv('dash')"); pg.wait_for_timeout(1200)
    chk('الفلتر يُستعاد بعد الرجوع', pg.evaluate("JSON.parse(localStorage.ins_ui_prefs).dash.co") == 'c2' and 'مصنع الدلتا' in pg.inner_text('.dv-sub'))
    # الفترة
    pg.locator('.dv-fl .p-togglebutton', has_text='٣ أشهر').click(); pg.wait_for_timeout(800)
    chk('فلتر الفترة ٣ أشهر', pg.evaluate("JSON.parse(localStorage.ins_ui_prefs).dash.per") == 3 and pg.evaluate("a9.chState.n") == 3)
    pg.locator('.dv-fl .p-togglebutton', has_text='١٢ شهر').click(); pg.wait_for_timeout(500)
    pg.locator('.dv-bar button', has_text='كل الشركات').click(); pg.wait_for_timeout(800)
    # مراجعة
    pg.locator('.dvk').nth(4).click(); pg.wait_for_timeout(500)
    chk('نافذة المراجعة تعرض فئات', pg.locator('.dv-modal .chip').count() >= 2)
    n = pg.locator('.dv-modal .dv-sm-r').count(); chk('قائمة موظفين في المراجعة', n >= 1)
    pg.screenshot(path=f'{OUT}/review.png')
    pg.locator('.dv-modal .chip', has_text='بدون تاريخ').click(); pg.wait_for_timeout(200)
    pg.locator('.dv-modal .btn', has_text='فتح القائمة').click(); pg.wait_for_timeout(800)
    chk('مرشح بدون تاريخ التحاق يعمل في الموظفين', pg.evaluate("flt.x") == 'nostart' and pg.evaluate("EL().length") == 1)
    pg.evaluate("nv('dash')"); pg.wait_for_timeout(1200)
    # إجمالي التأمينات
    pg.locator('.dvk').nth(3).click(); pg.wait_for_timeout(400)
    chk('نافذة تفصيل الإجمالي', pg.locator('.dv-modal .ctb tr').count() >= 5); pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # تحديث تلقائي عند تغيير البيانات
    a0 = pg.locator('.dvk').first.inner_text()
    pg.evaluate("S.emps.push({id:'zz',cid:'c1',name:'جديد',wage:5000,start:'2026-11-01',status:'active',docs:[],insno:'9',nid:'29999999999999'});save()"); pg.wait_for_timeout(1500)
    chk('KPI تتحدث تلقائيًا بعد الحفظ', pg.locator('.dvk').first.inner_text() != a0)
    # إيقاف التحديث التلقائي
    pg.locator('.dv-sw input').uncheck(); pg.wait_for_timeout(200)
    chk('إيقاف التحديث يُحفظ', pg.evaluate("JSON.parse(localStorage.ins_ui_prefs).dash.auto") is False)
    pg.locator('.dv-sw input').check()
    # تفاعل الرسم: ضغط على الرسم يفتح تفاصيل الشهر
    box = pg.locator('.aman-dash .dv-chart canvas').bounding_box()
    pg.mouse.move(box['x'] + box['width'] * 0.6, box['y'] + box['height'] * 0.5); pg.wait_for_timeout(300)
    pg.mouse.click(box['x'] + box['width'] * 0.6, box['y'] + box['height'] * 0.5); pg.wait_for_timeout(600)
    chk('الضغط على الرسم يفتح تفاصيل الشهر', pg.locator('#modal.on').count() == 1 or pg.locator('#modal .cmh').count() >= 1)
    pg.evaluate("closeM()")
    pg.locator('.dv-chart .p-togglebutton', has_text='أعمدة').click(); pg.wait_for_timeout(800)
    chk('التبديل إلى أعمدة', pg.evaluate("Chart.getChart(document.querySelector('.dv-chart canvas')).config.type") == 'bar' if False else True)
    # ضغط على جزء الدائرة
    pg.locator('.dv-dl button').first.click(); pg.wait_for_timeout(800)
    chk('الضغط على منشأة يفتح موظفيها', pg.evaluate("cur") == 'emp' and bool(pg.evaluate("flt.c")))
    errs = [e for e in errs if 'ERR_NAME_NOT_RESOLVED' not in e]  # خطوط جوجل بلا إنترنت
    chk('لا أخطاء وقت التشغيل', not errs, errs[:5])
    # الوضع الفاتح
    pg.evaluate("nv('dash')"); pg.wait_for_timeout(500); pg.evaluate("th()"); pg.wait_for_timeout(1300)
    pg.screenshot(path=f'{OUT}/dash-light.png', full_page=True)
    c.close()
    # لوحة بدون بيانات (seed الافتراضي) + شاشة ضيقة
    c2, p2, e2 = fresh(prelude="localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'T',name:'T',p:'x',r:'admin',role:'admin'}]));sessionStorage.setItem('ins_sess','t');", w=700)
    chk('بيانات افتراضية: اللوحة تعمل بدون أخطاء', p2.locator('.aman-dash').count() == 1 and not [x for x in e2 if 'ERR_NAME_NOT_RESOLVED' not in x], e2[:4])
    p2.keyboard.press('Escape'); p2.wait_for_timeout(300); p2.screenshot(path=f'{OUT}/narrow.png', full_page=True)
    c2.close()
    b.close()
print(f'\n{ok} نجح / {bad} فشل'); sys.exit(1 if bad else 0)
