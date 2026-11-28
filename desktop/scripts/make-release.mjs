// يبني ملفات الإصدار: aman-web-<version>.tar.gz (index.html + src/** + version.json) و update.json
// الاستخدام: node scripts/make-release.mjs --version 15.3.0 [--notes ملف.md] [--out مجلد] [--app .]
// بلا أي مكتبات خارجية (tar يُكتب يدويًا) — يعمل على Windows وLinux وفي GitHub Actions.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const version = String(arg('version', '')).replace(/^v/i, '');
if (!/^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(version)) { console.error('استخدم: --version 15.3.0'); process.exit(1); }
const app = path.resolve(arg('app', '.'));
const out = path.resolve(arg('out', 'release-out'));
const notesFile = arg('notes', '');
const notes = notesFile && fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8').trim() : '';
const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
const shellApi = pkg.amanShellApi || 1;

// استبعاد: محرك OCR (كبير ويُثبَّت مع البرنامج) والخرائط
const SKIP = [/^src\/vendor\/tesseract\//, /\.map$/, /(^|\/)\.DS_Store$/, /Thumbs\.db$/];
const files = [];
const walk = (rel) => {
  const abs = path.join(app, rel);
  for (const n of fs.readdirSync(abs).sort()) {
    const r = rel ? rel + '/' + n : n;
    const st = fs.statSync(path.join(app, r));
    if (st.isDirectory()) walk(r);
    else if (!SKIP.some(re => re.test(r))) files.push(r);
  }
};
if (!fs.existsSync(path.join(app, 'src', 'ui', 'aman-ui.js'))) { console.error('src/ui/aman-ui.js غير موجود — شغّل npm run ui:build أولًا'); process.exit(1); }
walk('src');
files.unshift('index.html');
const versionJson = Buffer.from(JSON.stringify({ version, shellApi, date: new Date().toISOString() }));

// ---- tar (ustar) ----
const hdr = (name, size) => {
  let prefix = '';
  if (Buffer.byteLength(name) > 100) { const i = name.lastIndexOf('/', name.length - 1); let cut = -1; for (let j = 0; j < name.length; j++) if (name[j] === '/' && Buffer.byteLength(name.slice(j + 1)) <= 100 && Buffer.byteLength(name.slice(0, j)) <= 155) { cut = j; break; } if (cut < 0 || i < 0) throw new Error('اسم ملف طويل: ' + name); prefix = name.slice(0, cut); name = name.slice(cut + 1); }
  const b = Buffer.alloc(512);
  b.write(name, 0, 100); b.write('0000644\0', 100); b.write('0000000\0', 108); b.write('0000000\0', 116);
  b.write(size.toString(8).padStart(11, '0') + '\0', 124); b.write('00000000000\0', 136); b.write('        ', 148); b.write('0', 156);
  b.write('ustar\0', 257); b.write('00', 263); if (prefix) b.write(prefix, 345, 155);
  let sum = 0; for (let i = 0; i < 512; i++) sum += b[i];
  b.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
  return b;
};
const parts = [];
const add = (name, data) => { parts.push(hdr(name, data.length), data, Buffer.alloc((512 - (data.length % 512)) % 512)); };
for (const f of files) add(f, fs.readFileSync(path.join(app, f)));
add('version.json', versionJson);
parts.push(Buffer.alloc(1024));
const gz = zlib.gzipSync(Buffer.concat(parts), { level: 9 });

fs.mkdirSync(out, { recursive: true });
const asset = `aman-web-${version}.tar.gz`;
fs.writeFileSync(path.join(out, asset), gz);
const manifest = { version, shellApi, date: new Date().toISOString(), notes, asset, sha256: crypto.createHash('sha256').update(gz).digest('hex'), size: gz.length, files: files.length + 1 };
fs.writeFileSync(path.join(out, 'update.json'), JSON.stringify(manifest, null, 2));
console.log(`✔ ${asset} (${(gz.length / 1048576).toFixed(2)} MB, ${manifest.files} ملف) + update.json — الإصدار ${version}, shellApi ${shellApi}`);
