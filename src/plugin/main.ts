// src/plugin/main.ts - Fixed Plugin Entry Point
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
  // Initialize plugin manager (it will handle UI creation internally)
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

// Figma plugin environment error handlers (no Node.js process object)
// Note: These are not available in Figma plugin environment
// Instead, rely on try-catch blocks and the PluginManager's error handling

console.log('✅ [Plugin] Main initialization complete');