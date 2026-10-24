const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggleAlwaysOnTop'),
  sendNotification: (payload) => ipcRenderer.invoke('notify:send', payload),
  // Auto-updater (estilo Discord)
  getVersion: () => ipcRenderer.invoke('updater:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (payload) => ipcRenderer.invoke('updater:download', payload),
  installAndRestart: () => ipcRenderer.invoke('updater:installAndRestart'),
  onUpdateProgress: (callback) => {
    ipcRenderer.on('updater:progress', (_event, data) => callback(data));
  }
});
