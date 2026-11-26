import re,sys,subprocess,json,tempfile,os
from html.parser import HTMLParser
ES='/opt/npm-tools/node_modules/.bin/esbuild'
KW=set('true false null undefined this in of typeof instanceof new void delete if else return const let var function async await NaN Infinity'.split())
GLOBALS=set('window document console Math Object Array JSON String Number Boolean Date Set Map Promise RegExp parseInt parseFloat isNaN encodeURIComponent localStorage sessionStorage setTimeout clearTimeout event $event $attrs $slots $emit $props'.split())
# دوال/متغيرات البرنامج القديم المسموح بها في القوالب (تعريفات عامة في index.html)
LEGACY=set('S ic nv go th AL aGo alerts hay byRecent cn Q CS TS prof empOf editC delC editE nz toast flt ep qm cm rows EL R'.split())

def split_sfc(t):
    m=re.search(r'<script setup[^>]*>(.*?)</script>',t,re.S); sc=m.group(1) if m else ''
    m2=re.search(r'<template>(.*)</template>',t,re.S); tp=m2.group(1) if m2 else ''
    return sc,tp

def script_decls(sc):
    d=set()
    for m in re.finditer(r'\bimport\s+([^;]+?)\s+from',sc,re.S):
        for x in re.findall(r'[A-Za-z_$][\w$]*',m.group(1).replace(' as ',' ')): d.add(x)
    for m in re.finditer(r'\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)',sc): d.add(m.group(1))
    for m in re.finditer(r'(?:^|[;\n])\s*(?:const|let)\s+[^;\n]*',sc):
        for x in re.findall(r',\s*([A-Za-z_$][\w$]*)\s*=\s*(?:ref|reactive|computed|\(|[\[\{\'"\d]|[A-Za-z_$])',m.group(0)): d.add(x)
    for m in re.finditer(r'\b(?:const|let)\s*[\{\[]([^\}\]=]+)[\}\]]\s*=',sc):
        for x in re.findall(r'[A-Za-z_$][\w$]*',m.group(1)): d.add(x)
    for m in re.finditer(r'defineProps\(\s*\{',sc):          # مفاتيح المستوى الأول فقط (مع التعامل مع الأقواس المتداخلة)
        i=m.end(); depth=1; start=i
        while i<len(sc) and depth:
            depth+= (sc[i]=='{')-(sc[i]=='}'); i+=1
        body=sc[start:i-1]; depth=0; cur=''
        for ch in body:
            if ch in '{[(': depth+=1
            elif ch in '}])': depth-=1
            if depth==0: cur+=ch
        for x in re.findall(r'(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:',cur): d.add(x)
    for m in re.finditer(r'defineProps\(\[([^\]]*)\]',sc):
        for x in re.findall(r"['\"]([\w$]+)['\"]",m.group(1)): d.add(x)
    return d

class P(HTMLParser):
    def __init__(s): super().__init__(convert_charrefs=True); s.stack=[]; s.err=[]; s.exprs=[]; s.scopes=[]
    VOID={'input','br','img','hr','meta','link'}
    def handle_starttag(s,tag,attrs):
        if tag in s.VOID: s.collect(attrs,tag); return
        s.stack.append((tag,s.getpos())); s.collect(attrs,tag)
    def handle_startendtag(s,tag,attrs): s.collect(attrs,tag)
    def handle_endtag(s,tag):
        if tag in s.VOID: return
        if not s.stack or s.stack[-1][0]!=tag: s.err.append(f'وسم إغلاق غير متطابق </{tag}> عند {s.getpos()} (المفتوح: {s.stack[-1] if s.stack else None})')
        else: s.stack.pop()
    def handle_data(s,d):
        for m in re.finditer(r'\{\{(.*?)\}\}',d,re.S): s.exprs.append((m.group(1),[],'{{}}'))
    def collect(s,attrs,tag):
        loc=[]
        for k,v in attrs:
            if v is None: continue
            if k=='v-for':
                m=re.match(r'\s*\(?([^)]*?)\)?\s+(?:in|of)\s+(.*)',v,re.S)
                if m:
                    loc+= re.findall(r'[A-Za-z_$][\w$]*',m.group(1)); s.exprs.append((m.group(2),[],k))
            elif k.startswith('#') or k.startswith('v-slot'):
                loc+= re.findall(r'[A-Za-z_$][\w$]*',v)
            elif k.startswith(':') or k.startswith('@') or k.startswith('v-'):
                s.exprs.append((v,[],k))
        s.cur=loc
        s.scopes.append((tag,loc))

def check(path):
    t=open(path,encoding='utf-8').read(); sc,tp=split_sfc(t); probs=[]
    # 1) صياغة السكربت
    with tempfile.NamedTemporaryFile('w',suffix='.js',delete=False,encoding='utf-8') as f: f.write(sc); fn=f.name
    r=subprocess.run([ES,fn,'--format=esm','--log-level=error'],capture_output=True,text=True); os.unlink(fn)
    if r.returncode: probs.append('SCRIPT: '+r.stderr.strip()[:400])
    # 2) توازن الوسوم
    p=P(); p.feed(tp)
    probs+= p.err; 
    if p.stack: probs.append(f'وسوم لم تُغلق: {p.stack[-3:]}')
    # 3) المعرّفات
    decl=script_decls(sc)|set(re.findall(r'\b(?:defineProps|defineEmits|defineExpose)\b',sc))
    loc_all=set(); 
    for tag,l in p.scopes: loc_all|=set(l)
    unknown={}
    for e,_,k in p.exprs:
        e2=re.sub(r"'[^']*'|\"[^\"]*\"|`[^`]*`",'""',e)
        e2=re.sub(r'\$event[\w$.]*','',e2)
        e2=re.sub(r'(?<![\w$])\.[\w$]+','',e2)           # .prop
        e2=re.sub(r'\.[A-Za-z_$][\w$]*','',e2)
        for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)(?![\w$])(?!\s*:(?!:))',e2):
            w=m.group(1)
            if w in KW or w in GLOBALS or w in decl or w in loc_all or w in LEGACY: continue
            # معاملات الدوال السهمية  (a, b) => / a =>
            if re.search(r'(?:\(|,|\s)'+re.escape(w)+r'\s*(?:,[^)]*)?\)?\s*=>',e2): continue
            if re.search(r'[\{,]\s*'+re.escape(w)+r'\s*:',e): continue
            unknown.setdefault(w,k)
    if unknown: probs.append('معرّفات في القالب غير معرّفة في السكربت: '+', '.join(f'{w}({k})' for w,k in unknown.items()))
    return probs

bad=0
for path in sys.argv[1:]:
    pr=check(path); print(('✗ ' if pr else '✓ ')+os.path.basename(path)); 
    for x in pr: print('    ',x); bad+= bool(pr)
sys.exit(1 if bad else 0)
