// src/plugin/main.ts - SIMPLIFIED Plugin Entry Point

// Just reference Figma types - they're automatically available!
/// <reference types="@figma/plugin-typings" />

import { PluginManager } from './core/PluginManager';

console.log('🚀 [Plugin] Figma to React Native Plugin starting...');

// Validate Figma environment
if (typeof figma === 'undefined') {
  console.error('❌ [Plugin] Figma API not available');
  throw new Error('Figma API not available - this code must run in a Figma plugin environment');
}

// Global error handler
const handleError = (error: Error, context: string): void => {
  console.error(`❌ [Plugin] Error in ${context}:`, error);
  
  // Send error to UI if available
  try {
    if (figma?.ui?.postMessage) {
      figma.ui.postMessage({
        type: 'error',
        message: `${context}: ${error.message}`
      });
    }
  } catch (uiError) {
    // UI might not be ready yet, just log
    console.error('Failed to send error to UI:', uiError);
  }
};

// Initialize plugin with error handling
let pluginManager: PluginManager | null = null;

try {
  // Initialize plugin manager
  pluginManager = new PluginManager();
  
  console.log('✅ [Plugin] Plugin manager initialized');

} catch (error) {
  console.error('❌ [Plugin] Failed to initialize plugin manager:', error);
  handleError(error as Error, 'Plugin Initialization');
  
  // Show basic error UI if PluginManager fails
  try {
    figma.showUI(`
      <div style="padding: 20px; text-align: center; color: #ff5555; font-family: Inter, sans-serif;">
        <h3>Plugin Failed to Initialize</h3>
        <p>Please try refreshing or contact support.</p>
        <small>${(error as Error).message}</small>
      </div>
    `, { width: 300, height: 200 });
  } catch (fallbackError) {
    console.error('Even fallback UI failed:', fallbackError);
  }
}

// Handle plugin close
if (figma?.on) {
  figma.on('close', () => {
    console.log('🔄 [Plugin] Plugin closing...');
    
    try {
      if (pluginManager && typeof (pluginManager as any).cleanup === 'function') {
        (pluginManager as any).cleanup();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });
}

console.log('✅ [Plugin] Main initialization complete');