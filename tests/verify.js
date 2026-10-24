// Suite de pruebas automatizadas para Raíces · Estudio & Constancia
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

console.log('🧪 Iniciando pruebas automatizadas en la rama actual...\n');

// 1. Verificar sintaxis de todos los módulos JavaScript
const jsFiles = [
  'main.js',
  'preload.js',
  'src/app.js',
  'src/tree-renderer.js',
  'src/sound-engine.js'
];

jsFiles.forEach((file) => {
  const fullPath = path.join(ROOT, file);
  assert.ok(fs.existsSync(fullPath), `Falta el archivo requerido: ${file}`);
  execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
  console.log(`  ✓ Sintaxis válida: ${file}`);
});

// 2. Verificar que el estado inicial empieza con 0 sesiones (0 días de racha) y salud base de 80%
const appSource = fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf-8');

assert.ok(
  appSource.includes('sessions: []'),
  'createDefaultState() debe iniciar con sessions: [] para que la racha empiece en 0 días'
);
assert.ok(
  appSource.includes('createdAtDate: todayKey'),
  'createDefaultState() debe registrar createdAtDate para no penalizar días previos a usar la app'
);
assert.ok(
  appSource.includes('if (key < startDateKey) continue;'),
  'computeConsistencyMetrics() debe ignorar días anteriores a startDateKey'
);
console.log('  ✓ Estado inicial verificado: 0 días de racha al iniciar y sin penalización retroactiva');

// 3. Verificar TreeRenderer (los 5 estados del árbol generan SVG válido)
global.window = {};
require(path.join(ROOT, 'src/tree-renderer.js'));
const TreeRenderer = global.window.TreeRenderer;
assert.ok(TreeRenderer, 'TreeRenderer debe exponerse en window');

const statesToCheck = [
  { health: 95, rest: false, expected: 'bloom' },
  { health: 75, rest: false, expected: 'healthy' },
  { health: 45, rest: false, expected: 'thirsty' },
  { health: 20, rest: false, expected: 'wilted' },
  { health: 80, rest: true, expected: 'rest' }
];

statesToCheck.forEach(({ health, rest, expected }) => {
  const info = TreeRenderer.getTreeStateInfo(health, rest);
  assert.strictEqual(info.id, expected, `Con salud=${health} y rest=${rest} se esperaba estado ${expected}`);
  const svg = TreeRenderer.renderSVG(info, false);
  assert.ok(svg.includes('<svg') && svg.includes('</svg>'), `SVG inválido para el estado ${expected}`);
});
console.log('  ✓ Los 5 estados del Árbol de Constancia (bloom, healthy, thirsty, wilted, rest) renderizan SVG correctamente');

// 4. Verificar sistema de actualizaciones automáticas estilo Discord
const mainSource = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf-8');
const preloadSource = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf-8');
assert.ok(mainSource.includes("ipcMain.handle('updater:check'"), 'main.js debe exponer updater:check');
assert.ok(mainSource.includes("ipcMain.handle('updater:download'"), 'main.js debe exponer updater:download');
assert.ok(mainSource.includes("ipcMain.handle('updater:installAndRestart'"), 'main.js debe exponer updater:installAndRestart');
assert.ok(preloadSource.includes('checkForUpdates'), 'preload.js debe exponer checkForUpdates');
assert.ok(appSource.includes('initAutoUpdaterUI'), 'src/app.js debe inicializar la UI de auto-actualización');
console.log('  ✓ Sistema de auto-actualización estilo Discord (GitHub Releases) verificado');

// 5. Verificar Ruido Cálido mejorado, Edición de Carpetas y Vinculación YouTube/Spotify
const soundSource = fs.readFileSync(path.join(ROOT, 'src/sound-engine.js'), 'utf-8');
assert.ok(soundSource.includes('warmthBoost'), 'startBrownNoise() debe incluir realce cálido audible (warmthBoost)');
assert.ok(appSource.includes('folder-edit-btn') && appSource.includes('editingId'), 'src/app.js debe permitir editar carpetas existentes');
assert.ok(appSource.includes('parseMediaUrlToEmbed') && appSource.includes('playEmbeddedMedia'), 'src/app.js debe incluir integración con YouTube y Spotify');
assert.ok(mainSource.includes("ipcMain.handle('media:openWindow'"), 'main.js debe exponer media:openWindow');
console.log('  ✓ Ruido Cálido mejorado, Edición de Carpetas (✏️) y Reproductor YouTube/Spotify verificados');

console.log('\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE.');
