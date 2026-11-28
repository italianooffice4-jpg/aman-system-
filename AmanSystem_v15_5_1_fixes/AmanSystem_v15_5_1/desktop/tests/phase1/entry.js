// حزمة اختبار: نفس وحدات core/ الحقيقية، مع host تجريبي بدل مكوّنات Vue (غير القابلة للترجمة هنا)
import { installAll } from '../../ui/src/core/install.js';
import { host } from '../../ui/src/core/host.js';
import * as store from '../../ui/src/core/store.js';
import * as prefs from '../../ui/src/core/prefs.js';
import * as notify from '../../ui/src/core/notify.js';
import * as search from '../../ui/src/core/search.js';
import * as shortcuts from '../../ui/src/core/shortcuts.js';
import * as install from '../../ui/src/core/install.js';

window.__calls = { bell: 0, search: 0, help: 0 };
if (!window.__noHost) {
  host.toggleBell = () => { window.__calls.bell++; };
  host.openSearch = () => { window.__calls.search++; };
  host.openHelp = () => { window.__calls.help++; };
  host.ready = true;
}
window.AmanCore = { store, prefs, notify, search, shortcuts, host, install };
installAll();
