<script setup>
import { computed, ref } from 'vue';
import { useDataVersion, usePrefs } from './core/bridge.js';
import { THEMES, BGS, FONTS, SIZES, NAV_PROTECTED, setTheme, setColors, setPrefs, resetAppearance, setNavHidden, setViewMode } from './core/prefs.js';
import { navItems, companies, emps } from './core/legacy.js';
import { host } from './core/host.js';
import { setAlertPrefs } from './core/prefs.js';
import { KINDS as ALERT_KINDS } from './core/alerts.js';

// بطاقات الإعدادات الجديدة: المنشآت (14)، المظهر والألوان والخط والثيمات (15/16)، القوائم وشاشة البداية (17/21)، العرض المفضل (20).
// الوضع الفاتح/الداكن (22) يبقى بزره القديم؛ هنا نعرض زرًا يستدعي نفس الدالة th().
const ver = useDataVersion();
const prefs = usePrefs();
const svg = (n) => (typeof ic === 'function' ? ic(n, 18) : '');

const rows = computed(() => {
  ver.value;
  const E = emps();
  return companies().map(c => ({ id: c.id, name: c.name || '', no: c.no || '', sector: c.sector || '', n: E.filter(e => e.cid == c.id).length }));
});
const pages = computed(() => navItems().map(x => ({ ...x, locked: NAV_PROTECTED.includes(x.id) })));
const startOptions = computed(() => pages.value.filter(p => !prefs.value.hideNav.includes(p.id) || p.id === prefs.value.start));

const al = computed(() => prefs.value.alerts || { fileDays: 7, retDays: 180, off: [] });
const alOn = (k) => !al.value.off.includes(k);
const alToggle = (k) => setAlertPrefs({ off: alOn(k) ? [...al.value.off, k] : al.value.off.filter(x => x !== k) });
const alNum = (key, e) => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v)) setAlertPrefs({ [key]: v }); };
const sw = ref({ ok: false, dir: '', on: false, msg: '' });
const swAvail = typeof window !== 'undefined' && !!(window.desk && window.desk.scanWatchState);
async function swLoad() { if (!swAvail) return; try { const r = await desk.scanWatchState(); sw.value = { ...sw.value, ok: true, dir: r.dir || r.saved || '', on: !!r.on }; } catch (e) { /* لا شيء */ } }
async function swChoose() { try { const r = await desk.scanWatchChoose(); if (r && r.ok) { sw.value.msg = ''; await swLoad(); } else if (r && !r.cancel) sw.value.msg = (r && r.err) || 'تعذر بدء المراقبة'; } catch (e) { sw.value.msg = 'تعذر بدء المراقبة'; } }
async function swStop() { try { await desk.scanWatchStop(); sw.value.msg = ''; await swLoad(); } catch (e) { /* لا شيء */ } }
swLoad();
const themeIds = Object.keys(THEMES);
const bgIds = Object.keys(BGS);
const fontIds = Object.keys(FONTS);
const swatch = (t) => ({ background: 'linear-gradient(135deg,' + t.pri + ',' + t.pri2 + ')' });

const newComp = () => editC();
const editComp = (id) => editC(id);
const delComp = (id) => delC(id);
const toggleMode = () => { if (typeof th === 'function') th(); };

function setReq(v) { setViewMode('req', v); if (typeof qm !== 'undefined') qm = v; }
function setCars(v) { setViewMode('cars', v); if (typeof cm !== 'undefined') cm = v; }
const curReq = () => prefs.value.view.req || (typeof qm !== 'undefined' ? qm : 'kanban');
const curCars = () => prefs.value.view.cars || (typeof cm !== 'undefined' ? cm : 'cards');
</script>

