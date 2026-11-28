# تعليمات التشغيل والبناء

**الرموز:** ✅ جُرِّب فعليًا في بيئتي (Linux بلا إنترنت) • 👤 المستخدم نفّذه (دليل ضمني فقط) • ⚠️ مقترح **لم يُجرَّب**.
كل الأوامر تُنفَّذ **من داخل مجلد المشروع المعني** (`desktop/` أو `android/`).

---

## أ) نسخة الكمبيوتر — `desktop/` (Windows)

### الأدوات
| الأداة | الإصدار | ملاحظة |
|---|---|---|
| Windows | 10/11 | المسح الضوئي يعتمد على WIA + Windows PowerShell 5.1 (مدمج) |
| Node.js (+npm) | LTS **20.x أو 22.x** | في بيئتي استُخدم v22 فقط لاختبارات الصياغة |
| Electron | `^33.2.0` | يُنزَّل بـ `npm install` |
| electron-builder | `^25.1.8` | لبناء المثبّت |
| Vite / @vitejs/plugin-vue | `^6.0.0` / `^5.2.0` | لبناء واجهة Vue (تجربة) |
| Vue / PrimeVue / @primeuix/themes | `^3.5.13` / `^4.3.0` / `^1.0.0` | للتجربة فقط (devDependencies) |

الإصدارات الفعلية المحددة في `package.json` (مولَّدة منه):

الإصدار في package.json: `13.0.0-pilot` (اسم المنتج: Aman System)

| الحزمة | الإصدار المحدد | النوع |
|---|---|---|
| `xlsx` | `0.18.5` | تشغيل |
| `tesseract.js` | `5.1.1` | تشغيل |
| `tesseract.js-core` | `5.1.0` | تشغيل |
| `electron` | `^33.2.0` | تطوير/بناء |
| `electron-builder` | `^25.1.8` | تطوير/بناء |
| `vite` | `^6.0.0` | تطوير/بناء |
| `@vitejs/plugin-vue` | `^5.2.0` | تطوير/بناء |
| `vue` | `^3.5.13` | تطوير/بناء |
| `primevue` | `^4.3.0` | تطوير/بناء |
| `@primeuix/themes` | `^1.0.0` | تطوير/بناء |

> لا يوجد `package-lock.json` (انظر NEXT_STEPS خطوة 3). الإصدارات بصيغة `^` ستُحدَّد فعليًا عند أول تثبيت.

### الأوامر
| الأمر | الغرض | الحالة |
|---|---|---|
| `node --check main.js preload.js library.js src/merge/aman-v12-library.js src/merge/aman-v13-ui.js scripts/*.mjs` (كل ملف على حدة) | فحص الصياغة | ✅ نجح |
| `node tests/library.test.js` | اختبار مكتبة المستندات | ✅ `ALL OK` |
| `node tests/page-library.sim.js` | محاكاة سكربت المكتبة في الواجهة | ✅ نجح |
| `node tests/page-settings.sim.js` | محاكاة كارت الإعدادات | ✅ نجح |
| `1-install.bat` ≡ `npm install` (ثم `postinstall`: تحميل OCR + `vite build`) | تثبيت التبعيات وبناء الواجهة | ⚠️ لم يُجرَّب بنسخة v13 (يحتاج إنترنت) |
| `npm run setup-ocr` (`node scripts/setup-ocr.mjs`) | تنزيل محرك/لغة OCR العربي إلى `src/vendor/` | ⚠️ لم يُجرَّب (إنترنت) |
| `npm run ui:build` (`vite build --config ui/vite.config.js`) | بناء واجهة Vue إلى `src/ui/aman-ui.js` و`.css` | ⚠️ لم يُجرَّب — **لم يُترجَم الـ SFC من قبل** |
| `2-run.bat` ≡ `npm run ui:build` ثم `npm start` (`electron .`) | تشغيل البرنامج للتجربة | ⚠️ لم يُجرَّب |
| `3-build-installer.bat` ≡ `npm run ui:build` ثم `npm run dist` (`electron-builder --win nsis portable`) | بناء المثبّت والنسخة المحمولة | ⚠️ لم أجرّبه؛ 👤 المستخدم بنى وثبّت مثبّتًا من نسخة v11 للغلاف (مسار التثبيت ظهر في لقطته) |
| `powershell -NoProfile -ExecutionPolicy Bypass -STA -File scripts\scan.ps1 -Mode list` | تشخيص يدوي: قائمة الماسحات (JSON) | ⚠️ لم يُجرَّب |

### المخرجات المتوقعة (افتراضيات electron-builder — **لم تُتحقق**)
* `dist/Aman System Setup 13.0.0-pilot.exe` (مثبّت NSIS)
* `dist/Aman System 13.0.0-pilot.exe` (محمولة)
* `dist/win-unpacked/` (مجلد غير مضغوط)

