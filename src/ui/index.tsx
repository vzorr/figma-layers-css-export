// src/ui/index.tsx - Corrected UI Entry Point
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PluginUI } from './components/PluginUI';
import './styles/global.css';

console.log('🎨 [UI] Starting Figma to React Native Plugin UI...');

// Ensure DOM is ready
const initializeUI = () => {
  const container = document.getElementById('root');
  if (!container) {
    console.error('❌ [UI] Root element not found');
    return;
  }

  // Clear any existing content
  container.innerHTML = '';

  try {
    const root = createRoot(container);
    root.render(<PluginUI />);
    console.log('✅ [UI] Plugin UI initialized successfully');
  } catch (error) {
    console.error('❌ [UI] Failed to initialize:', error);
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #ff5555;">
        <h3>Failed to load plugin UI</h3>
        <p>Please try refreshing the plugin.</p>
        <small>${error}</small>
      </div>
    `;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}