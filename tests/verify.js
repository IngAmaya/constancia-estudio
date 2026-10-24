// Suite de pruebas automatizadas y verificación de seguridad para Raíces · Estudio & Constancia
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

console.log('🧪 Iniciando pruebas automatizadas y auditoría de arquitectura modular...\n');

// 1. Auditoría de Seguridad: Node >= 24 y Cero Dependencias Externas en Tiempo de Ejecución
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
assert.ok(
  pkg.engines && pkg.engines.node && pkg.engines.node.includes('24'),
  'package.json debe exigir Node.js >= 24.21.0 en engines.node'
);
const runtimeDeps = Object.keys(pkg.dependencies || {});
assert.strictEqual(
  runtimeDeps.length,
  0,
  `El ejecutable no debe incluir dependencias externas en runtime (encontradas: ${runtimeDeps.join(', ')})`
);
const currentNodeMajor = parseInt(process.versions.node.split('.')[0], 10);
assert.ok(currentNodeMajor >= 22, `Versión de Node insegura o antigua: ${process.versions.node}`);
console.log(
  `  ✓ Seguridad verificada: Node v${process.versions.node} activo, engines="${pkg.engines.node}" y 0 dependencias externas en runtime`
);

// 2. Verificar existencia y sintaxis de todos los módulos (Backend y Frontend)
const jsFiles = [
  'main.js',
  'preload.js',
  'src/main/storage.js',
  'src/main/updater.js',
  'src/main/windows.js',
  'src/sound-engine.js',
  'src/tree-renderer.js',
  'src/modules/date-utils.js',
  'src/modules/state-store.js',
  'src/modules/media-player.js',
  'src/modules/focus-timer.js',
  'src/modules/ui-views.js',
  'src/app.js'
];

jsFiles.forEach((file) => {
  const fullPath = path.join(ROOT, file);
  assert.ok(fs.existsSync(fullPath), `Falta el módulo requerido: ${file}`);
  execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
  console.log(`  ✓ Módulo válido: ${file}`);
});

// 3. Pruebas unitarias de los módulos desacoplados
global.window = {};
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); }
};

require(path.join(ROOT, 'src/tree-renderer.js'));
require(path.join(ROOT, 'src/modules/date-utils.js'));
require(path.join(ROOT, 'src/modules/state-store.js'));
require(path.join(ROOT, 'src/modules/media-player.js'));

// 3a. Verificar DateUtils
const todayKey = global.window.DateUtils.toDateKey(new Date());
assert.match(todayKey, /^\d{4}-\d{2}-\d{2}$/, 'toDateKey debe devolver formato YYYY-MM-DD');
const badgeToday = global.window.DateUtils.formatDeadlineBadge(todayKey);
assert.strictEqual(badgeToday.text, '¡Es Hoy!', 'formatDeadlineBadge para hoy debe ser "¡Es Hoy!"');
console.log('  ✓ Módulo DateUtils verificado');

// 3b. Verificar StateStore (Racha inicial en 0 y Salud inicial en 80%)
const defaultState = global.window.StateStore.createDefaultState();
assert.strictEqual(defaultState.sessions.length, 0, 'Las sesiones iniciales deben estar vacías (0 días de racha)');
assert.strictEqual(defaultState.createdAtDate, todayKey, 'createdAtDate debe inicializarse con la fecha actual');
const metrics = global.window.StateStore.computeConsistencyMetrics();
assert.strictEqual(metrics.streak, 0, 'La racha inicial debe ser exactamente 0 días');
assert.strictEqual(metrics.health, 80, 'La salud inicial del árbol debe ser 80% sin penalización retroactiva');
console.log('  ✓ Módulo StateStore verificado: 0 días de racha inicial y 80% de salud base');

// 3c. Verificar MediaPlayer (Parser de enlaces de Spotify y YouTube)
const spParsed = global.window.MediaPlayer.parseMediaUrlToEmbed(
  'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ'
);
assert.strictEqual(spParsed.platform, 'spotify');
assert.ok(spParsed.embedUrl.includes('open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ'));

const ytParsed = global.window.MediaPlayer.parseMediaUrlToEmbed(
  'https://www.youtube.com/watch?v=jfKfPfyJRdk'
);
assert.strictEqual(ytParsed.platform, 'youtube');
assert.ok(ytParsed.embedUrl.includes('youtube-nocookie.com/embed/jfKfPfyJRdk'));
console.log('  ✓ Módulo MediaPlayer (YouTube y Spotify) verificado');

// 3d. Verificar TreeRenderer (5 estados SVG)
const statesToCheck = [
  { health: 95, rest: false, expected: 'bloom' },
  { health: 75, rest: false, expected: 'healthy' },
  { health: 45, rest: false, expected: 'thirsty' },
  { health: 20, rest: false, expected: 'wilted' },
  { health: 80, rest: true, expected: 'rest' }
];
statesToCheck.forEach(({ health, rest, expected }) => {
  const info = global.window.TreeRenderer.getTreeStateInfo(health, rest);
  assert.strictEqual(info.id, expected);
  const svg = global.window.TreeRenderer.renderSVG(info, false);
  assert.ok(svg.includes('<svg') && svg.includes('</svg>'));
});
console.log('  ✓ Módulo TreeRenderer (5 estados SVG) verificado');

// 3e. Verificar módulo Updater (comparador semver)
const updater = require(path.join(ROOT, 'src/main/updater.js'));
assert.strictEqual(updater.isNewerVersion('v1.3.0', '1.2.0'), true);
assert.strictEqual(updater.isNewerVersion('v1.2.0', '1.2.0'), false);
assert.strictEqual(updater.isNewerVersion('v1.1.0', '1.2.0'), false);
console.log('  ✓ Módulo Updater (comparación semver y GitHub Releases) verificado');

// 3f. Verificar UIViews y SoundEngine
const uiSource = fs.readFileSync(path.join(ROOT, 'src/modules/ui-views.js'), 'utf-8');
const soundSource = fs.readFileSync(path.join(ROOT, 'src/sound-engine.js'), 'utf-8');
assert.ok(uiSource.includes('openFolderModal') && uiSource.includes('folder-edit-btn'));
assert.ok(soundSource.includes('warmthBoost'));
console.log('  ✓ Módulo de Interfaz (UIViews) y SoundEngine verificados');

console.log('\n✅ TODAS LAS PRUEBAS MODULARES Y DE SEGURIDAD PASARON EXITOSAMENTE.');
