// اختبار وحدة مراقبة مجلد الماسح (scanwatch.js) على نظام ملفات حقيقي مؤقت. التشغيل: node tests/phase5/scanwatch.test.mjs
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const SW = require('../../scanwatch.js');
let ok = 0, bad = 0; const chk = (n, c, x = '') => { if (c) { ok++; console.log('✔', n); } else { bad++; console.log('✘', n, x); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-'));
fs.writeFileSync(path.join(dir, 'old.pdf'), 'old');                   // موجود قبل المراقبة ⇒ لا يُبلَّغ عنه
const got = [];
const w = SW.startWatch(dir, (f) => got.push(f), { stableMs: 120, maxWaitMs: 3000 });
chk('بدء المراقبة بلا خطأ', !w.error, w.error);
await sleep(150);
// ملف يُكتب على دفعات (محاكاة ماسح بطيء) ⇒ تبليغ واحد بعد اكتماله
const f1 = path.join(dir, 'scan1.pdf'); fs.writeFileSync(f1, 'a'.repeat(100)); await sleep(60); fs.appendFileSync(f1, 'b'.repeat(100)); await sleep(60); fs.appendFileSync(f1, 'c'.repeat(100));
fs.writeFileSync(path.join(dir, 'note.txt'), 'x');                    // امتداد غير مسموح
fs.writeFileSync(path.join(dir, '.hidden.jpg'), 'x');                  // اسم يبدأ بنقطة
fs.mkdirSync(path.join(dir, 'sub.jpg'));                               // مجلد باسم صورة
await sleep(900);
chk('تبليغ واحد للملف الجديد بعد استقرار حجمه الكامل (300 بايت)', got.length === 1 && got[0].name === 'scan1.pdf' && got[0].size === 300, JSON.stringify(got));
chk('النوع المرسل application/pdf', got[0] && got[0].type === 'application/pdf');
chk('لا تبليغ عن txt أو ملف مخفي أو مجلد أو ملف قديم', got.length === 1);
fs.writeFileSync(path.join(dir, 'p1.JPG'), Buffer.alloc(50, 1)); await sleep(700);
chk('امتداد بحروف كبيرة مقبول', got.some((x) => x.name === 'p1.JPG'));
fs.utimesSync(f1, new Date(), new Date()); await sleep(600);
chk('لمس الملف (تغيير وقت التعديل فقط) لا يكرر التبليغ كملف جديد إلا لو تغيّر وقته', got.filter((x) => x.name === 'scan1.pdf').length <= 2);
// قراءة آمنة
SW.readIncoming.length; const r = SW.readIncoming(dir, 'p1.JPG');
chk('قراءة الملف الوارد ترجع data URL', r.data && r.data.startsWith('data:image/jpeg;base64,'), r.err);
chk('رفض تسلل المسار (..)', !!SW.readIncoming(dir, '../x.pdf').err && !!SW.readIncoming(dir, '..\\x.pdf').err);
chk('رفض امتداد غير مسموح', !!SW.readIncoming(dir, 'note.txt').err);
chk('رفض ملف غير موجود', !!SW.readIncoming(dir, 'nope.pdf').err);
try { fs.symlinkSync(path.join(dir, 'p1.JPG'), path.join(dir, 'link.jpg')); chk('رفض الرابط الرمزي', !!SW.readIncoming(dir, 'link.jpg').err); } catch (e) { console.log('(تخطي اختبار الرابط الرمزي: غير مسموح في هذه البيئة)'); }
w.close(); const n = got.length; fs.writeFileSync(path.join(dir, 'after.pdf'), 'zzz'); await sleep(500);
chk('بعد الإغلاق لا تبليغات', got.length === n);
const bad1 = SW.startWatch(path.join(dir, 'missing'), () => {}); chk('مجلد غير موجود ⇒ خطأ بلا استثناء', !!bad1.error);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} نجح • ${bad} فشل`); process.exit(bad ? 1 : 0);
