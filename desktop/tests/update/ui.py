# اختبار واجهة التحديث (src/merge/aman-update.js) في Chromium بـ desk مزيّف. من مجلد desktop:  python3 tests/update/ui.py
import http.server, threading, socketserver, os, sys, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PORT = 8795
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
SEED = "localStorage.setItem('ins_sys_v1',JSON.stringify({cfg:{emp:11,er:18.75,min:2700,max:16700},companies:[{id:'c1',name:'ش'}],emps:[],reqs:[],pay:[],log:[],cars:[],tasks:[]}));localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'T',name:'T',p:'x',r:'admin',role:'admin'}]));sessionStorage.setItem('ins_sess','t');"
MOCK = """
window.__calls=[]; let avail=null, prog=null;
window.desk={ updInfo:async()=>({version:'15.2.0',bundled:'15.2.0',repo:'o/r',override:false,auto:true,justUpdated:window.__just||'',justNotes:'ملاحظات سابقة',rolledBack:window.__rb||null,lastCheck:Date.now()}),
 updCheck:async()=>{__calls.push('check');return window.__next||{status:'uptodate',current:'15.2.0'}},
 updInstall:async(o)=>{__calls.push('install:'+o.when);if(prog)prog({pct:50});return window.__inst||{ok:true,when:o.when,version:'15.3.0'}},
 updOk:async()=>{__calls.push('ok');return true},updAck:async()=>{__calls.push('ack')},updSkip:async(v)=>{__calls.push('skip:'+v)},updAuto:async(b)=>{__calls.push('auto:'+b)},
 onUpdAvail:(cb)=>{window.__avail=cb},onUpdProgress:(cb)=>{prog=cb}};
"""
AV = {'status': 'available', 'current': '15.2.0', 'latest': '15.3.0', 'notes': 'المرحلة 4: التنبيهات', 'size': 2097152, 'releaseUrl': 'http://r'}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 1300, 'height': 850}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(SEED + MOCK)
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(1500)
    chk('زر الإصدار يظهر في التطبيق', pg.locator('#au-chip').count() == 1 and 'v15.2.0' in pg.inner_text('#au-chip'))
    pg.wait_for_timeout(4300); chk('الواجهة تبلّغ updOk بعد 4 ثوانٍ بلا أخطاء', 'ok' in pg.evaluate('__calls'))
    pg.evaluate("__avail(%s)" % AV.__repr__().replace("'", '"'))
    chk('وصول إشعار تحديث ⇒ بانر بالإصدار والملاحظات', pg.locator('#au-bn').count() == 1 and '15.3.0' in pg.inner_text('#au-bn') and 'التنبيهات' in pg.inner_text('#au-bn'))
    chk('الزر يتحول لـ «تحديث متاح»', 'تحديث متاح' in pg.inner_text('#au-chip'))
    pg.click('#au-bn >> text=عند التشغيل القادم'); pg.wait_for_timeout(300)
    chk('«عند التشغيل القادم» ⇒ updInstall(next) ورسالة نجاح', 'install:next' in pg.evaluate('__calls') and 'القادمة' in pg.inner_text('#au-bn'))
    pg.evaluate("document.getElementById('au-bn').remove();__avail(%s)" % AV.__repr__().replace("'", '"'))
    pg.click('#au-bn >> text=تخطي هذا الإصدار'); chk('تخطي ⇒ updSkip(15.3.0) ويُغلق البانر', 'skip:15.3.0' in pg.evaluate('__calls') and pg.locator('#au-bn').count() == 0)
    pg.evaluate("__avail(%s)" % AV.__repr__().replace("'", '"')); pg.click('#au-bn >> text=تحديث الآن'); pg.wait_for_timeout(300)
    chk('«تحديث الآن» ⇒ updInstall(now)', 'install:now' in pg.evaluate('__calls'))
    pg.evaluate("window.__inst={ok:false,err:'فشل التحقق من سلامة الملف'};document.getElementById('au-bn').remove();__avail(%s)" % AV.__repr__().replace("'", '"'))
    pg.click('#au-bn >> text=تحديث الآن'); pg.wait_for_timeout(300)
    chk('فشل التحديث ⇒ رسالة بالسبب وأن شيئًا لم يتغير', 'لم يتغير شيء' in pg.inner_text('#au-bn') and 'سلامة' in pg.inner_text('#au-bn'))
    pg.evaluate("document.getElementById('au-bn').remove()")
    pg.click('#au-chip'); pg.wait_for_timeout(300)
    chk('نافذة التحديثات: الإصدار والمصدر', '15.2.0' in pg.inner_text('#au-md') and 'o/r' in pg.inner_text('#au-md'))
    pg.evaluate("window.__next={status:'uptodate',current:'15.2.0'}"); pg.click('#au-md >> text=فحص الآن'); pg.wait_for_timeout(400)
    chk('فحص يدوي ⇒ «أنت على أحدث إصدار»', 'أحدث إصدار' in pg.inner_text('#au-md'))
    pg.evaluate("window.__next={status:'error',message:'تعذر الاتصال بـ GitHub'}"); pg.click('#au-md >> text=فحص الآن'); pg.wait_for_timeout(400)
    chk('فحص فاشل ⇒ رسالة الخطأ', 'تعذر الاتصال' in pg.inner_text('#au-md'))
    pg.evaluate("window.__next=%s" % AV.__repr__().replace("'", '"')); pg.click('#au-md >> text=فحص الآن'); pg.wait_for_timeout(400)
    chk('فحص يدوي يجد تحديثًا ⇒ زر تحديث', pg.locator('#au-md >> text=تحديث الآن').count() == 1)
    pg.locator('#au-md input[type=checkbox]').uncheck(); chk('إيقاف الفحص التلقائي ⇒ updAuto(false)', 'auto:false' in pg.evaluate('__calls'))
    pg.keyboard.press('Escape'); chk('Esc يغلق النافذة', pg.locator('#au-ov').count() == 0)
    chk('لا أخطاء JS', not errs, errs)
    # بعد تحديث ناجح وبعد رجوع تلقائي
    pg2 = b.new_context().new_page(); pg2.add_init_script(SEED + MOCK + "window.__just='15.3.0';window.__rb={from:'15.4.0'};")
    pg2.goto(f'http://localhost:{PORT}/index.html'); pg2.wait_for_timeout(1500)
    chk('بعد التحديث: بانر «تم تحديث البرنامج» بالملاحظات', 'تم تحديث البرنامج إلى الإصدار 15.3.0' in pg2.inner_text('#au-bn') and 'ملاحظات سابقة' in pg2.inner_text('#au-bn'))
    pg2.click('#au-bn >> text=حسنًا'); chk('«حسنًا» ⇒ updAck', 'ack' in pg2.evaluate('__calls'))
    pg2.click('#au-chip'); pg2.wait_for_timeout(300); chk('رجوع تلقائي ⇒ تنبيه في النافذة', 'تم الرجوع تلقائيًا' in pg2.inner_text('#au-md'))
    # وضع المتصفح (بدون desk): لا شيء يظهر ولا أخطاء
    pg3 = b.new_context().new_page(); e3 = []; pg3.on('pageerror', lambda e: e3.append(str(e))); pg3.add_init_script(SEED)
    pg3.goto(f'http://localhost:{PORT}/index.html'); pg3.wait_for_timeout(1200)
    chk('بدون desk (متصفح): لا زر ولا أخطاء', pg3.locator('#au-chip').count() == 0 and not e3, e3)
    b.close()
print(f'\n{ok} نجح • {bad} فشل'); sys.exit(1 if bad else 0)
