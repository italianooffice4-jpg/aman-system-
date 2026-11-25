<script setup>
import { computed } from 'vue';
import { useDataVersion, usePrefs } from './core/bridge.js';
import { THEMES, BGS, FONTS, SIZES, NAV_PROTECTED, setTheme, setColors, setPrefs, resetAppearance, setNavHidden, setViewMode } from './core/prefs.js';
import { navItems, companies, emps } from './core/legacy.js';
import { host } from './core/host.js';

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
  </div>
</template>
