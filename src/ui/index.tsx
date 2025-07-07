// src/ui/index.tsx - UI bootstrap
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('🎨 [index.tsx:5] Starting Figma to React Native UI...');

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('✅ [index.tsx:19] UI rendered successfully');