### أماكن البيانات على جهاز المستخدم (متوقعة)
* التثبيت: `%LOCALAPPDATA%\Programs\Aman System\` (👤 ظهر في لقطته).
* بيانات البرنامج + `aman-config.json`: `%APPDATA%\Aman System\`.
* المكتبة: المجلد الذي اختاره (الافتراضي `Documents\Aman Library`).

### التوقيع
غير موقّعة (تحذير SmartScreen عند التشغيل أول مرة). التوقيع اختياري: متغيرات `CSC_LINK` و`CSC_KEY_PASSWORD` (نموذج فارغ في `config-samples/`). الأسرار لا تُضمَّن في المشروع.

---

## ب) نسخة أندرويد — `android/`

### الأدوات
| الأداة | الإصدار | ملاحظة |
|---|---|---|
| Node.js | 20+ | (workflow يستخدم 20) |
| JDK | 21 | يتطلبه Capacitor 7 — حسب علمي، تحقق من توثيق Capacitor |
| Android Studio + Android SDK | حديث | للبناء المحلي (يفتح مرة ليثبّت الـ SDK ويضبط `ANDROID_HOME`) |
| Capacitor | `^7.0.0` | cli/core/android/filesystem/share |
| GitHub Actions (بديل لـ Android Studio) | `ubuntu-latest`, `actions/setup-java@v4`, `android-actions/setup-android@v3` | `.github/workflows/build-apk.yml` |

الإصدارات المحددة في `package.json` (مولَّدة منه):

الإصدار في package.json: `11.0.0` (مبني على كود v11؛ لا يتضمن v12/v13)

| الحزمة | الإصدار المحدد | النوع |
|---|---|---|
| `@capacitor/android` | `^7.0.0` | تشغيل |
| `@capacitor/core` | `^7.0.0` | تشغيل |
| `@capacitor/filesystem` | `^7.0.0` | تشغيل |
| `@capacitor/share` | `^7.0.0` | تشغيل |
| `tesseract.js` | `5.1.1` | تشغيل |
| `tesseract.js-core` | `5.1.0` | تشغيل |
| `xlsx` | `0.18.5` | تشغيل |
| `@capacitor/assets` | `^3.0.5` | تطوير/بناء |
| `@capacitor/cli` | `^7.0.0` | تطوير/بناء |

### الأوامر
| الأمر | الغرض | الحالة |
|---|---|---|
| `node --check android-shim.js scripts/*.mjs` | فحص الصياغة | ✅ نجح |
| `node scripts/prepare-www.mjs` | تجميع الواجهة في `www/` وحقن `android-shim.js` | ✅ جُرِّب **بملف xlsx وهمي** (نجح؛ النسخة الحقيقية تتطلب `npm install`) |
| `npm install` | تثبيت التبعيات (+ تحميل OCR) | ⚠️ لم يُجرَّب |
| `npm run android:init` | `prepare-www` + `cap add android` + صلاحية الكاميرا + أيقونة + `cap sync` | ⚠️ لم يُجرَّب |
| `cd android && gradlew.bat assembleDebug` (ويندوز) / `./gradlew assembleDebug` (لينكس/ماك) | بناء APK | ⚠️ لم يُجرَّب |
| `build-apk.bat` (يجمع ما سبق على ويندوز) | بناء بضغطة واحدة | ⚠️ لم يُجرَّب |
| GitHub Actions ← Build APK ← Run workflow | بناء على السحابة | ⚠️ لم يُجرَّب (المستخدم لم يرفع مستودعًا بعد) |
| `npm run android:sync` | إعادة تجميع `www` ومزامنة بعد أي تعديل | ⚠️ لم يُجرَّب |

### المخرجات المتوقعة
* محليًا (من داخل مجلد المشروع `android/` في هذا الأرشيف): `android/app/build/outputs/apk/debug/app-debug.apk` — أي أن مجلد المنصة الذي يُولِّده `cap add android` يُنشأ **داخل** مجلد المشروع ويحمل نفس الاسم `android/`.
* على GitHub: ملف artifact باسم `AmanSystem-apk` يحوي `app-debug.apk`.

### التوقيع
APK الحالي موقّع بمفتاح **debug** (يُثبَّت عاديًا بتفعيل «مصادر غير معروفة»؛ لا يصلح للنشر على Google Play). توقيع release يتطلب مفتاحًا يملكه المستخدم (`.jks`) وكلمات مروره — **لا تُضمَّن في أي أرشيف**. نموذج فارغ: `config-samples/android-signing.sample.properties`. التنفيذ لم يتم (NEXT_STEPS خطوة 7).

---

## ج) استكشاف أخطاء سريع
* فشل `vite build`: انسخ نص الخطأ كاملًا (غالبًا صياغة في `ui/src/EmpPage.vue`)؛ البرنامج يعمل بالشكل القديم بدون الحزمة.
* خطأ في المسح: شغّل أمر `scan.ps1 -Mode list` اليدوي أعلاه؛ تأكد أن الماسح معرَّف في Windows. لو تعريف HP لا يدعم WIA المباشر يرجع البرنامج للشاشة القديمة، أو استخدم «جلب آخر ملف» من مجلد HP Scan.
* خطأ «Missing closing '}'» في PowerShell = مشكلة ترميز: الملف يجب أن يبقى ASCII فقط + BOM (لا تضع نصًا عربيًا في `scan.ps1`).
