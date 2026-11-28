# اختبار منطق المسح الضوئي في الواجهة بماسح وهمي (لا يختبر WIA/الماسح الحقيقي — ذلك يحتاج Windows وجهازًا فعليًا).
import http.server, threading, socketserver, os, sys, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PORT = 8796
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
SEED = "localStorage.setItem('ins_sys_v1',JSON.stringify({cfg:{emp:11,er:18.75,min:2700,max:16700,retAge:60},companies:[{id:'c1',name:'ش'}],emps:[],reqs:[],pay:[],log:[],cars:[],tasks:[]}));localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'T',name:'T',p:'x',r:'admin',role:'admin'}]));sessionStorage.setItem('ins_sess','t');localStorage.setItem('ins_ui_prefs',JSON.stringify({v:1,dash:{summary:false}}));"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(SEED)
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(1800)
    V = lambda js: pg.evaluate(js)
    JPG = V("(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;return c.toDataURL('image/jpeg')})()")
    V("window.__cancel=0;window.__calls=0;void 0;window.desk={scanCancel:async()=>{window.__cancel++;return{ok:true}},scan:async(o)=>{window.__calls++;return window.__next(o)},refocus(){}};void 0")
    V("openM('<div id=scl></div>')")
    def answer(txt_btn):   # يضغط زر نافذة askYN
        pg.locator('#ay' if txt_btn == 'yes' else '#an').click(timeout=4000)
    # 1) نجاح: صفحة واحدة ثم «إنهاء» ⇒ ملف PDF في SC والقفل محرَّر
    V("window.__next=async()=>({pages:['%s'],data:'%s'});void 0" % (JPG, JPG))
    pg.evaluate("(()=>{window.__p=scanDoc('flat')})()"); pg.wait_for_timeout(400); answer('no'); pg.wait_for_timeout(600)
    chk('مسح ناجح: يُضاف PDF إلى المرفقات المعلّقة', V("SC.length") == 1 and V("SC[0].name.endsWith('.pdf')"), V("SC.length"))
    chk('القفل يتحرر بعد النجاح', V("scBusy") == 0)
    # 2) المهلة ⇒ سؤال «نافذة الماسح»؛ نقبل ⇒ يعاد النداء بـ legacy:true
    V("window.__lg=[];window.__next=async(o)=>{window.__lg.push(!!o.legacy);return o.legacy?{pages:['%s'],data:'%s'}:{err:'انتهت المهلة',timeout:true}};void 0" % (JPG, JPG))
    pg.evaluate("(()=>{window.__p=scanDoc('flat')})()"); pg.wait_for_timeout(500); answer('yes'); pg.wait_for_timeout(500); answer('no'); pg.wait_for_timeout(600)
    chk('انتهاء المهلة يعرض نافذة الماسح ويعيد المحاولة بوضع legacy', V("window.__lg") == [False, True], V("window.__lg"))
    chk('وبعدها القفل محرَّر وأُضيف ملف ثانٍ', V("scBusy") == 0 and V("SC.length") == 2)
    # 3) استثناء من الماسح ⇒ القفل محرَّر (لا «مسح آخر جارٍ» للأبد)
    V("window.__next=async()=>{throw new Error('boom')};void 0")
    pg.evaluate("(()=>{window.__p=scanDoc('flat')})()"); pg.wait_for_timeout(700)
    chk('استثناء أثناء المسح لا يترك القفل مقفولًا', V("scBusy") == 0)
    # 4) مسح عالق + محاولة ثانية ⇒ عرض إلغاء السابق (وليس رسالة انتظار ثابتة)
    V("window.__next=()=>new Promise(()=>{});void 0")      # لا يرد أبدًا
    pg.evaluate("(()=>{window.__p1=scanDoc('flat')})()"); pg.wait_for_timeout(300)
    chk('المسح الجاري يضبط القفل', V("scBusy") > 0)
    V("window.__next=async()=>({pages:['%s'],data:'%s'});void 0" % (JPG, JPG))
    pg.evaluate("(()=>{window.__p2=scanDoc('flat')})()"); pg.wait_for_timeout(500)
    chk('محاولة ثانية أثناء مسح عالق تعرض خيار إلغاء السابق', pg.locator('#ay').count() == 1 and 'إلغاء' in pg.locator('#ay').inner_text())
    answer('yes'); pg.wait_for_timeout(1200)
    chk('اختيار الإلغاء يستدعي desk.scanCancel ويبدأ مسحًا جديدًا', V("window.__cancel") >= 1 and pg.locator('#ay').count() == 1)
    answer('no'); pg.wait_for_timeout(500)
    chk('انتهاء المسح الجديد يحرر القفل', V("scBusy") == 0)
    chk('لا أخطاء JS', not errs, errs[:3])
    b.close()
print(f'\n{ok} نجح • {bad} فشل'); sys.exit(1 if bad else 0)
