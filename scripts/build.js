// scripts/build.js - Main build script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isProduction = false;

console.log(`🏗️  Building Figma Plugin (${isProduction ? 'production' : 'development'})...`);

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
execSync('npm run clean', { stdio: 'inherit' });

// Type check (now using single config)
console.log('🔍 Type checking...');
try {
  execSync('npm run type-check', { stdio: 'inherit' });
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