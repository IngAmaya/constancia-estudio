// Módulo de almacenamiento local persistente (%APPDATA%\Raices\data)
const path = require('path');
const fs = require('fs');

let DATA_DIR = null;
let DATA_FILE = null;

function initStoragePaths(app, projectRoot) {
  DATA_DIR = path.join(app.getPath('userData'), 'data');
  DATA_FILE = path.join(DATA_DIR, 'constancia-data.json');
  migrateLegacyData(projectRoot);
}

function ensureDataDir() {
  if (DATA_DIR && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrateLegacyData(projectRoot) {
  try {
    const legacyFile = path.join(projectRoot, 'data', 'constancia-data.json');
    if (DATA_FILE && !fs.existsSync(DATA_FILE) && fs.existsSync(legacyFile)) {
      ensureDataDir();
      fs.copyFileSync(legacyFile, DATA_FILE);
    }
  } catch (err) {
    console.error('Error migrating legacy data:', err);
  }
}

function loadUserData() {
  try {
    ensureDataDir();
    if (DATA_FILE && fs.existsSync(DATA_FILE)) {
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

module.exports = {
  initStoragePaths,
  loadUserData,
  saveUserData
};
