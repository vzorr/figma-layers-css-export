// scripts/dev.js - Development script with watch mode
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting development mode...');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
execSync('npm run clean', { stdio: 'inherit' });

// Copy manifest for development
const manifestSource = path.join(__dirname, '../manifest.json');
const manifestDest = path.join(__dirname, '../dist/manifest.json');
if (!fs.existsSync(path.dirname(manifestDest))) {
  fs.mkdirSync(path.dirname(manifestDest), { recursive: true });
}
fs.copyFileSync(manifestSource, manifestDest);

// Start plugin backend watcher
const pluginWatcher = spawn('npm', ['run', 'dev:plugin'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

pluginWatcher.stdout.on('data', (data) => {
  console.log(`🔧 [Plugin]: ${data.toString().trim()}`);
});

pluginWatcher.stderr.on('data', (data) => {
  console.error(`❌ [Plugin]: ${data.toString().trim()}`);
});

// Start UI development server
const uiServer = spawn('npm', ['run', 'dev:ui'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

uiServer.stdout.on('data', (data) => {
  console.log(`🎨 [UI]: ${data.toString().trim()}`);
});

uiServer.stderr.on('data', (data) => {
  console.error(`❌ [UI]: ${data.toString().trim()}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development servers...');
  pluginWatcher.kill();
  uiServer.kill();
  process.exit(0);
});

console.log('📝 Development servers started:');
console.log('   - Plugin backend: Watching for changes...');
console.log('   - UI: Building and watching for changes...');
console.log('   - Press Ctrl+C to stop');