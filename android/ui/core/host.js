// نقطة الاتصال بين install.js (يغلّف الدوال القديمة) ومكوّنات Vue العامة (GlobalHost.vue).
// المكوّن يسجّل دوال الفتح عند تركيبه؛ وقبل ذلك (أو لو فشل التركيب) تبقى الدوال القديمة تعمل كما هي.
export const host = { ready: false, toggleBell() {}, closeBell() {}, openSearch() {}, openHelp() {}, seqHint() {}, openSummary() {}, maybeSummary() {}, openEmpForm: null, openEmpFile: null, openDocs: null, openReport: null };
