// src/plugin/main.ts - Corrected Plugin Entry Point
import { PluginManager } from './core/PluginManager';

console.log('🚀 [Plugin] Figma to React Native Plugin starting...');

// Global error handler
const handleError = (error: Error, context: string) => {
  console.error(`❌ [Plugin] Error in ${context}:`, error);
  
  // Send error to UI if it's available
  try {
    figma.ui.postMessage({
      type: 'error',
      message: `${context}: ${error.message}`
    });
  } catch (uiError) {
    // UI might not be ready yet, just log
    console.error('Failed to send error to UI:', uiError);
  }
};

// Initialize plugin with error handling
let pluginManager: PluginManager | null = null;

try {
  // Show UI first
  figma.showUI(__html__, { 
    width: 480, 
    height: 700,
    themeColors: true 
  });

  // Initialize plugin manager
  pluginManager = new PluginManager();
  
  console.log('✅ [Plugin] Plugin manager initialized');

} catch (error) {
  handleError(error as Error, 'Plugin Initialization');
}

// Handle plugin close
figma.on('close', () => {
  console.log('🔄 [Plugin] Plugin closing...');
  
  try {
    if (pluginManager) {
      pluginManager.cleanup();
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});

// Global error handlers
process.on('uncaughtException', (error) => {
  handleError(error, 'Uncaught Exception');
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  handleError(error, 'Unhandled Promise Rejection');
});

console.log('✅ [Plugin] Main initialization complete');