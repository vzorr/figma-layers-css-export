// src/ui/index.tsx - Main UI Entry Point
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PluginUI } from './components/PluginUI';
import './styles/global.css';

console.log('🎨 [UI] Starting Enhanced Figma to React Native UI...');

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<PluginUI />);

console.log('✅ [UI] UI initialized successfully');