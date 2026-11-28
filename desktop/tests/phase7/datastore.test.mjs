// اختبار طبقة البيانات (المرحلة 7) على محرك node:sqlite الحقيقي + ملفات حقيقية. التشغيل: node --no-warnings tests/phase7/datastore.test.mjs
import { createRequire } from 'module'; import fs from 'fs'; import os from 'os'; import path from 'path'; import crypto from 'crypto';
const require = createRequire(import.meta.url);
const { DataStore, norm } = require('../../datastore.js'); const { ZipReader } = require('../../zip.js'); const { Library } = require('../../library.js');
let ok = 0, bad = 0; const chk = (n, c, x) => { if (c) { ok++; console.log('✔', n); } else { bad++; console.log('✘', n, x === undefined ? '' : JSON.stringify(x)); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aman7-')); const dir = path.join(tmp, '_البيانات');
const mkS = (n) => ({ cfg: { emp: 11, er: 18.75, min: 2700, max: 16700 }, companies: [{ id: 'c1', name: 'شركة النيل' }, { id: 'c2', name: 'مصنع الدلتا' }],
  emps: Array.from({ length: n }, (_, i) => ({ id: 'e' + i, cid: i % 2 ? 'c2' : 'c1', name: i == 0 ? 'أحمد محمد عبد الرحمن' : i == 1 ? 'منى إبراهيم' : 'موظف ' + i, code: 'K' + i, nid: '2900101' + String(1000000 + i), wage: 3000 + i, status: i % 7 ? 'active' : 'resigned', docs: [{ id: 'd' + i, name: 'x.pdf', kind: 'عقد العمل' }], extra: { deep: [1, { a: null }] } })),
  reqs: [{ id: 'q1', name: 'طلب فلان', cname: 'شركة النيل', status: 'قيد الانتظار' }], pay: [], log: [{ t: 1, a: 'دخول', d: 'x' }, { t: 2, a: 'خروج' }], cars: [{ id: 'k1', plate: 'أ ب ج 123', type: 'ملاكي' }], tasks: [], fm: { modes: {}, cal: { a: 1 } }, app: {} });
const S = mkS(300), main = JSON.stringify(S), kv = { ins_users: '[{"u":"x"}]', ins_theme: 'dark', ins_ai_key_openai: 'SECRET', ins_cloud_url: 'SECRET2' };
const ds = await DataStore.open(dir, { engine: 'node' });
chk('المحرك يفتح (node:sqlite)', !!ds && ds.engine.name === 'node:sqlite');
// ---- الترحيل ----
const t0 = Date.now(); const m = ds.migrate(main, kv);
chk('الترحيل ينجح بمطابقة كل المجموعات', m.ok && m.problems.length === 0, m.problems);
chk('الأعداد: emps 300 / reqs 1 / log 2 / companies 2 (مصدر = قاعدة)', m.report.filter((r) => r.src === r.db && r.bad === 0).length === m.report.length && m.report.find((r) => r.coll === 'emps').db === 300);
chk('إعادة البناء من القاعدة تطابق الأصل حرفيًا (الترتيب والتداخل وnull)', JSON.stringify(ds.loadS()) === main);
chk('الترحيل أخذ نسخة «قبل-الترحيل» أولًا', ds.listBackups().some((b) => b.reason === 'قبل-الترحيل'));
chk('المفاتيح السرية لا تُكتب (ai_key / cloud) والعادية تُكتب', !('ins_ai_key_openai' in ds.loadKv()) && !('ins_cloud_url' in ds.loadKv()) && ds.loadKv().ins_theme === 'dark');
chk('زمن ترحيل 300 موظفًا معقول (< 3 ثوانٍ)', Date.now() - t0 < 3000, Date.now() - t0);
// ---- كشف تلف: تعديل سجل في القاعدة يجب أن يُكتشف ----
ds.A.run("UPDATE rec SET body=? WHERE coll='emps' AND id='e5'", ['{"id":"e5","name":"مُعدَّل"}']);
const v = ds.verify(main); chk('التحقق يكتشف سجلًا غير مطابق', !v.ok && v.report.find((r) => r.coll === 'emps').bad === 1, v.problems);
ds.A.run("DELETE FROM rec WHERE coll='emps' AND id='e9'");
const v2 = ds.verify(main); chk('التحقق يكتشف فرق العدد', !v2.ok && v2.problems.some((p) => /العدد/.test(p)), v2.problems);
const m2 = ds.migrate(main, kv); chk('إعادة الترحيل تصلح القاعدة', m2.ok && JSON.stringify(ds.loadS()) === main);
// ---- حفظ تزايدي ----
S.emps[3].wage = 9999; const s2 = ds.saveS(JSON.stringify(S), kv);
chk('الحفظ التزايدي يعيد كتابة المجموعة المتغيرة فقط (emps)', s2.ok && s2.changed.length === 1 && s2.changed[0] === 'emps', s2.changed);
chk('القاعدة بعد الحفظ تطابق', JSON.stringify(ds.loadS()) === JSON.stringify(S));
S.emps.pop(); S.tasks.push({ id: 't1', title: 'مهمة' }); delete S.app; ds.saveS(JSON.stringify(S), kv);
chk('حذف سجل وإضافة وحذف مفتاح كامل', JSON.stringify(ds.loadS()) === JSON.stringify(S) && ds.counts().emps === 299);
const bad1 = ds.saveS('{not json', kv); chk('JSON تالف يُرفض ولا يمسّ القاعدة', !bad1.ok && JSON.stringify(ds.loadS()) === JSON.stringify(S));
const bad2 = ds.saveS('[1,2]', kv); chk('مصفوفة بدل كائن تُرفض', !bad2.ok);
// ---- البحث ----
const r1 = ds.search('احمد محمد'); chk('بحث عربي: «احمد محمد» يجد «أحمد محمد» (توحيد الهمزة)', r1.length && r1[0].title.includes('أحمد'), r1);
chk('بحث بالتاء المربوطة/الياء: «منى ابراهيم» يجد «منى إبراهيم»', ds.search('منى ابراهيم').some((x) => x.id === 'e1'));
chk('بحث بالرقم القومي بأرقام هندية', ds.search('٢٩٠٠١٠١١٠٠٠٠٠٠').some((x) => x.id === 'e0'), ds.search('٢٩٠٠١٠١١٠٠٠٠٠٠').length);
chk('بحث باسم الشركة يجد موظفيها', ds.search('مصنع الدلتا', { limit: 10 }).length === 10 && ds.search('مصنع الدلتا', { limit: 200 }).length === 150);
chk('بحث يعبر الجداول (سيارة + طلب)', ds.search('ملاكي').some((x) => x.coll === 'cars') && ds.search('فلان').some((x) => x.coll === 'reqs'));
chk('محارف % و _ في البحث لا تُفسَّر كأنماط', ds.search('%').length === 0 && ds.search('_').length === 0);
const t1 = Date.now(); for (let i = 0; i < 50; i++) ds.search('موظف ' + (i + 10)); chk('٥٠ بحثًا على ٣٠٠ سجل < ثانية', Date.now() - t1 < 1000, Date.now() - t1);
chk('norm', norm('أحمد٣ ىة') === 'احمد3 يه');
// ---- نسخ احتياطية ----
ds.setSettings({ keep: 3 }); for (let i = 0; i < 6; i++) { ds.backup('تلقائي'); }
const auto = ds.listBackups().filter((b) => b.reason === 'تلقائي'); chk('الاحتفاظ بآخر ٣ تلقائية فقط', auto.length === 3, auto.map((b) => b.name));
const man = ds.backup('يدوي'); ds.backup('تلقائي'); ds.backup('تلقائي'); ds.backup('تلقائي'); ds.backup('تلقائي');
chk('النسخة اليدوية و«قبل-الترحيل» لا تُحذف آليًا', ds.listBackups().some((b) => b.name === man) && ds.listBackups().some((b) => b.reason === 'قبل-الترحيل'));
const rb = ds.readBackup(man); chk('قراءة نسخة: سليمة وبنفس البيانات', rb.ok && rb.main === JSON.stringify(S) && rb.counts.emps === 299, rb.err);
fs.writeFileSync(path.join(ds.snaps, 'aman-20200101-000000-يدوي.db'), 'هذا ليس sqlite');
const rb2 = ds.readBackup('aman-20200101-000000-يدوي.db'); chk('نسخة تالفة تُرفض ولا تنهار', !rb2.ok, rb2);
chk('مسار خارجي في اسم النسخة لا يُقرأ', !ds.readBackup('../../etc/passwd').ok);
chk('backupDue: لا نسخة مستحقة فورًا بعد نسخة', ds.backupDue() === false); ds.setMeta('lastBackupAt', Date.now() - 13 * 3600e3); chk('backupDue: مستحقة بعد ١٣ ساعة (الفاصل ١٢)', ds.backupDue() === true);
ds.setSettings({ auto: false }); chk('تعطيل النسخ التلقائي', ds.backupDue() === false);
// ---- تصدير/استيراد ----
const lib = new Library(path.join(tmp, 'lib')); const png = 'data:image/png;base64,' + Buffer.from('PNGDATA').toString('base64');
lib.save({ id: 'd1', name: 'عقد.png', type: 'image/png', data: png, company: 'شركة النيل', who: 'أحمد', kind: 'عقد العمل' });
const jf = path.join(tmp, 'e.json'), zf = path.join(tmp, 'e.zip');
const ej = ds.exportJson(jf, JSON.stringify(S), kv); chk('تصدير JSON', ej.ok && ej.counts.emps === 299);
const ez = ds.exportZip(zf, JSON.stringify(S), kv, { libDir: lib.dir, withDocs: true }); chk('تصدير ZIP بمستندات', ez.ok && ez.docs === 1);
const py = (await import('child_process')).spawnSync('python3', ['-c', `import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());print(','.join(z.namelist()))`, zf], { encoding: 'utf8' });
chk('ZIP يفتحه بايثون ويجتاز الفحص', /^None/.test(py.stdout) && py.stdout.includes('data.json') && py.stdout.includes('docs/'), py.stdout + py.stderr);
const pj = ds.readPackage(jf), pz = ds.readPackage(zf);
chk('استيراد JSON/ZIP يعيد نفس البيانات بعد مطابقة الأعداد', pj.ok && pz.ok && pj.main === JSON.stringify(S) && pz.main === JSON.stringify(S) && pz.docs === 1);
chk('المستخدمون لا يُصدَّرون افتراضيًا ويُصدَّرون بطلب', !('ins_users' in pj.kv) && 'ins_users' in (ds.exportJson(jf, JSON.stringify(S), kv, { withUsers: true }), ds.readPackage(jf).kv));
const o = JSON.parse(fs.readFileSync(jf, 'utf8')); o.counts.emps = 5; fs.writeFileSync(path.join(tmp, 'bad.json'), JSON.stringify(o));
chk('عدم تطابق الأعداد يُرفض', !ds.readPackage(path.join(tmp, 'bad.json')).ok);
fs.writeFileSync(path.join(tmp, 'x.json'), '{"a":1}'); chk('ملف غريب يُرفض', !ds.readPackage(path.join(tmp, 'x.json')).ok);
const zb = fs.readFileSync(zf); const mid = Math.floor(zb.length / 3); zb[mid] ^= 0xff; fs.writeFileSync(path.join(tmp, 'broken.zip'), zb);
const pb = ds.readPackage(path.join(tmp, 'broken.zip')); chk('ZIP تالف يُرفض بسبب واضح ولا ينهار', !pb.ok && !!pb.err, pb);
const lib2 = new Library(path.join(tmp, 'lib2')); const ex = ds.extractDocs(zf, lib2.dir); lib2.rebuild();
chk('استخراج المستندات للمكتبة الجديدة', ex.added === 1 && lib2.get('d1') && Buffer.from(lib2.get('d1').data.split(',')[1], 'base64').toString() === 'PNGDATA', ex);
chk('إعادة الاستخراج لا تستبدل الموجود', ds.extractDocs(zf, lib2.dir).skipped === 1);
// ---- مسار ضار داخل ZIP ----
const { ZipWriter } = require('../../zip.js'); const ev = path.join(tmp, 'evil.zip'); const zw = new ZipWriter(ev); zw.addBuffer('docs/../../evil.txt', 'x'); zw.addBuffer('docs/ok.txt', 'y'); zw.finish();
const ex2 = ds.extractDocs(ev, lib2.dir); chk('مسار «..» داخل ZIP يُتجاهل ولا يكتب خارج المكتبة', ex2.bad === 1 && !fs.existsSync(path.join(lib2.dir, 'evil.txt')) && !fs.existsSync(path.join(tmp, 'evil.txt')), ex2);
// ---- تدقيق المستندات (8) ----
const idx = lib.audit(['d1']); chk('تدقيق المكتبة: سليم', idx.ok && idx.checked === 1 && !idx.missing.length && !idx.badHash.length && !idx.orphans.length, idx);
fs.writeFileSync(path.join(lib.dir, lib._load().d1.p), 'تغيّر المحتوى'); const a2 = lib.audit(['d1']); chk('التدقيق يكتشف ملفًا تغيّر محتواه', a2.badHash.length === 1 && !a2.ok);
fs.unlinkSync(path.join(lib.dir, lib._load().d1.p)); const a3 = lib.audit(['d1']); chk('التدقيق يكتشف ملفًا مفقودًا', a3.missing.length === 1);
lib.save({ id: 'd2', name: 'يتيم.png', type: 'image/png', data: png, company: 'ش', who: 'م', kind: 'ك' }); chk('التدقيق يكتشف مستندًا يتيمًا (لا موظف يشير إليه)', lib.audit(['d1']).orphans.some((x) => x.id === 'd2'));
// ---- استمرارية: إغلاق وإعادة فتح ----
const fin = JSON.stringify(ds.loadS()); ds.close(); const ds2 = await DataStore.open(dir, { engine: 'node' });
chk('إعادة فتح القاعدة بعد الإغلاق: نفس البيانات والحالة سليمة', JSON.stringify(ds2.loadS()) === fin && ds2.status().integrity === 'ok' && ds2.status().migratedAt > 0, ds2.status());
ds2.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${ok} نجح • ${bad} فشل`); process.exit(bad ? 1 : 0);
