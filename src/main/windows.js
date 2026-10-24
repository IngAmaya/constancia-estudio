// Módulo de gestión de ventanas (Ventana Principal + Reproductor Persistente YouTube/Spotify)
const { BrowserWindow, session } = require('electron');
const path = require('path');

let mainWindow = null;
let mediaPlayerWindow = null;

function configureMediaHeaders() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*', '*://*.googlevideo.com/*'] },
    (details, callback) => {
      details.requestHeaders['Referer'] = 'https://www.youtube.com/';
      details.requestHeaders['Origin'] = 'https://www.youtube.com';
      callback({ requestHeaders: details.requestHeaders });
    }
  );
}

function createMainWindow(projectRoot) {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#131716',
    title: 'Raíces · Estudio & Constancia',
    icon: path.join(projectRoot, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(projectRoot, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(projectRoot, 'src', 'index.html'));
  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function openMediaWindow(projectRoot, targetUrl, windowTitle = 'Reproductor de Estudio · YouTube / Spotify') {
  if (mediaPlayerWindow && !mediaPlayerWindow.isDestroyed()) {
    mediaPlayerWindow.loadURL(targetUrl);
    mediaPlayerWindow.setTitle(windowTitle);
    if (mediaPlayerWindow.isMinimized()) mediaPlayerWindow.restore();
    mediaPlayerWindow.focus();
    return;
  }

  mediaPlayerWindow = new BrowserWindow({
    width: 980,
    height: 660,
    minWidth: 420,
    minHeight: 340,
    backgroundColor: '#111615',
    title: windowTitle,
    icon: path.join(projectRoot, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      partition: 'persist:raices_media',
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  mediaPlayerWindow.loadURL(targetUrl);
  mediaPlayerWindow.on('closed', () => {
    mediaPlayerWindow = null;
  });
}

module.exports = {
  configureMediaHeaders,
  createMainWindow,
  getMainWindow,
  openMediaWindow
};
