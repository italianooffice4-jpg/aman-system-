// بعد npm install: حمّل محرك OCR وابنِ واجهة Vue. فشل أيٍّ منهما لا يوقف التثبيت.
import { execSync } from 'node:child_process';
for (const [name, cmd] of [['OCR', 'node scripts/setup-ocr.mjs'], ['UI', 'npx vite build --config ui/vite.config.js']]) {
  try { execSync(cmd, { stdio: 'inherit' }); } catch (e) { console.warn('[postinstall] تخطي ' + name + ' (غير حرج): ' + (e.message || '').split('\n')[0]); }
}