<template>
  <div class="grid k3 at-set">
    <!-- 14: المنشآت -->
    <div class="card">
      <h3><span v-html="svg('building')"></span> المنشآت (الشركات)</h3>
      <p v-if="!rows.length" class="mut">لا توجد منشآت بعد.</p>
      <div v-for="c in rows" :key="c.id" class="at-crow">
        <div class="at-cinfo"><b>{{ c.name }}</b><span class="mut">رقم المنشأة: {{ c.no }}<template v-if="c.sector"> · {{ c.sector }}</template> · {{ c.n }} موظف</span></div>
        <button class="btn s sm" @click="editComp(c.id)">تعديل</button>
        <button class="btn s sm d" @click="delComp(c.id)">حذف</button>
      </div>
      <div class="row"><button class="btn" @click="newComp">+ منشأة جديدة</button></div>
    </div>

    <!-- 15 + 16: المظهر -->
    <div class="card">
      <h3><span v-html="svg('sliders')"></span> المظهر والتخصيص</h3>
      <label class="at-lbl">الثيم</label>
      <div class="at-themes">
        <button v-for="id in themeIds" :key="id" class="at-theme" :class="{ on: prefs.theme === id }" @click="setTheme(id)">
          <i :style="swatch(THEMES[id])"></i>{{ THEMES[id].name }}
        </button>
      </div>
      <label class="at-lbl">ألوان مخصصة</label>
      <div class="at-colors">
        <label>الأساسي <input type="color" :value="prefs.primary" @input="setColors($event.target.value, prefs.secondary)" /></label>
        <label>الثانوي <input type="color" :value="prefs.secondary" @input="setColors(prefs.primary, $event.target.value)" /></label>
      </div>
      <label class="at-lbl">الخلفية</label>
      <select :value="prefs.bg" @change="setPrefs({ bg: $event.target.value })">
        <option v-for="id in bgIds" :key="id" :value="id">{{ BGS[id].name }}</option>
      </select>
      <label class="at-lbl">الخط</label>
      <select :value="prefs.font" @change="setPrefs({ font: $event.target.value })">
        <option v-for="id in fontIds" :key="id" :value="id">{{ FONTS[id].name }}</option>
      </select>
      <label class="at-lbl">حجم الخط</label>
      <div class="at-sizes">
        <button v-for="s in SIZES" :key="s.k" class="chip" :class="{ on: prefs.size === s.k }" @click="setPrefs({ size: s.k })">{{ s.l }}</button>
      </div>
      <div class="row">
        <button class="btn s" @click="toggleMode">الوضع الفاتح / الداكن</button>
        <button class="btn s" @click="resetAppearance()">استعادة الافتراضي</button>
      </div>
    </div>

    <!-- 17 + 21 + 20 -->
    <div class="card">
      <h3><span v-html="svg('list')"></span> القوائم والبدء والعرض</h3>
      <label class="at-lbl">القوائم الظاهرة في الشريط الجانبي</label>
      <div class="at-navs">
        <label v-for="p in pages" :key="p.id" class="at-nv" :class="{ lock: p.locked }">
          <input type="checkbox" :checked="!prefs.hideNav.includes(p.id)" :disabled="p.locked" @change="setNavHidden(p.id, !$event.target.checked)" />
          {{ p.title }}
        </label>
      </div>
      <label class="at-lbl">الشاشة التي تفتح عند بدء التشغيل</label>
      <select :value="prefs.start" @change="setPrefs({ start: $event.target.value })">
        <option value="last">آخر صفحة زرتها</option>
        <option v-for="p in startOptions" :key="p.id" :value="p.id">{{ p.title }}</option>
      </select>
      <label class="at-lbl">عرض طلبات الدخول</label>
      <select :value="curReq()" @change="setReq($event.target.value)">
        <option value="kanban">لوحة (Kanban)</option><option value="list">قائمة</option>
      </select>
      <label class="at-lbl">عرض السيارات</label>
      <select :value="curCars()" @change="setCars($event.target.value)">
        <option value="cards">بطاقات</option><option value="table">جدول</option>
      </select>
      <div class="row"><button class="btn s" @click="host.openHelp()">اختصارات لوحة المفاتيح (?)</button></div>
    </div>
    <div class="card">
      <h3>التنبيهات (53–61)</h3>
      <p class="mut">اختر أنواع التنبيهات التي تظهر في الجرس ولوحة التحكم، وعدّل المهل.</p>
      <div class="row">
        <label>مهلة تقديم طلب الالتحاق (أيام)<input type="number" min="1" max="60" :value="al.fileDays" @change="alNum('fileDays', $event)" /></label>
        <label>التنبيه قبل سن المعاش بـ (يوم)<input type="number" min="30" max="730" :value="al.retDays" @change="alNum('retDays', $event)" /></label>
      </div>
      <label v-for="k in ALERT_KINDS" :key="k[0]" class="mut" style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" style="width:auto" :checked="alOn(k[0])" @change="alToggle(k[0])" /> {{ k[2] }} <small>(بند {{ k[1] }})</small></label>
    </div>
    <div class="card">
      <h3>مراقبة مجلد الماسح (66)</h3>
      <p v-if="!swAvail" class="mut">تتطلب نسخة سطح المكتب المحدّثة (مثبّت 15.5 أو أحدث).</p>
      <template v-else>
        <p class="mut">اختر المجلد الذي يحفظ فيه برنامج الماسح (مثل HP Scan) ملفاته؛ أي صورة أو PDF جديدة تظهر لك داخل شاشة «مستندات» الموظف لإضافتها بضغطة. لا يُقرأ شيء من المجلد قبل أن تختار الإضافة.</p>
        <p>الحالة: <b>{{ sw.on ? 'تعمل' : 'متوقفة' }}</b><span v-if="sw.dir"> — {{ sw.dir }}</span></p>
        <div class="row"><button type="button" class="btn sm" @click="swChoose">اختيار المجلد وبدء المراقبة</button><button v-if="sw.on" type="button" class="btn s sm" @click="swStop">إيقاف</button></div>
        <p v-if="sw.msg" class="mut">{{ sw.msg }}</p>
      </template>
    </div>
  </div>
</template>
