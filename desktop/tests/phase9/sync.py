# اختبار المزامنة السحابية (Supabase) الموجودة في البرنامج منذ v7 — على جهازين في Chromium مع خادم Supabase مزيّف محلي.
# يحاكي: /auth/v1 (تسجيل دخول/تجديد) و/rest/v1/workspace (GET/POST/PATCH مع التزامن التفاؤلي updated_at). لا يثبت عمل Supabase الحقيقي.
#   python3 tests/phase9/sync.py
import http.server, threading, socketserver, os, sys, json, functools, time, urllib.parse, itertools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.environ.get('AMAN_ROOT') or os.path.join(os.path.dirname(__file__), '..', '..')); WEB = int(os.environ.get("WEBP", 8841)); API = int(os.environ.get("APIP", 8842))
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
# ---------- خادم Supabase مزيّف ----------
DB = {'log': [], 'row': None, 'down': False, 'inject': None, 'n': 0, 'delay': 0}
LOCK = threading.Lock()   # Postgres يجعل UPDATE ... WHERE updated_at = X ذريًا؛ الخادم المزيّف يحاكي ذلك
tick = itertools.count(1)
UID = 'u-123'
class A(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', 'apikey, authorization, content-type, prefer'); self.send_header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
    def _send(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code); self._cors(); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_OPTIONS(self): self.send_response(204); self._cors(); self.end_headers()
    def body(self):
        n = int(self.headers.get('Content-Length') or 0); return json.loads(self.rfile.read(n) or b'{}')
    def do_POST(self):
        with LOCK: return self._post()
    def _post(self):
        if DB['down']: return self.connection.close()
        u = urllib.parse.urlparse(self.path)
        if u.path.startswith('/auth/v1/'):
            j = self.body()
            if 'password' in u.query and j.get('password') != 'secret1': return self._send(400, {'error_description': 'Invalid login credentials'})
            return self._send(200, {'access_token': 'tok', 'refresh_token': 'ref', 'expires_in': 3600, 'user': {'id': UID, 'email': j.get('email', 'a@b.c')}})
        if u.path == '/rest/v1/workspace':
            if self.headers.get('Authorization') != 'Bearer tok': return self._send(401, {'message': 'bad jwt'})
            j = self.body()
            if DB['row']: return self._send(409, {'message': 'duplicate'})
            DB['row'] = {'user_id': j['user_id'], 'data': j['data'], 'updated_at': '2026-01-01T00:00:00.%06d+00:00' % next(tick)}
            return self._send(201, [DB['row']])
    def do_GET(self):
        if DB['down']: return self.connection.close()
        u = urllib.parse.urlparse(self.path)
        if u.path == '/rest/v1/workspace':
            if self.headers.get('Authorization') != 'Bearer tok': return self._send(401, {'message': 'bad jwt'})
            if DB['delay']: time.sleep(DB['delay'])
            with LOCK: row = DB['row']
            return self._send(200, [row] if row else [])
        self._send(404, {})
    def do_PATCH(self):
        with LOCK: return self._patch()
    def _patch(self):
        if DB['down']: return self.connection.close()
        u = urllib.parse.urlparse(self.path); q = urllib.parse.parse_qs(u.query); j = self.body()
        if DB['inject']:   # يحاكي جهازًا آخر عدّل بين القراءة والكتابة
            fn = DB['inject']; DB['inject'] = None; fn()
        want = q.get('updated_at', [''])[0].replace('eq.', '')
        DB['log'].append(('PATCH rev=%s cur=%s' % (want[-3:], (DB['row'] or {}).get('updated_at', '')[-3:]), [(e['id'], e['job']) for e in j['data']['emps']]))
        if not DB['row'] or DB['row']['updated_at'] != want: return self._send(200, [])
        DB['row'] = {**DB['row'], 'data': j['data'], 'updated_at': '2026-01-01T00:00:00.%06d+00:00' % next(tick)}
        return self._send(200, [DB['row']])
class TS(socketserver.ThreadingTCPServer): allow_reuse_address = True; daemon_threads = True
class W(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
threading.Thread(target=TS(('', API), A).serve_forever, daemon=True).start()
threading.Thread(target=socketserver.TCPServer(('', WEB), functools.partial(W, directory=ROOT)).serve_forever, daemon=True).start()

def seed(emps):
    return r"""(function(){ if(localStorage.getItem('__seeded'))return; localStorage.setItem('__seeded','1');
 const S={cfg:{emp:11,er:18.75,min:2700,max:16700,retAge:60},companies:[{id:'c1',name:'شركة النيل'}],emps:%s,reqs:[],pay:[],log:[],cars:[],tasks:[]};
 localStorage.setItem('ins_sys_v1',JSON.stringify(S));
 localStorage.setItem('ins_users',JSON.stringify([{u:'t',name:'مدير',salt:'s',hash:'x',role:'مدير'}]));
 localStorage.setItem('ins_ui_prefs',JSON.stringify({v:1,dash:{summary:false}}));
 localStorage.setItem('ins_sess','t'); })();""" % json.dumps(emps)
def emp(i, name, wage=3000): return {'id': i, 'cid': 'c1', 'name': name, 'code': i, 'job': 'محاسب', 'insno': i, 'nid': '2900101010%04d' % int(i[1:]), 'wage': wage, 'start': '2020-01-01', 'status': 'active', 'end': '', 'docs': [{'id': 'd' + i, 'name': 'x.pdf', 'kind': 'التحاق'}]}
with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    def dev(emps):
        c = b.new_context(viewport={'width': 1300, 'height': 850}); pg = c.new_page(); pg.set_default_timeout(5000)
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.add_init_script(seed(emps).replace('\n', ' ')); pg.goto(f'http://localhost:{WEB}/index.html'); pg.wait_for_timeout(2400); return pg
    A_ = dev([emp('e1', 'أحمد'), emp('e2', 'منى')]); B_ = dev([])
    ev = lambda pg, js: pg.evaluate(js)
    def connect(pg, choose=None):
        ev(pg, "go('set')"); pg.wait_for_timeout(1200)
        pg.fill('#cl_url', f'http://localhost:{API}'); pg.fill('#cl_key', 'anon-key'); pg.fill('#cl_em', 'office@x.com'); pg.fill('#cl_pw', 'secret1')
        pg.click('#view button:text-is("دخول")'); pg.wait_for_timeout(1500)
        if choose: pg.evaluate(f"cloudDo('{choose}')"); pg.wait_for_timeout(1500)
    names = lambda pg: sorted(ev(pg, "S.emps.map(e=>e.name)"))
    # 1) أول جهاز يرفع
    connect(A_)
    chk('الجهاز A: أول اتصال يرفع البيانات للسحابة', DB['row'] and len(DB['row']['data']['emps']) == 2, DB['row'])
    chk('المستندات لا تُرفع (تُنزع من البيانات) وإنما بياناتها المحلية تبقى', all('docs' not in e for e in DB['row']['data']['emps']) and ev(A_, "S.emps.every(e=>e.docs&&e.docs.length==1)"))
    # 2) جهاز جديد يستبدل ببيانات السحابة
    connect(B_, 'replace'); chk('الجهاز B (جديد): «استبدال» يجلب موظفي A', names(B_) == ['أحمد', 'منى'], names(B_))
    # 3) تعديل في B ينتقل لـ A
    ev(B_, "S.emps.find(e=>e.id=='e1').wage=7777;S.emps.push(Object.assign({},S.emps[0],{id:'e3',name:'سامي',nid:'29001010100099',docs:[]}));save()"); B_.wait_for_timeout(4500)
    chk('تعديل/إضافة في B تُرفع تلقائيًا (بعد ثوانٍ من save)', DB['row']['data']['emps'][0]['wage'] == 7777 and len(DB['row']['data']['emps']) == 3, [e['wage'] for e in DB['row']['data']['emps']])
    ev(A_, "cloudSync(true)"); A_.wait_for_timeout(1800)
    chk('A يستلم تعديل B وإضافته', ev(A_, "S.emps.find(e=>e.id=='e1').wage") == 7777 and 'سامي' in names(A_), names(A_))
    chk('A يحتفظ بمستنداته المحلية بعد الدمج', ev(A_, "S.emps.filter(e=>e.id!='e3').every(e=>e.docs&&e.docs.length==1)"))
    # 4) حذف في A ينتقل لـ B
    ev(A_, "S.emps=S.emps.filter(e=>e.id!='e2');save()"); A_.wait_for_timeout(4500); ev(B_, "cloudSync(true)"); B_.wait_for_timeout(1800)
    chk('حذف في A يصل لـ B', 'منى' not in names(B_) and len(names(B_)) == 2, names(B_))
    # 5) تعديلات متزامنة على سجلين مختلفين: الاثنان يبقيان
    DB['log'] = []
    ev(A_, "S.emps.find(e=>e.id=='e1').job='مدير';save()"); ev(B_, "S.emps.find(e=>e.id=='e3').job='سائق';save()"); A_.wait_for_timeout(4500); B_.wait_for_timeout(4500)
    ev(A_, "cloudSync(true)"); A_.wait_for_timeout(1500); ev(B_, "cloudSync(true)"); B_.wait_for_timeout(1500)
    if os.environ.get('DBG5'):
        print('DBG A:',ev(A_,"S.emps.map(e=>[e.id,e.job,e._u])"),ev(A_,'cs.msg'),'| B:',ev(B_,"S.emps.map(e=>[e.id,e.job,e._u])"),ev(B_,'cs.msg'),'| cloud:',[ (e['id'],e['job']) for e in DB['row']['data']['emps']])
    if os.environ.get('DBG5'):
        for l in DB['log']: print('   LOG', l)
        print('   A:', ev(A_, "S.emps.map(e=>[e.id,e.job])"), ev(A_, 'cs.msg'), ' B:', ev(B_, "S.emps.map(e=>[e.id,e.job])"), ev(B_, 'cs.msg'))
    jobs = lambda pg: {e['id']: e['job'] for e in ev(pg, "S.emps")}
    chk('تعديل سجلين مختلفين على جهازين بالتوازي: يبقى الاثنان عند الجهازين', jobs(A_) == jobs(B_) and jobs(A_)['e1'] == 'مدير' and jobs(A_)['e3'] == 'سائق', (jobs(A_), jobs(B_)))
    # 6) تعارض على السجل نفسه: الجهاز الذي يزامن ثانيًا تبقى نسخته (سلوك موثّق)
    ev(A_, "S.emps.find(e=>e.id=='e1').wage=1111;save()"); A_.wait_for_timeout(4500)
    ev(B_, "S.emps.find(e=>e.id=='e1').wage=2222;cs.apply=0;clearTimeout(cs.tm);save();clearTimeout(cs.tm)"); ev(B_, "cloudSync(true)"); B_.wait_for_timeout(2500); ev(A_, "cloudSync(true)"); A_.wait_for_timeout(1800)
    chk('تعارض على نفس السجل: لا ضياع/تلف، والقيمتان متطابقتان عند الجهازين بعد المزامنة', ev(A_, "S.emps.find(e=>e.id=='e1').wage") == ev(B_, "S.emps.find(e=>e.id=='e1').wage") and ev(A_, "S.emps.find(e=>e.id=='e1').wage") in (1111, 2222), (ev(A_, "S.emps.find(e=>e.id=='e1').wage"), ev(B_, "S.emps.find(e=>e.id=='e1').wage")))
    # 7) تعارض تفاؤلي: جهاز آخر يكتب بين القراءة والكتابة ⇒ إعادة المحاولة بدون فقد
    def other():
        d = json.loads(json.dumps(DB['row']['data'])); d['emps'].append(emp('e9', 'وارد من جهاز ثالث')); d['emps'][-1].pop('docs')
        DB['row'] = {**DB['row'], 'data': d, 'updated_at': '2026-01-01T00:00:00.%06d+00:00' % next(tick)}
    ev(A_, "S.emps.push(Object.assign({},S.emps[0],{id:'e5',name:'محلي جديد',nid:'29001010100055',docs:[]}));save()"); DB['inject'] = other; A_.wait_for_timeout(7000)
    chk('كتابة متزامنة من جهاز ثالث: إعادة المحاولة تدمج بدون فقد أي طرف', 'محلي جديد' in names(A_) and 'وارد من جهاز ثالث' in names(A_) and any(e['name'] == 'محلي جديد' for e in DB['row']['data']['emps']) and any(e['name'] == 'وارد من جهاز ثالث' for e in DB['row']['data']['emps']), (names(A_), [e['name'] for e in DB['row']['data']['emps']]))
    # 8) انقطاع الإنترنت: لا فقد ولا انهيار، ثم يتعافى
    DB['down'] = True; ev(A_, "S.emps.push(Object.assign({},S.emps[0],{id:'e6',name:'أثناء الانقطاع',nid:'29001010100066',docs:[]}));save()"); A_.wait_for_timeout(4500)
    chk('أثناء انقطاع السحابة: رسالة خطأ واضحة والبيانات محفوظة محليًا', ev(A_, "cs.msg").startswith('تعذرت المزامنة') and 'أثناء الانقطاع' in json.loads(ev(A_, "localStorage.getItem('ins_sys_v1')"))['emps'].__str__(), ev(A_, "cs.msg"))
    DB['down'] = False; ev(A_, "cloudSync(true)"); A_.wait_for_timeout(2500)
    chk('بعد عودة الاتصال: ما كُتب أثناء الانقطاع يصل للسحابة', any(e['name'] == 'أثناء الانقطاع' for e in DB['row']['data']['emps']))
    # 8b) تعديل أثناء مزامنة جارية: يُرفع بعد انتهائها سريعًا (لا ينتظر دورة الـ 45 ثانية)
    DB['delay'] = 2.5; ev(A_, "setTimeout(()=>cloudSync(),0)"); A_.wait_for_timeout(600)
    ev(A_, "S.emps.find(e=>e.id=='e1').job='أثناء-المزامنة';save()"); DB['delay'] = 0; A_.wait_for_timeout(9000)
    chk('تعديل أثناء مزامنة جارية يُرفع تلقائيًا بعد انتهائها (بدون انتظار 45 ث)', any(e['id'] == 'e1' and e['job'] == 'أثناء-المزامنة' for e in DB['row']['data']['emps']), [(e['id'], e['job']) for e in DB['row']['data']['emps']])
    chk('ولم يضع التعديل محليًا', ev(A_, "S.emps.find(e=>e.id=='e1').job") == 'أثناء-المزامنة')
    # 9) شريط الحالة السريع + الفحص
    chk('زر حالة المزامنة يظهر ويعرض «متزامن»', not ev(A_, "document.querySelectorAll('#aman-chips button')[1].hidden") and 'متزامن' in A_.inner_text('#aman-chips'), A_.inner_text('#aman-chips'))
    A_.click('#aman-chips button >> nth=1'); A_.wait_for_timeout(400); A_.click('#sy_t'); A_.wait_for_timeout(1500)
    chk('فحص الإعداد: الاتصال سليم', 'سليمة' in A_.inner_text('#sy_diag'), A_.inner_text('#sy_diag'))
    ev(A_, "closeM()"); ev(A_, "const c=CL.get();c.at='bad';CL.set(c)"); A_.click('#aman-chips button >> nth=1'); A_.wait_for_timeout(400); A_.click('#sy_t'); A_.wait_for_timeout(1500)
    chk('فحص الإعداد: جلسة/مفتاح غير صالح ⇒ تلميح عربي', 'غير صالحة' in A_.inner_text('#sy_diag'), A_.inner_text('#sy_diag'))
    # 10) حساب بكلمة سر خاطئة
    C_ = dev([]); ev(C_, "go('set')"); C_.wait_for_timeout(1200); C_.fill('#cl_url', f'http://localhost:{API}'); C_.fill('#cl_key', 'k'); C_.fill('#cl_em', 'x@y.z'); C_.fill('#cl_pw', 'wrongpw'); C_.click('#view button:text-is("دخول")'); C_.wait_for_timeout(1200)
    chk('كلمة سر سحابية خاطئة: رسالة خطأ ولا اتصال', ev(C_, "!CL.get()") and 'Invalid login' in C_.inner_text('body'), C_.inner_text('body')[-200:])
    chk('لا أخطاء JS غير ملتقطة', not errs, errs)
    b.close()
print(f'\n{ok} نجح • {bad} فشل'); sys.exit(1 if bad else 0)
