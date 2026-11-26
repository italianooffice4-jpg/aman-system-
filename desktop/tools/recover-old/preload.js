const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('rec', {
  meta: (S) => ipcRenderer.invoke('rec:meta', S),
  doc: (r) => ipcRenderer.invoke('rec:doc', r),
  done: () => ipcRenderer.invoke('rec:done')
});
