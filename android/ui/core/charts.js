// إعداد Chart.js (المرحلة 2 — بند 27): تسجيل المكوّنات المستخدمة فقط (حجم أصغر)، وألوان تتبع الوضع الفاتح/الداكن.
// الرسم محلي بالكامل (canvas) — لا شبكة ولا CDN.
import {
  Chart, LineController, BarController, DoughnutController,
  LineElement, BarElement, PointElement, ArcElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
} from 'chart.js';

Chart.register(LineController, BarController, DoughnutController, LineElement, BarElement, PointElement, ArcElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);
Chart.defaults.font.family = "Cairo,'IBM Plex Sans Arabic',Tahoma,sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.animation.duration = 650;
Chart.defaults.locale = 'ar-EG';

export { Chart };

// قراءة ألوان الواجهة الحالية (المتغيرات تتغير بين الفاتح والداكن) لأن canvas لا يفهم var(--x)
export function palette() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return { tx: g('--tx', '#1d2130'), mut: g('--mut', '#707586'), bd: g('--bd', '#e6e8f0'), card: g('--card', '#ffffff') };
}

// إعادة الرسم عند تبديل الوضع الفاتح/الداكن (th() القديمة تغيّر data-theme على <html>)
export function onTheme(fn) {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  return () => mo.disconnect();
}

export function rgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

// تدرّج تحت الخط
export function areaFill(hex, a0 = 0.3) {
  return (ctx) => {
    const { chart } = ctx, area = chart.chartArea;
    if (!area) return rgba(hex, a0);
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, rgba(hex, a0)); g.addColorStop(1, rgba(hex, 0));
    return g;
  };
}

// ملف إعدادات مشترك للتلميحات (RTL)
export function tooltipBase(p) {
  return { rtl: true, textDirection: 'rtl', backgroundColor: p.card, titleColor: p.tx, bodyColor: p.tx, borderColor: p.bd, borderWidth: 1, padding: 10, cornerRadius: 10, displayColors: true, boxPadding: 4, usePointStyle: true };
}
