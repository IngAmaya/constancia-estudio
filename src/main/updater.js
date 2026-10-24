// Módulo de actualizaciones automáticas vía GitHub Releases (sin dependencias externas)
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

const GITHUB_OWNER = 'IngAmaya';
const GITHUB_REPO = 'constancia-estudio';

let downloadedInstallerPath = null;

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

async function checkForUpdates(app) {
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
}

async function downloadUpdate(app, { downloadUrl, assetName }, onProgress) {
  try {
    const safeName = assetName || 'Raices-Setup-Update.exe';
    const targetPath = path.join(app.getPath('temp'), safeName);
    await downloadFileWithProgress(downloadUrl, targetPath, onProgress);
    downloadedInstallerPath = targetPath;
    return { ok: true, installerPath: targetPath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function installAndRestart(app) {
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
}

module.exports = {
  isNewerVersion,
  checkForUpdates,
  downloadUpdate,
  installAndRestart
};
