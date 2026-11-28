// (1) بيانات S «تفاعلية»: نُعلِم الواجهة بعد كل حفظ للبيانات الرئيسية بدل ما كل صفحة تتذكر تعيد الرسم بنفسها.
// الآلية: اعتراض الكتابة في localStorage['ins_sys_v1'] (نفس المفتاح — لا تغيير في التخزين) ثم إطلاق حدث مجمَّع.
// لماذا ليس Proxy عميقًا على S؟ لأن S يُستبدل بالكامل في الاسترجاع/المزامنة، وتُستعمل عليه عمليات مثل sort/splice المباشرة،
// والكود القديم يعتمد على save() كنقطة حفظ واحدة؛ فاعتراض الحفظ أأمن ويغطي كل المسارات.
import { createBus } from './util.js';

export const MAIN_KEY = 'ins_sys_v1';
const bus = createBus();
let ver = 0, timer = 0, hooked = false;

export const dataVersion = () => ver;
export const onData = (fn) => bus.on(fn);
export function touch() {
  if (timer) return;
  timer = setTimeout(() => { timer = 0; ver++; bus.emit(ver); }, 30);   // تجميع الحفظات المتتالية (استيراد Excel مثلًا) في إعلان واحد
}
export function installStore() {
  if (hooked) return; hooked = true;
  const si = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k) {
    const r = si.apply(this, arguments);
    if (this === localStorage && k === MAIN_KEY) touch();
    return r;
  };
}
