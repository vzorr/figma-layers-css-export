// src/ui/index.tsx - Fixed UI Entry Point
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PluginUI } from './components/PluginUI';
import './styles/global.css';

console.log('🎨 [UI] Starting Figma to React Native Plugin UI...');

// Ensure DOM is ready and safe initialization
const initializeUI = () => {
  try {
    const container = document.getElementById('root');
    if (!container) {
      console.error('❌ [UI] Root element not found');
      return;
    }

    // Clear any existing content
    container.innerHTML = '';

    const root = createRoot(container);
    root.render(<PluginUI />);
    console.log('✅ [UI] Plugin UI initialized successfully');
  } catch (error) {
    console.error('❌ [UI] Failed to initialize:', error);
    
    // Fallback error display
    const container = document.getElementById('root');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #ff5555; font-family: Inter, sans-serif;">
          <h3>Failed to load plugin UI</h3>
          <p>Please try refreshing the plugin.</p>
          <small style="color: #666; font-size: 11px;">${error}</small>
        </div>
      `;
    }
  }
};

// Safe DOM ready check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  // DOM is already ready
  setTimeout(initializeUI, 0);
}