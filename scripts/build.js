// scripts/build.js - Main build script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

console.log(`🏗️  Building Figma Plugin (${isProduction ? 'production' : 'development'})...`);

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
execSync('npm run clean', { stdio: 'inherit' });

// Type check
console.log('🔍 Type checking...');
try {
  execSync('npm run type-check:plugin', { stdio: 'inherit' });
  execSync('npm run type-check:ui', { stdio: 'inherit' });
  console.log('✅ Type checking passed');
} catch (error) {
  console.error('❌ Type checking failed');
  process.exit(1);
}

// Lint
console.log('🔧 Linting code...');
try {
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ Linting passed');
} catch (error) {
  console.error('❌ Linting failed');
  process.exit(1);
}

// Build plugin backend
console.log('📦 Building plugin backend...');
try {
  execSync('npm run build:plugin', { stdio: 'inherit' });
  console.log('✅ Plugin backend built successfully');
} catch (error) {
  console.error('❌ Plugin backend build failed');
  process.exit(1);
}

// Build UI
console.log('🎨 Building UI...');
try {
  execSync('npm run build:ui', { stdio: 'inherit' });
  console.log('✅ UI built successfully');
} catch (error) {
  console.error('❌ UI build failed');
  process.exit(1);
}

// Copy manifest
console.log('📋 Copying manifest...');
const manifestSource = path.join(__dirname, '../manifest.json');
const manifestDest = path.join(__dirname, '../dist/manifest.json');
fs.copyFileSync(manifestSource, manifestDest);

console.log('🎉 Build completed successfully!');
console.log('📁 Output files:');
console.log('   - dist/code.js (Plugin backend)');
console.log('   - dist/ui.html (Plugin UI)');
console.log('   - dist/ui.js (UI JavaScript)');
console.log('   - dist/manifest.json (Plugin manifest)');

// scripts/dev.js - Development script with watch mode
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting development mode...');

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
const { execSync } = require('child_process');
execSync('npm run clean', { stdio: 'inherit' });

// Copy manifest for development
const fs = require('fs');
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
console.log('   - UI server: http://localhost:3000');
console.log('   - Press Ctrl+C to stop');

// scripts/clean.js - Clean build artifacts
const rimraf = require('rimraf');
const path = require('path');

const dirsToClean = [
  path.join(__dirname, '../dist'),
  path.join(__dirname, '../build'),
];

console.log('🧹 Cleaning build artifacts...');

dirsToClean.forEach(dir => {
  try {
    rimraf.sync(dir);
    console.log(`✅ Cleaned: ${path.relative(process.cwd(), dir)}`);
  } catch (error) {
    console.warn(`⚠️  Could not clean: ${path.relative(process.cwd(), dir)}`);
  }
});

console.log('🎉 Clean completed!');