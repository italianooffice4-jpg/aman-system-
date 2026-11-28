# python3 tests/recover/page.py — صفحة الاسترجاع (page.js) تقرأ IndexedDB القديمة من أصل file:// وترسل كل مستند عبر rec.doc
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
URL = 'file:///' + ROOT.replace('\\', '/').lstrip('/') + '/tools/recover-old/index.html'
ok = bad = 0
def chk(n, c, x=''):
    global ok, bad
    if c: ok += 1; print('✔', n)
    else: bad += 1; print('✘', n, x)
MOCK = """window.__d=[];window.__m=null;window.rec={meta:async(S)=>{__m=S;return{dir:'X:\\\\Lib'}},doc:async(r)=>{__d.push(r);return{ok:true}},done:async()=>({total:__d.length,saved:__d.length,skipped:0,orphan:0,errors:[],dir:'X:\\\\Lib'})};"""
SEED = """(async()=>{localStorage.setItem('ins_sys_v1',JSON.stringify({emps:[{id:'e1',name:'أ'}],companies:[]}));
const q=indexedDB.open('ins_docs',1);q.onupgradeneeded=()=>q.result.createObjectStore('f',{keyPath:'id'});
await new Promise(r=>q.onsuccess=r);const db=q.result;const tx=db.transaction('f','readwrite');
tx.objectStore('f').put({id:'a1',name:'a.pdf',type:'application/pdf',data:'data:application/pdf;base64,QQ=='});tx.objectStore('f').put({id:'a2',name:'b.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,Qg=='});
await new Promise(r=>tx.oncomplete=r);db.close();})()"""
with sync_playwright() as p:
    b = p.chromium.launch(); c = b.new_context(); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    # زرع بيانات "قديمة" في أصل file:// أولًا بصفحة بسيطة من نفس الأصل
    pg.goto('file:///' + ROOT.replace('\\', '/').lstrip('/') + '/tools/recover-old/package.json')
    pg.evaluate(SEED); pg.wait_for_timeout(300)
    pg2 = c.new_page(); pg2.on('pageerror', lambda e: errs.append(str(e))); pg2.add_init_script(MOCK)
    pg2.goto(URL); pg2.wait_for_timeout(1500)
    d = pg2.evaluate('__d'); m = pg2.evaluate('__m')
    chk('الصفحة تقرأ بيانات الموظفين القديمة وترسلها', m and len(m.get('emps', [])) == 1, m)
    chk('ترسل كل مستندات IndexedDB (2) بمحتواها', sorted(x['id'] for x in d) == ['a1', 'a2'] and d[0]['data'].startswith('data:'), d)
    chk('تعرض ملخص النتيجة', 'تم حفظ 2 مستند' in pg2.inner_text('#res'), pg2.inner_text('body'))
    # بدون قاعدة مستندات
    c2 = b.new_context(); pg3 = c2.new_page(); pg3.add_init_script(MOCK); pg3.goto(URL); pg3.wait_for_timeout(800)
    chk('بدون مستندات قديمة: رسالة مفهومة بلا أخطاء', 'لم أجد مستندات' in pg3.inner_text('#st') and not errs, (pg3.inner_text('#st'), errs))
    b.close()
print(f'\n{ok} نجح • {bad} فشل'); sys.exit(1 if bad else 0)
