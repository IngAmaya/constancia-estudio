const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Los datos se guardan en la carpeta de datos del usuario
// (Windows: %APPDATA%\Raices\data), que es escribible tanto en desarrollo
// como en la app instalada (.exe), cuya carpeta de programa es de solo lectura.
let DATA_DIR = null;
let DATA_FILE = null;

function resolveDataPaths() {
  DATA_DIR = path.join(app.getPath('userData'), 'data');
  DATA_FILE = path.join(DATA_DIR, 'constancia-data.json');
}

// Migra datos de versiones anteriores que guardaban en ./data junto al código
function migrateLegacyData() {
  try {
    const legacyFile = path.join(__dirname, 'data', 'constancia-data.json');
    if (!fs.existsSync(DATA_FILE) && fs.existsSync(legacyFile)) {
      ensureDataDir();
      fs.copyFileSync(legacyFile, DATA_FILE);
    }
  } catch (err) {
    console.error('Error migrating legacy data:', err);
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadUserData() {
  try {
    ensureDataDir();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading user data:', err);
  }
  return null;
}

function saveUserData(data) {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { ok: true };
  } catch (err) {
    console.error('Error saving user data:', err);
    return { ok: false, error: err.message };
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#131716',
    title: 'Raíces · Estudio & Constancia',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Keep timer accurate when window is minimized or in background
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Nombre fijo para la carpeta de datos (%APPDATA%\Raices) y para las notificaciones de Windows
app.setName('Raices');
if (process.platform === 'win32') {
  app.setAppUserModelId('com.raices.constancia');
}

// Evita abrir dos ventanas de la app a la vez
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  resolveDataPaths();
  migrateLegacyData();

  ipcMain.handle('data:load', () => loadUserData());
  ipcMain.handle('data:save', (_event, data) => saveUserData(data));

  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window:toggleAlwaysOnTop', () => {
    if (!mainWindow) return false;
    const nextState = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(nextState);
    return nextState;
  });

  ipcMain.handle('notify:send', (_event, { title, body }) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
    } catch (e) {
      // Ignore notification errors
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
