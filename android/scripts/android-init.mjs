// يُنشئ مشروع أندرويد (مرة واحدة) ويضبط الأيقونة وصلاحية الكاميرا.
import { existsSync, readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
const run = (c) => execSync(c, { stdio: 'inherit' });
run('npm run prepare-www');
if (!existsSync('android')) run('npx cap add android');
const mf = 'android/app/src/main/AndroidManifest.xml';
let m = readFileSync(mf, 'utf8');
if (!m.includes('android.permission.CAMERA')) {
  m = m.replace('</manifest>', '    <uses-permission android:name="android.permission.CAMERA" />\n</manifest>');
  writeFileSync(mf, m);
}
// استخدم نفس ملف أيقونة نسخة الكمبيوتر كمصدر وحيد لأيقونات أندرويد.
const desktopIcon = '../desktop/icon-512.png';
if (!existsSync(desktopIcon)) throw new Error('ملف أيقونة الكمبيوتر غير موجود: ' + desktopIcon);
if (!existsSync('assets')) throw new Error('مجلد assets غير موجود');
copyFileSync(desktopIcon, 'assets/icon.png');
// لا نسمح لملف icon-only القديم بأن يطغى على أيقونة الكمبيوتر في adaptive launcher icon.
if (existsSync('assets/icon-only.png')) unlinkSync('assets/icon-only.png');
run('npx capacitor-assets generate --android --iconBackgroundColor "#ffffff" --iconBackgroundColorDark "#ffffff"');
run('npx cap sync android');
console.log('\nتم. افتح مجلد android في Android Studio أو شغّل: cd android && gradlew assembleDebug');
