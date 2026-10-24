// Proceso Principal de Electron (Orquestador Modular)
const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const { initStoragePaths, loadUserData, saveUserData } = require('./src/main/storage');
const { checkForUpdates, downloadUpdate, installAndRestart } = require('./src/main/updater');
const {
  configureMediaHeaders,
  createMainWindow,
  getMainWindow,
  openMediaWindow
} = require('./src/main/windows');

app.setName('Raices');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.raices.constancia');
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.whenReady().then(() => {
  initStoragePaths(app, __dirname);
  configureMediaHeaders();

  // Persistencia de datos
  ipcMain.handle('data:load', () => loadUserData());
  ipcMain.handle('data:save', (_event, data) => saveUserData(data));

  // Controles de ventana
  ipcMain.handle('window:minimize', () => {
    const win = getMainWindow();
    if (win) win.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = getMainWindow();
    if (!win) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    }
    win.maximize();
    return true;
  });

  ipcMain.handle('window:close', () => {
    const win = getMainWindow();
    if (win) win.close();
  });

  ipcMain.handle('window:toggleAlwaysOnTop', () => {
    const win = getMainWindow();
    if (!win) return false;
    const nextState = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(nextState);
    return nextState;
  });

  // Notificaciones del sistema
  ipcMain.handle('notify:send', (_event, { title, body }) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
    } catch (e) {}
  });

  // Reproductor de YouTube / Spotify
  ipcMain.handle('media:openWindow', (_event, { url, title }) => {
    if (url && /^https?:\/\//i.test(url)) {
      openMediaWindow(__dirname, url, title);
      return { ok: true };
    }
    return { ok: false };
  });

  // Sistema de Auto-Actualizaciones (Estilo Discord)
  ipcMain.handle('updater:getVersion', () => app.getVersion());
  ipcMain.handle('updater:check', () => checkForUpdates(app));
  ipcMain.handle('updater:download', (_event, payload) =>
    downloadUpdate(app, payload, (progress) => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:progress', progress);
      }
    })
  );
  ipcMain.handle('updater:installAndRestart', () => installAndRestart(app));

  createMainWindow(__dirname);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(__dirname);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
