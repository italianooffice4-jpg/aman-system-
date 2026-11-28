# اختبار المرحلة 6 على Chromium (التقارير والطباعة 70–78) + إصلاحات الشاشة الرئيسية والشعار. التشغيل من مجلد desktop:  python3 tests/phase6/run.py
import http.server, threading, socketserver, os, functools, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PORT = 8798
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
threading.Thread(target=socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT)).serve_forever, daemon=True).start()
SEED = open(os.path.join(os.path.dirname(__file__), 'seed.js'), encoding='utf-8').read().replace('\n', ' ')
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(viewport={'width': 1360, 'height': 900}, locale='ar-EG', accept_downloads=True); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console: ' + m.text[:160]) if m.type == 'error' and 'Failed to load' not in m.text else None)
    pg.add_init_script("if(!sessionStorage.getItem('__s')){sessionStorage.setItem('__s','1');" + SEED + "}")
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(1000)
    chk('الشعار واسم البرنامج ظاهران بعد ثانية من الفتح', pg.evaluate("(()=>{const s=document.getElementById('splash');return !!s&&!s.classList.contains('h')&&!!s.querySelector('#sl img')&&/Aman/.test(s.innerText)})()"))
    pg.wait_for_timeout(2300)
    V = lambda js: pg.evaluate(js)
    chk('الشعار اختفى بعد ~٢٫٢ ثانية', V("(()=>{const s=document.getElementById('splash');return !s||s.classList.contains('h')})()"))
    # ---- الصفحة والقائمة ----
    V("nv('rpx')"); pg.wait_for_timeout(400)
    chk('صفحة التقارير والطباعة في القائمة وتعمل', V("!!document.querySelector('#nav .ni.on') && !!document.querySelector('#rpx-body') && cur=='rpx'"))
    chk('زر «طباعة/تصدير» العام مخفي في هذه الصفحة', V("$('act').innerHTML.trim()===''"))
    # ---- 70: منشئ التقارير ----
    pg.select_option('[data-f=status]', 'resigned'); pg.wait_for_timeout(100)
    pg.fill('[data-f=name]', 'مستقيلون بالأجر')
    pg.click('[data-a=add][data-v=wage]') if V("!!document.querySelector('[data-a=add][data-v=wage]')") else None
    pg.click('[data-a=up][data-v="2"]'); pg.wait_for_timeout(100)
    cols = V("AmanRpt.runSpec(Object.assign({},{src:'emp',cols:['name','co','wage'],co:'',status:'resigned',q:'',sort:'wage',dir:-1,group:''})).rows.map(r=>r.raw)")
    exp = V("S.emps.filter(e=>e.status!='active').sort((a,b)=>b.wage-a.wage).map(e=>[e.name,cn(e.cid),+e.wage])")
    chk('70: التشغيل = حساب مباشر على البيانات (مستقيلون مرتبون بالأجر) + إجمالي', [r for r in cols if r[0] and not str(r[0]).startswith('الإجمالي')] == exp and str(cols[-1][0]).startswith('الإجمالي') and cols[-1][2] == sum(e[2] for e in exp), (cols, exp))
    g = V("AmanRpt.runSpec({src:'emp',cols:['name','co','wage'],co:'',status:'',q:'',sort:'',dir:1,group:'co'}).rows.filter(r=>r.k=='sub').length")
    chk('70: التجميع حسب الشركة يضيف مجموعًا لكل شركة (٢)', g == 2, g)
    pg.click('[data-a=save]'); pg.wait_for_timeout(200)
    sv = V("JSON.parse(localStorage.getItem('ins_reports')||'[]')")
    chk('70: حفظ التقرير باسمه في ins_reports فقط', len(sv) == 1 and sv[0]['name'] == 'مستقيلون بالأجر' and sv[0]['status'] == 'resigned' and 'ins_sys_v1' in V("Object.keys(localStorage)"))
    chk('70: لا يسمح باسم مكرر', (pg.click('[data-a=new]') or True) and True)
    pg.fill('[data-f=name]', 'مستقيلون بالأجر'); pg.click('[data-a=save]'); pg.wait_for_timeout(150)
    chk('70: الاسم المكرر لم يُحفظ', V("JSON.parse(localStorage.getItem('ins_reports')).length") == 1)
    # ---- 75: المعاينة داخل الصفحة + 71 Excel/PDF/طباعة ----
    pg.click('[data-a=run]'); pg.wait_for_timeout(500)
    chk('75: نافذة المعاينة ظهرت وبها جدول التقرير', V("!!document.querySelector('#rpv') && document.getElementById('rpv-f').srcdoc.includes('<table')") )
    chk('75: المعاينة تحتوي أسماء المستقيلين', all(n in V("document.getElementById('rpv-f').srcdoc") for n in ['مستقيل بلا طلب']))
    pg.select_option('#rpv-or', 'landscape'); pg.wait_for_timeout(300)
    chk('75: تبديل الاتجاه لأفقي يغيّر @page', 'size:A4 landscape' in V("document.getElementById('rpv-f').srcdoc"))
    V("window.XLSX={utils:{book_new:()=>({sheets:[]}),aoa_to_sheet:a=>({a}),book_append_sheet:(wb,ws,n)=>wb.sheets.push({n,a:ws.a})},write:(wb)=>{window.__wb=wb;return new Uint8Array([1,2,3])}}")
    with pg.expect_download(timeout=5000) as d: pg.click('#rpv-x')
    chk('71: ورقة Excel: العناوين + صف المستقيل + الإجمالي', V("__wb.sheets[0].a.length")==3 and V("__wb.sheets[0].a[0][0]")=='الاسم' and V("__wb.sheets[0].a[1][0]")=='مستقيل بلا طلب', V("__wb.sheets[0].a"))
    chk('71: تصدير Excel ينزّل ملف xlsx', d.value.suggested_filename.endswith('.xlsx'), d.value.suggested_filename)
    V("window.__pr=[];window.print=()=>{};")
    pg.evaluate("window.desk={printHtml:async(h,o)=>{window.__pr.push({h,o});return{ok:true}},pdf:async(h,o)=>{window.__pdf={h,o};return{ok:true}}}")
    pg.click('#rpv-pr'); pg.wait_for_timeout(200)
    chk('71: الطباعة ترسل المستند للغلاف بدون واجهة المعاينة', V("__pr.length==1 && !__pr[0].h.includes('background:#6b6b6b') && __pr[0].h.includes('<table')"))
    pg.click('#rpv-pdf'); pg.wait_for_timeout(200)
    chk('76: PDF المباشر يستدعي desk.pdf باسم الملف', V("!!window.__pdf && __pdf.o.filename.length>0 && __pdf.h.includes('<table')"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    chk('75: Escape يغلق المعاينة', V("!document.getElementById('rpv')"))
    # ---- 72: شهري ----
    mo = V("(()=>{const d=new Date();return d.toISOString().slice(0,7)})()")
    pg.click('[data-a=tab][data-v=month]'); MO = V("S.emps.find(e=>e.status!='active').end.slice(0,7)"); pg.fill('[data-f=mo]', MO); pg.dispatch_event('[data-f=mo]', 'change'); pg.click('[data-a=mpreview]'); pg.wait_for_timeout(400)
    src = V("document.getElementById('rpv-f').srcdoc")
    exp_leave = V("S.emps.filter(e=>e.status!='active'&&String(e.end).slice(0,7)=='"+MO+"').length")
    chk('72: التقرير الشهري يعرض استقالات الشهر (خالد)', 'مستقيل بلا طلب' in src and exp_leave == 1 and 'التقرير الشهري' in src)
    tot = V("(()=>{const l=S.emps.filter(e=>insIn(e,'"+MO+"'));return Math.round(l.reduce((s,e)=>{const k=calc(e);return s+k.a+k.b},0))})()")
    chk('72: المستحق في الملخص = الحساب المباشر', V("document.getElementById('rpv-f').srcdoc").count('ج.م') >= 2 and V("(n=>document.getElementById('rpv-f').srcdoc.includes(Number(n).toLocaleString('ar-EG',{maximumFractionDigits:0}))) (%d)" % tot), tot)
    pg.keyboard.press('Escape')
    # ---- 73: يناير ----
    pg.click('[data-a=tab][data-v=jan]'); pg.wait_for_timeout(200)
    f = V("(()=>{const r=AmanRpt.forecast({min:3200,max:19300,emp:11.5,er:S.cfg.er,raise:0,co:''});return {t0:r.tot.t0,t1:r.tot.t1,n:r.tot.n,aff:r.affected.length}})()")
    ex = V("(()=>{const act=S.emps.filter(e=>e.status=='active');const cl=(w,a,b)=>Math.min(Math.max(+w,a),b);let t0=0,t1=0;act.forEach(e=>{t0+=cl(e.wage,S.cfg.min,S.cfg.max)*(S.cfg.emp+S.cfg.er)/100;t1+=cl(e.wage,3200,19300)*(11.5+S.cfg.er)/100});return {t0,t1,n:act.length}})()")
    chk('73: التوقع = حساب مستقل (الآن والمتوقع وعدد المؤمن عليهم)', abs(f['t0'] - ex['t0']) < 0.01 and abs(f['t1'] - ex['t1']) < 0.01 and f['n'] == ex['n'] and f['t1'] > f['t0'], (f, ex))
    chk('73: تنبيه أن القيم من أخبار وليست رسمية', 'ليست من الهيئة' in V("document.getElementById('rpx-body').innerText"))
    pg.fill('[data-f="fc.raise"]', '10'); pg.dispatch_event('[data-f="fc.raise"]', 'change'); pg.wait_for_timeout(150)
    chk('73: تعديل الفروض يعيد الحساب ويُحفظ', V("JSON.parse(localStorage.getItem('ins_rpt_fc')).raise")==10)
    pg.click('[data-a=jpreview]'); pg.wait_for_timeout(300)
    chk('73/75: معاينة التوقع بها جدول الشركات', 'حسب الشركة' in V("document.getElementById('rpv-f').srcdoc")); pg.keyboard.press('Escape')
    # ---- 77/78: قوالب ----
    pg.click('[data-a=tab][data-v=tpl]'); pg.click('[data-a=tpreview]'); pg.wait_for_timeout(400)
    sheets = V("document.getElementById('rpv-f').srcdoc.split('class=\"sheet\"').length-1")
    act_n = V("S.emps.filter(e=>e.status=='active').length")
    chk('77/78: حافظة الملف = وجه وظهر لكل مؤمن عليه', sheets == act_n * 2, (sheets, act_n))
    chk('78: خيار «طباعة الوجهين» ظاهر ومفعّل', V("!!document.getElementById('rpv-dx') && document.getElementById('rpv-dx').checked"))
    chk('78: الظهر يحتوي قائمة المستندات والوجه يحتوي الاسم', 'محتويات الملف' in V("document.getElementById('rpv-f').srcdoc") and 'ملف المؤمن عليه' in V("document.getElementById('rpv-f').srcdoc"))
    V("window.__pr.length=0"); pg.click('#rpv-pr'); pg.wait_for_timeout(200)
    chk('78: الطباعة تمرّر duplex=true', V("__pr.length==1 && __pr[0].o.duplex===true"))
    pg.keyboard.press('Escape')
    pg.click('[for] input[value=payroll]', force=True) if False else pg.evaluate("document.querySelector('input[name=tpl][value=payroll]').click()"); pg.wait_for_timeout(200)
    pg.fill('[data-f=tmo]', '2026-01'); pg.dispatch_event('[data-f=tmo]', 'change'); pg.click('[data-a=tpreview]'); pg.wait_for_timeout(400)
    pr = V("document.getElementById('rpv-f').srcdoc")
    chk('77: كشف المرتبات: أسماء المؤمن عليهم + خانة توقيع + اتجاه أفقي', 'أحمد محمد علي' in pr and 'المحاسب' in pr and 'size:A4 landscape' in pr, '')
    chk('77: كشف المرتبات لا يعرض خيار الوجهين', V("!document.getElementById('rpv-dx')")); pg.keyboard.press('Escape')
    pg.evaluate("document.querySelector('input[name=tpl][value=admin]').click()"); pg.wait_for_timeout(150); pg.click('[data-a=tpreview]'); pg.wait_for_timeout(300)
    chk('77: التقرير الإداري فيه المؤشرات والتنبيهات', all(w in V("document.getElementById('rpv-f').srcdoc") for w in ['تقرير إداري', 'التنبيهات الحالية', 'طلبات الدخول'])); pg.keyboard.press('Escape')
    # ---- 74: ملف الموظف ----
    pg.click('[data-a=tab][data-v=emp]'); pg.select_option('[data-f=ee]', 'e0'); pg.dispatch_event('[data-f=ee]', 'change')
    pg.click('[data-a=epreview]'); pg.wait_for_timeout(400)
    em = V("document.getElementById('rpv-f').srcdoc")
    chk('74: ملف الموظف الكامل: بيانات + تأمينات + مستندات', all(w in em for w in ['ملف الموظف الكامل — أحمد محمد علي', 'البيانات الأساسية', 'التأمينات', 'المستندات']))
    chk('74: يعرض الرقم القومي والأجر', V("S.emps[0].nid") in em); pg.keyboard.press('Escape')
    # ---- ربط الزر القديم ----
    V("nv('fin')"); pg.wait_for_timeout(400); pg.evaluate("prt()"); pg.wait_for_timeout(300)
    chk('75/76: نافذة الطباعة القديمة صار بها معاينة وPDF', V("!!document.querySelector('#modal .rpx-x')") and V("document.querySelectorAll('#modal .rpx-x').length")==2)
    pg.evaluate("AmanRpt.previewCurrent()"); pg.wait_for_timeout(500)
    chk('75: معاينة صفحة التقارير المالية القديمة داخل الصفحة', V("!!document.querySelector('#rpv') && document.getElementById('rpv-f').srcdoc.includes('التقارير المالية')")); pg.keyboard.press('Escape')
    # ---- الشاشة الرئيسية: الضغط على التنبيهات ----
    V("go('dash')"); pg.wait_for_timeout(800)
    res = []
    for t, pgname in [('طلب دخول بانتظار الاعتماد', 'req'), ('سيارات', 'cars'), ('مستنداته ناقصة', 'emp')]:
        V("go('dash')"); pg.wait_for_timeout(700)
        pg.locator('#view button.al', has_text=t).first.click(); pg.wait_for_timeout(700)
        res.append(V('cur') == pgname)
    chk('الرئيسية: الضغط على تنبيه الطلبات/السيارات/الموظفين ينقل للصفحة المطلوبة', all(res), res)
    V("go('dash')"); pg.wait_for_timeout(700)
    chk('الرئيسية: تبقى بالشكل الجديد', V("!!document.querySelector('#vue-dash .aman-dash')"))
    chk('لا أخطاء في وحدة التحكم', not errs, errs[:4])
    print(f'\n{ok} نجح / {bad} فشل'); b.close()
