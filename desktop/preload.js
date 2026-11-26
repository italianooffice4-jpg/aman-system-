const { contextBridge, ipcRenderer } = require('electron');
// استرجاع تلقائي: لو بيانات البرنامج فارغة (مسحها المتصفح/إعادة تثبيت) ويوجد ملف نسخة في المكتبة، أعدها قبل تحميل الصفحة
try {
  const ls = window.localStorage;
  if (!ls.getItem('ins_sys_v1')) {
    const raw = ipcRenderer.sendSync('desk:loadDataSync');
    const m = raw ? (JSON.parse(raw).ls || {}) : {};
    Object.keys(m).forEach(k => { if (ls.getItem(k) == null) ls.setItem(k, m[k]); });
  }
} catch (e) {}

contextBridge.exposeInMainWorld('desk', {
  printers: () => ipcRenderer.invoke('desk:printers'),
  scanners: () => ipcRenderer.invoke('desk:scanners'),
  cfgGet: () => ipcRenderer.invoke('desk:cfgGet'),
  cfgSet: (p) => ipcRenderer.invoke('desk:cfgSet', p),
  libInfo: () => ipcRenderer.invoke('desk:libInfo'),
  libStats: () => ipcRenderer.invoke('desk:libStats'),
  libSave: (o) => ipcRenderer.invoke('desk:libSave', o),
  libGet: (id) => ipcRenderer.invoke('desk:libGet', id),
  libDelete: (id) => ipcRenderer.invoke('desk:libDelete', id),
  libOpenFolder: () => ipcRenderer.invoke('desk:libOpenFolder'),
  libChoose: () => ipcRenderer.invoke('desk:libChoose'),
  libSaveData: (j) => ipcRenderer.invoke('desk:libSaveData', j),
  libLoadData: () => ipcRenderer.invoke('desk:libLoadData'),
  libSnapshot: () => ipcRenderer.invoke('desk:libSnapshot'),
  refocus: () => ipcRenderer.invoke('desk:refocus'),
  printHtml: (html, opts) => ipcRenderer.invoke('desk:printHtml', html, opts),
  openDoc: (name, data) => ipcRenderer.invoke('desk:openDoc', name, data),
  latestScan: (dir) => ipcRenderer.invoke('desk:latestScan', dir),
  scan: (opts) => ipcRenderer.invoke('desk:scan', opts),
  scanCancel: () => ipcRenderer.invoke('desk:scanCancel'),
  ai: (opts) => ipcRenderer.invoke('desk:ai', opts),
  // التحديث من GitHub
  updInfo: () => ipcRenderer.invoke('desk:updInfo'),
  updCheck: () => ipcRenderer.invoke('desk:updCheck'),
  updInstall: (o) => ipcRenderer.invoke('desk:updInstall', o),
  updOk: () => ipcRenderer.invoke('desk:updOk'),
  updAck: () => ipcRenderer.invoke('desk:updAck'),
  updSkip: (v) => ipcRenderer.invoke('desk:updSkip', v),
  updAuto: (on) => ipcRenderer.invoke('desk:updAuto', on),
  onUpdAvail: (cb) => ipcRenderer.on('desk:updAvail', (_e, d) => cb(d)),
  onUpdProgress: (cb) => ipcRenderer.on('desk:updProgress', (_e, d) => cb(d))
});
