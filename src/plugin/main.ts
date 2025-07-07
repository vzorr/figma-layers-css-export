// Main plugin entry point
import { PluginManager } from './core/PluginManager';

console.log('🚀 Figma to React Native Plugin starting...');

// Show UI
figma.showUI(__html__, { 
  width: 480, 
  height: 700,
  themeColors: true 
});

// Initialize plugin manager
const pluginManager = new PluginManager();

// Handle plugin lifecycle
figma.on('close', () => {
  console.log('🔄 Plugin closing...');
});

console.log('✅ Plugin initialized successfully');