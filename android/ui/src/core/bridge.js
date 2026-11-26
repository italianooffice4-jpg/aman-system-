// جسر Vue: يحوّل أحداث core/* إلى refs. هذا الملف الوحيد في core الذي يستورد Vue.
import { ref, onBeforeUnmount } from 'vue';
import { onData, dataVersion } from './store.js';
import { onToasts, getToasts, onHistory, getHistory, unreadCount } from './notify.js';
import { onPrefs, getPrefs } from './prefs.js';
import { onAdv, getAdv } from './search.js';

function sub(get, on) {
  const r = ref(get());
  const off = on(() => { r.value = get(); });
  onBeforeUnmount(off);
  return r;
}
export const useDataVersion = () => sub(dataVersion, onData);
export const useToasts = () => sub(getToasts, onToasts);
export const useHistory = () => sub(getHistory, onHistory);
export const useUnread = () => sub(unreadCount, onHistory);
export const usePrefs = () => sub(getPrefs, onPrefs);
export const useAdv = () => sub(getAdv, onAdv);
