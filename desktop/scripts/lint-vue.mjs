// فحص ثابت لملفات .vue يمنع صنفين من الأخطاء لا يلتقطهما البناء ولا يظهران إلا عند الضغط (ويُسقطان الشاشة للشكل القديم):
//  1) استخدام ref/computed/watch/onMounted... بدون استيرادها من 'vue'  ← ReferenceError في setup (تختفي بطاقات الإعدادات مثلًا)
//  2) استدعاء دالة عامة من البرنامج القديم (nv, go, toast...) داخل القالب مباشرة  ← القالب لا يراها (TypeError عند الضغط)
// الاستخدام: node scripts/lint-vue.mjs   (يعمل تلقائيًا قبل npm run ui:build)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const globalFns = new Set([...html.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
const VUE = ['ref', 'reactive', 'computed', 'watch', 'watchEffect', 'onMounted', 'onBeforeUnmount', 'onUnmounted', 'nextTick', 'toRef', 'toRefs', 'shallowRef', 'onErrorCaptured', 'provide', 'inject'];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.vue') ? [path.join(d, e.name)] : []);
const idsIn = (txt) => txt.match(/[A-Za-z_$][\w$]*/g) || [];
let bad = 0;
for (const f of walk(path.join(root, 'ui', 'src'))) {
  const s = fs.readFileSync(f, 'utf8'), name = path.basename(f);
  const sc = (/<script[^>]*>([\s\S]*?)<\/script>/.exec(s) || [])[1] || '';
  const tp = (/<template>([\s\S]*)<\/template>/.exec(s) || [])[1] || '';
  const imported = new Set(); for (const m of sc.matchAll(/import\s+([\s\S]+?)\s+from/g)) idsIn(m[1].replace(/\bas\b/g, ' ')).forEach(n => imported.add(n));
  const declared = new Set([...sc.matchAll(/\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
  for (const m of sc.matchAll(/\b(?:const|let)\s*\{([^}]*)\}/g)) idsIn(m[1]).forEach(n => declared.add(n));
  for (const n of VUE) if (new RegExp('(?<![\\w$.])' + n + '\\s*\\(').test(sc) && !imported.has(n) && !declared.has(n)) { console.error(`✘ ${name}: يستخدم ${n}() بدون استيراده من 'vue'`); bad++; }
  const expr = [...tp.matchAll(/(?:@[\w.:-]+|:[\w.:-]+|v-[\w:.-]+)\s*=\s*"([^"]*)"/g)].map(m => m[1]).concat([...tp.matchAll(/\{\{([\s\S]*?)\}\}/g)].map(m => m[1])).join(' ');
  for (const n of globalFns) if (n.length > 1 && !declared.has(n) && !imported.has(n) && new RegExp('(?<![\\w$.\'"])' + n.replace(/\$/g, '\\$') + '\\s*\\(').test(expr)) { console.error(`✘ ${name}: القالب يستدعي ${n}() (دالة عامة قديمة) مباشرة — عرّف دالة في السكربت تستدعيها`); bad++; }
}
if (bad) { console.error(`\nفشل الفحص: ${bad} مشكلة`); process.exit(1); }
console.log('✔ فحص ملفات Vue: لا مشاكل');
