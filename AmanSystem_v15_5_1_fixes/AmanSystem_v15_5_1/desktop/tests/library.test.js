// اختبار وحدة library.js (مكتبة المستندات + نسخة البيانات). التشغيل: node tests/library.test.js
const { Library } = require('../library.js'), fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lib-')); const L = new Library(dir);
const png = 'data:image/png;base64,' + Buffer.from('PNGDATA123').toString('base64');
let r = L.save({ id: 'ab12cd3', name: 'بطاقة:محمد?.png', type: 'image/png', data: png, company: 'شركة النور', who: 'محمد علي - 29001010101010', kind: 'بطاقة الرقم القومي' });
assert(r.ok); console.log(path.relative(dir, r.path));
let g = L.get('ab12cd3'); assert.equal(Buffer.from(g.data.split(',')[1], 'base64').toString(), 'PNGDATA123'); assert.equal(g.type, 'image/png');
fs.unlinkSync(path.join(dir, '_البيانات', 'index.json')); const L2 = new Library(dir); g = L2.get('ab12cd3'); assert(g && g.type === 'image/png'); console.log('rebuild ok, name=', g.name);
assert(L2.stats().count === 1);
L2.remove('ab12cd3'); assert(!L2.get('ab12cd3')); assert(fs.readdirSync(path.join(dir, '_المحذوفات')).length === 1);
L2.writeData(JSON.stringify({ v: 2, ls: { a: 'x'.repeat(1000) } })); L2.writeData(JSON.stringify({ v: 2, ls: {} }));
const sn = fs.readdirSync(path.join(dir, '_البيانات', 'نسخ')); console.log(sn); assert(sn.some(n => n.includes('قبل-النقص')));
assert(L2.readData().includes('"ls":{}'));
console.log('ALL OK');
