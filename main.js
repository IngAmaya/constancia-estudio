const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

const GITHUB_OWNER = 'IngAmaya';
const GITHUB_REPO = 'constancia-estudio';

// Los datos se guardan en la carpeta de datos del usuario
// (Windows: %APPDATA%\Raices\data), que es escribible tanto en desarrollo
// como en la app instalada (.exe), cuya carpeta de programa es de solo lectura.
let DATA_DIR = null;
let DATA_FILE = null;
let downloadedInstallerPath = null;

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

// Comparador de versiones semánticas (ej. "1.1.0" > "1.0.0")
function isNewerVersion(latestTag, currentVersion) {
  const cleanLatest = String(latestTag || '').replace(/^v/i, '').trim();
  const cleanCurrent = String(currentVersion || '').replace(/^v/i, '').trim();
  const lParts = cleanLatest.split('.').map((n) => parseInt(n, 10) || 0);
  const cParts = cleanCurrent.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

// Petición JSON a la API de GitHub para consultar el último Release
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Raices-Desktop-App',
          Accept: 'application/vnd.github+json'
        }
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetchJson(res.headers.location));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
  });
}

// Descarga el instalador .exe con seguimiento de progreso en tiempo real (estilo Discord)
function downloadFileWithProgress(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl) => {
      https
        .get(
          currentUrl,
          { headers: { 'User-Agent': 'Raices-Desktop-App' } },
          (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return request(res.headers.location);
            }
            if (res.statusCode !== 200) {
              return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
            }
            const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
            let receivedBytes = 0;
            const fileStream = fs.createWriteStream(destPath);

            res.on('data', (chunk) => {
              receivedBytes += chunk.length;
              if (totalBytes > 0 && onProgress) {
                const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
                onProgress({
                  percent,
                  transferredMB: (receivedBytes / 1048576).toFixed(1),
                  totalMB: (totalBytes / 1048576).toFixed(1)
                });
              }
            });

            res.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close(() => resolve(destPath));
            });
            fileStream.on('error', (err) => {
              fs.unlink(destPath, () => {});
              reject(err);
            });
          }
        )
        .on('error', reject);
    };
    request(url);
  });
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

  // --- Sistema de Actualizaciones Automáticas (Estilo Discord) ---
  ipcMain.handle('updater:getVersion', () => app.getVersion());

  ipcMain.handle('updater:check', async () => {
    try {
      const currentVersion = app.getVersion();
      const release = await fetchJson(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
      );
      const latestTag = release.tag_name || '';
      const latestVersion = latestTag.replace(/^v/i, '');
      const exeAsset = (release.assets || []).find(
        (a) => a.name && a.name.toLowerCase().endsWith('.exe')
      );

      const updateAvailable =
        Boolean(exeAsset) && isNewerVersion(latestVersion, currentVersion);

      return {
        ok: true,
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseName: release.name || latestTag,
        releaseNotes: release.body || '',
        downloadUrl: exeAsset ? exeAsset.browser_download_url : null,
        assetName: exeAsset ? exeAsset.name : null
      };
    } catch (err) {
      return { ok: false, error: err.message, currentVersion: app.getVersion() };
    }
  });

  ipcMain.handle('updater:download', async (_event, { downloadUrl, assetName }) => {
    try {
      const safeName = assetName || 'Raices-Setup-Update.exe';
      const targetPath = path.join(app.getPath('temp'), safeName);
      await downloadFileWithProgress(downloadUrl, targetPath, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:progress', progress);
        }
      });
      downloadedInstallerPath = targetPath;
      return { ok: true, installerPath: targetPath };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('updater:installAndRestart', () => {
    if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
      return { ok: false, error: 'No se encontró el instalador descargado.' };
    }
    const installedExe = path.join(
      process.env.LOCALAPPDATA || '',
      'Programs',
      'Raices',
      'Raices.exe'
    );
    const relaunchTarget = fs.existsSync(installedExe) ? installedExe : process.execPath;

    // Ejecuta el instalador en modo silencioso (/S) y vuelve a abrir Raíces automáticamente
    const batPath = path.join(app.getPath('temp'), 'raices-auto-update.bat');
    const batContent = [
      '@echo off',
      'timeout /t 2 /nobreak >nul',
      `"${downloadedInstallerPath}" /S`,
      'timeout /t 2 /nobreak >nul',
      `start "" "${relaunchTarget}"`
    ].join('\r\n');
    fs.writeFileSync(batPath, batContent, 'utf-8');

    const child = spawn('cmd.exe', ['/c', batPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    app.quit();
    return { ok: true };
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
