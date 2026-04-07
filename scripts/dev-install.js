#!/usr/bin/env node
/**
 * Instala el plugin compilado directamente en el core local para desarrollo.
 *
 * Uso:
 *   node scripts/dev-install.js              # busca ../vla-system automáticamente
 *   node scripts/dev-install.js /ruta/core   # ruta explícita al core
 *
 * Después de correr: reiniciar el servidor del core (npm run dev -w @vla/api)
 */

const fs = require('fs');
const path = require('path');

const pluginDir = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'plugin.json'), 'utf-8'));

const corePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(pluginDir, '..', 'vla-system');

const targetDir = path.join(corePath, 'apps', 'api', 'storage', 'plugins', manifest.name);
const distSrc = path.join(pluginDir, 'dist');

if (!fs.existsSync(corePath)) {
  console.error(`ERROR: Core no encontrado en ${corePath}`);
  console.error('Pasa la ruta explícita: node scripts/dev-install.js /ruta/al/core');
  process.exit(1);
}

if (!fs.existsSync(distSrc)) {
  console.error('ERROR: dist/ no encontrado. Ejecuta "npm run build" primero.');
  process.exit(1);
}

if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true });
fs.mkdirSync(path.join(targetDir, 'dist'), { recursive: true });

fs.copyFileSync(path.join(pluginDir, 'plugin.json'), path.join(targetDir, 'plugin.json'));
for (const file of fs.readdirSync(distSrc)) {
  fs.copyFileSync(path.join(distSrc, file), path.join(targetDir, 'dist', file));
}

console.log(`\n✓ Plugin "${manifest.name}" instalado en ${targetDir}`);
console.log('  Reinicia el core: cd ../vla-system && npm run dev -w @vla/api\n');
