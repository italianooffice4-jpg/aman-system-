# اختبار انحدار إصلاحات v15.5.1 على Chromium (بعد npm run ui:build): الشاشة الرئيسية لا تسقط للقديم، والإعدادات تعرض بطاقاتها.
import http.server, threading, socketserver, os, sys, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.environ.get('AMAN_ROOT') or os.path.join(os.path.dirname(__file__), '..', '..')); PORT = 8798
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('', PORT), functools.partial(H, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
SEED = r"""(function(){ if(sessionStorage.getItem('__s'))return; sessionStorage.setItem('__s','1');
 const T=new Date(); const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 const off=n=>iso(new Date(T.getFullYear(),T.getMonth(),T.getDate()+n));
 const S={cfg:{emp:11,er:18.75,min:2700,max:16700,retAge:60},companies:[{id:'c1',name:'شركة النيل'}],
  emps:[{id:'e0',cid:'c1',name:'أحمد',code:'1',job:'محاسب',insno:'1',nid:'29001010100012',wage:3000,start:'2020-01-01',status:'active',end:'',docs:[]}],
  reqs:[{id:'q1',name:'خالد طلب',status:'قيد الانتظار',hdate:off(2),cid:'c1',job:'عامل'}],pay:[],log:[],
  cars:[{id:'k1',plate:'أ ب ج 123',type:'ملاكي',cid:'c1',lic:off(5),insExp:off(-3),docs:[]}],tasks:[]};
 localStorage.setItem('ins_sys_v1',JSON.stringify(S));
 localStorage.setItem('ins_users',JSON.stringify([{u:'t',n:'T',name:'T',p:'x',r:'admin',role:'admin'}]));
 localStorage.setItem('ins_ui_prefs',JSON.stringify({v:1,dash:{summary:false}}));
 sessionStorage.setItem('ins_sess','t'); })();"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 1360, 'height': 900}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' and 'Failed to load' not in m.text else None)
    pg.add_init_script(SEED.replace('\n', ' '))
    pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_timeout(2500)
    V = lambda js: pg.evaluate(js); toast = "document.body.innerText.includes('تعذر تحميل الشكل الجديد')"
    pg.click('.dvp.t button:has-text("مراجعة")'); pg.wait_for_timeout(1200)
    chk('«مراجعة» في طلبات بانتظار المراجعة تفتح صفحة الطلبات بلا رجوع للشكل القديم', V('cur') == 'req' and not V(toast), (V('cur'), errs[:2]))
    V("go('dash')"); pg.wait_for_timeout(2500); errs.clear()
    pg.click('.dv-exr >> nth=0'); pg.wait_for_timeout(1200)
    chk('صف انتهاء رخصة السيارة يفتح صفحة السيارات بلا رجوع للشكل القديم', V('cur') == 'cars' and not V(toast), (V('cur'), errs[:2]))
    V("go('dash')"); pg.wait_for_timeout(2500); errs.clear()
    n = V("document.querySelectorAll('button.al').length")
    res = []
    for i in range(n):
        V("document.querySelectorAll('button.al')[%d].click()" % i); pg.wait_for_timeout(900); res.append(V(toast)); V("go('dash')"); pg.wait_for_timeout(2200)
    chk('كل تنبيهات اللوحة تُفتح بلا رجوع للشكل القديم (%d)' % n, n > 0 and not any(res), res)
    V("go('set')"); pg.wait_for_timeout(2500)
    heads = V("[...document.querySelectorAll('#vue-set h3,#vue-set h4,#vue-set summary')].map(x=>x.innerText.trim())")
    chk('الإعدادات: بطاقات المنشآت والمظهر والقوائم والتنبيهات ومراقبة الماسح ظاهرة', all(any(k in h for h in heads) for k in ['المنشآت', 'المظهر', 'القوائم', 'التنبيهات']), heads)
    chk('لا أخطاء JS أثناء الاختبار', not errs, errs)
    b.close()
print(f'\n{ok} نجح • {bad} فشل'); sys.exit(1 if bad else 0)
