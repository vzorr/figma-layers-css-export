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