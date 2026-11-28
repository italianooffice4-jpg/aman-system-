# اختبار المرحلة 9 — قفل الـ PIN (86) ووضع Kiosk (87) على التطبيق الحقيقي في Chromium.  التشغيل من desktop:  python3 tests/phase9/lock.py
import http.server, threading, socketserver, os, sys, functools, hashlib, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PORT = 8821
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
HASH = hashlib.sha256(b's1:secret123').hexdigest()
SEED = r"""(function(){ if(localStorage.getItem('__seeded'))return; localStorage.setItem('__seeded','1');
 const S={cfg:{emp:11,er:18.75,min:2700,max:16700,retAge:60},companies:[{id:'c1',name:'شركة النيل'}],
  emps:[{id:'e0',cid:'c1',name:'أحمد',code:'1',job:'محاسب',insno:'1',nid:'29001010100012',wage:3000,start:'2020-01-01',status:'active',end:'',docs:[]}],reqs:[],pay:[],log:[],cars:[],tasks:[]};
 localStorage.setItem('ins_sys_v1',JSON.stringify(S));
 localStorage.setItem('ins_users',JSON.stringify([{u:'t',name:'مدير الاختبار',salt:'s1',hash:'__H__',role:'مدير'}]));
 localStorage.setItem('ins_ui_prefs',JSON.stringify({v:1,dash:{summary:false}}));
 localStorage.setItem('ins_sess','t'); })();""".replace('__H__', HASH)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1300, 'height': 850}); pg = ctx.new_page(); errs = []
    pg.set_default_timeout(4000); ctx.set_default_timeout(4000)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' and 'Failed to load' not in m.text else None)
    pg.add_init_script(SEED.replace('\n', ' '))
    URL = f'http://localhost:{PORT}/index.html'
    def load():
        pg.goto(URL); pg.wait_for_timeout(2600)
    V = lambda js: pg.evaluate(js)
    load()
    chk('الوحدة محمّلة وبطاقة «الأمان والقفل» تظهر في الإعدادات', V("!!window.amanLock") and (V("go('set')") or True) and (pg.wait_for_timeout(1500) or True) and 'الأمان والقفل' in pg.inner_text('#view') and 'Kiosk' in pg.inner_text('#view'))
    chk('قبل تفعيل القفل: لا زر قفل', V("document.querySelector('#aman-chips button').hidden"))
    # ---- إعداد PIN ----
    V("amanLock.setupPin()"); pg.wait_for_timeout(300)
    def setpin(new, conf, old=None):
        if old is not None: pg.fill('#lk_old', old)
        pg.fill('#lk_new', new); pg.fill('#lk_new2', conf); pg.click('#lk_ok'); pg.wait_for_timeout(900)
    setpin('1111', '1111'); chk('PIN متكرر الأرقام يُرفض', 'أقوى' in pg.inner_text('#lk_err'), pg.inner_text('#lk_err'))
    setpin('2468', '2469'); chk('تأكيد غير مطابق يُرفض', 'غير مطابق' in pg.inner_text('#lk_err'))
    setpin('٢٤٦٨', '2468'); pg.wait_for_timeout(500)
    c = V("amanLock.cfg()")
    chk('PIN يُحفظ مجزّأً (PBKDF2) لا نصًّا، بملح عشوائي، وبأرقام عربية يُقبل', c['on'] and len(c['hash']) == 64 and '2468' not in json.dumps(c) and len(c['salt']) == 32 and c['len'] == 4, c)
    chk('بعد التفعيل زر القفل يظهر', not V("document.querySelector('#aman-chips button').hidden"))
    # ---- القفل والفتح ----
    V("void amanLock.lock('manual')"); pg.wait_for_timeout(500)
    chk('القفل: النافذة ظاهرة والمحتوى مخفي ومعطّل (inert)', V("!!document.getElementById('aman-lock')") and V("document.documentElement.dataset.locked")=='1' and V("document.getElementById('view').closest('.app').inert===true || document.querySelector('.app').inert===true") and V("amanLock.isLocked()"))
    chk('المحتوى الخلفي غير مرئي (visibility:hidden)', V("getComputedStyle(document.querySelector('.app')).visibility")=='hidden')
    pg.fill('#al-in', '1357'); pg.wait_for_timeout(900)
    chk('PIN خاطئ لا يفتح ويعرض رسالة', V("amanLock.isLocked()") and 'غير صحيح' in pg.inner_text('#al-msg'), pg.inner_text('#al-msg'))
    pg.fill('#al-in', '2468'); pg.wait_for_timeout(900)
    chk('PIN صحيح يفتح (وبالإدخال التلقائي عند اكتمال الطول)', not V("amanLock.isLocked()") and V("!document.getElementById('aman-lock')") and V("document.querySelector('.app').inert!==true"))
    # ---- تأخير المحاولات ----
    V("void amanLock.lock('manual')"); pg.wait_for_timeout(400)
    for _ in range(3): pg.fill('#al-in', '9999'); pg.wait_for_timeout(700)
    chk('3 محاولات خاطئة ⇒ انتظار إجباري', V("amanLock._wait()") >= 25 and 'انتظر' in pg.inner_text('#al-msg'), (V("amanLock._wait()"), pg.inner_text('#al-msg')))
    pg.fill('#al-in', '2468'); pg.wait_for_timeout(700)
    chk('أثناء الانتظار حتى الـ PIN الصحيح مرفوض', V("amanLock.isLocked()"))
    # ---- الإعادة أثناء القفل ----
    pg.reload(); pg.wait_for_timeout(2600)
    chk('إعادة تحميل الصفحة وهي مقفولة لا تفتحها (يبقى القفل + حاجز مبكر)', V("amanLock.isLocked()") and V("!!document.getElementById('aman-lock')"))
    # ---- نسيت PIN: كلمة سر الحساب ----
    V("localStorage.setItem('ins_lock_try',JSON.stringify({n:0,until:0}))"); pg.reload(); pg.wait_for_timeout(2600)
    pg.click('#al-forgot'); pg.fill('#al-pw', 'wrong'); pg.click('#al-ok'); pg.wait_for_timeout(1200)
    chk('كلمة سر حساب خاطئة لا تفتح', V("amanLock.isLocked()"))
    V("localStorage.setItem('ins_lock_try',JSON.stringify({n:0,until:0}))")
    pg.fill('#al-pw', 'secret123'); pg.click('#al-ok'); pg.wait_for_timeout(1200)
    chk('كلمة سر الحساب الصحيحة تفتح (نسيت الـ PIN)', not V("amanLock.isLocked()"))
    # ---- Ctrl+L ----
    pg.keyboard.press('Control+l'); pg.wait_for_timeout(500); chk('Ctrl+L يقفل', V("amanLock.isLocked()"))
    pg.fill('#al-in', '2468'); pg.wait_for_timeout(800)
    # ---- قفل الخمول ----
    V("amanLock.patch({idle:0.05})"); pg.wait_for_timeout(8500)
    chk('قفل تلقائي بعد الخمول', V("amanLock.isLocked()") and 'عدم النشاط' in pg.inner_text('#aman-lock'))
    pg.fill('#al-in', '2468'); pg.wait_for_timeout(800); V("amanLock.patch({idle:5})")
    # ---- القفل عند الفتح ----
    V("amanLock.patch({atStart:true});sessionStorage.removeItem('ins_lock_boot')"); pg.reload(); pg.wait_for_timeout(3000)
    chk('«اقفل عند الفتح»: يُقفل بعد تسجيل الدخول', V("amanLock.isLocked()"))
    pg.fill('#al-in', '2468'); pg.wait_for_timeout(800); V("amanLock.patch({atStart:false})")
    # ---- Kiosk ----
    before = V("localStorage.getItem('ins_sys_v1')")
    V("amanLock.patchK({pages:['dash','emp'],page:'dash'})")
    V("amanLock.startKiosk()"); pg.wait_for_timeout(1500)
    chk('Kiosk: الصفحة بلا قوائم/شريط علوي ويعمل الوضع', V("amanLock.isKiosk()") and V("getComputedStyle(document.getElementById('side')).display")=='none' and V("getComputedStyle(document.querySelector('.top')).display")=='none')
    V("go('set')"); pg.wait_for_timeout(500)
    chk('Kiosk: الانتقال لصفحة غير مسموحة (الإعدادات) ممنوع', V("cur")!='set')
    V("go('emp')"); pg.wait_for_timeout(800); chk('Kiosk: صفحة مسموحة (الموظفون) تُفتح', V("cur")=='emp')
    V("go('fin')"); pg.wait_for_timeout(400); chk('Kiosk: صفحة غير مسموحة (المالية) ممنوعة', V("cur")=='emp')
    V("editE('e0')"); pg.wait_for_timeout(500)
    chk('Kiosk: زر التعديل معطّل (لا يفتح نموذجًا)', not V("document.getElementById('modal').classList.contains('on')") and not V("!!document.querySelector('.ef-ov')"))
    V("S.emps[0].wage=99999;save()"); pg.wait_for_timeout(300)
    chk('Kiosk: حتى save() المباشر لا يكتب على بيانات البرنامج المحفوظة', V("localStorage.getItem('ins_sys_v1')")==before)
    V("localStorage.setItem('ins_users','[]')"); chk('Kiosk: حسابات المستخدمين محمية من الكتابة', V("JSON.parse(localStorage.getItem('ins_users')).length")==1)
    chk('Kiosk: قائمة السياق ممنوعة', V("(()=>{const e=new MouseEvent('contextmenu',{cancelable:true,bubbles:true});document.body.dispatchEvent(e);return e.defaultPrevented})()"))
    # الخروج
    pg.keyboard.press('Control+Shift+Q'); pg.wait_for_timeout(600)
    chk('Ctrl+Shift+Q يطلب PIN للخروج', V("!!document.getElementById('aman-lock')") and 'الخروج من وضع Kiosk' in pg.inner_text('#aman-lock'))
    pg.fill('#al-in', '1357'); pg.wait_for_timeout(900); chk('PIN خاطئ لا يُخرج', V("amanLock.isKiosk()"))
    V("localStorage.setItem('ins_lock_try',JSON.stringify({n:0,until:0}))")
    pg.fill('#al-in', '2468'); pg.wait_for_timeout(2800)
    chk('PIN صحيح يُخرج من Kiosk ويعيد التحميل', not V("amanLock.isKiosk()") and V("getComputedStyle(document.getElementById('side')).display")!='none' and V("localStorage.getItem('ins_kiosk')")==None)
    chk('بعد الخروج: التعديل الذي حدث في الذاكرة أثناء Kiosk لم يُحفظ', V("S.emps[0].wage")==3000 and V("localStorage.getItem('ins_sys_v1')")==before)
    # النقرات الخمس
    V("amanLock.startKiosk()"); pg.wait_for_timeout(1200)
    for _ in range(5): pg.evaluate("document.getElementById('aman-kx').click()")
    pg.wait_for_timeout(600); chk('5 ضغطات سريعة على زاوية الخروج تطلب PIN', V("!!document.getElementById('aman-lock')"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    chk('إلغاء نافذة الخروج يبقي Kiosk', V("amanLock.isKiosk()") and not V("!!document.getElementById('aman-lock')"))
    V("localStorage.removeItem('ins_kiosk')")  # تنظيف
    # kiosk بلا PIN
    pg2 = ctx.new_page(); pg2.add_init_script(SEED.replace('\n',' ').replace("localStorage.getItem('__seeded')","false")); pg2.goto(URL.replace('index.html','index.html?x=1')); pg2.wait_for_timeout(2600)
    pg2.evaluate("localStorage.removeItem('ins_lock');localStorage.removeItem('ins_kiosk')"); pg2.reload(); pg2.wait_for_timeout(2500)
    pg2.evaluate("amanLock.startKiosk()"); pg2.wait_for_timeout(600)
    chk('Kiosk بدون PIN: لا يبدأ ويطلب تعيين PIN', not pg2.evaluate("amanLock.isKiosk()") and pg2.evaluate("document.getElementById('modal').classList.contains('on')"))
    chk('لا أخطاء JS أثناء الاختبار', not errs, errs)
    b.close()
print(f'\n{ok} نجح • {bad} فشل'); sys.exit(1 if bad else 0)
