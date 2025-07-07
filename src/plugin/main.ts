// src/plugin/main.ts - Plugin entry point
import { PluginManager } from './core/PluginManager';

console.log('🚀 Figma to React Native Plugin starting...');

// Initialize the plugin manager
const pluginManager = new PluginManager();

// Handle plugin lifecycle
figma.on('close', () => {
  console.log('🔄 Plugin closing...');
  pluginManager.cleanup();
});

console.log('✅ Plugin initialized successfully');

// src/shared/types/Messages.ts - Message types for plugin-UI communication
export interface BaseMessage {
  type: string;
  id?: string;
}

// Plugin to UI messages
export interface DesignSystemAnalyzedMessage extends BaseMessage {
  type: 'design-system-analyzed';
  data: {
    devices: DeviceInfo[];
    baseDevice: DeviceInfo | null;
    themeTokens: ThemeTokens | null;
    layers: LayerData[];
  };
}

export interface LayersDataMessage extends BaseMessage {
  type: 'layers-data';
  data: LayerData[];
}

export interface ThemeFileGeneratedMessage extends BaseMessage {
  type: 'theme-file-generated';
  data: string;
}

export interface ReactNativeGeneratedMessage extends BaseMessage {
  type: 'react-native-generated';
  data: string;
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

// UI to Plugin messages
export interface UIReadyMessage extends BaseMessage {
  type: 'ui-ready';
}

export interface GetLayersMessage extends BaseMessage {
  type: 'get-layers';
}

export interface GetThemeFileMessage extends BaseMessage {
  type: 'get-theme-file';
}

export interface GenerateReactNativeMessage extends BaseMessage {
  type: 'generate-react-native';
  layerId: string;
  options: GenerationOptions;
}

export interface ReanalyzeDesignSystemMessage extends BaseMessage {
  type: 'reanalyze-design-system';
}

export interface SelectLayerMessage extends BaseMessage {
  type: 'select-layer';
  layerId: string;
}

export interface CloseMessage extends BaseMessage {
  type: 'close';
}

// Union types for type safety
export type PluginToUIMessage = 
  | DesignSystemAnalyzedMessage
  | LayersDataMessage
  | ThemeFileGeneratedMessage
  | ReactNativeGeneratedMessage
  | ErrorMessage;

export type UIToPluginMessage = 
  | UIReadyMessage
  | GetLayersMessage
  | GetThemeFileMessage
  | GenerateReactNativeMessage
  | ReanalyzeDesignSystemMessage
  | SelectLayerMessage
  | CloseMessage;

// Import types from other modules
import { DeviceInfo } from '../plugin/core/DeviceDetector';
import { ThemeTokens } from '../plugin/core/ThemeGenerator';
import { LayerData } from '../plugin/types/FigmaTypes';
import { GenerationOptions } from '../plugin/types/index';

// src/shared/types/Common.ts - Common types used across the plugin
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GenerationOptions {
  useTypeScript: boolean;
  useResponsive: boolean;
  useThemeTokens: boolean;
  componentType: 'screen' | 'component' | 'section';
  includeNavigation: boolean;
  outputFormat: 'single-file' | 'separate-styles';
}

export interface PluginConfig {
  debugMode: boolean;
  autoAnalyze: boolean;
  maxLayerDepth: number;
  maxChildren: number;
}

// src/plugin/types/FigmaTypes.ts - Figma-specific types
export interface LayerData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children?: LayerData[];
  properties?: NodeProperties;
  deviceInfo?: DeviceInfo | null;
}

export interface NodeProperties {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  fills?: any[];
  strokes?: any[];
  cornerRadius?: number;
  fontSize?: number;
  fontName?: any;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  characters?: string;
}

// src/plugin/types/ThemeTypes.ts - Theme-related types
export interface ColorToken {
  name: string;
  value: string;
  usage: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic';
  variants?: Record<string, string>;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight?: number;
  letterSpacing?: number;
  usage: 'heading' | 'body' | 'caption' | 'button' | 'label';
}

export interface SpacingToken {
  name: string;
  value: number;
  usage: 'margin' | 'padding' | 'gap' | 'radius';
}

export interface ThemeTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: any[];
  borderRadius: any[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  category: 'small_phone' | 'normal_phone' | 'large_phone' | 'tablet' | 'desktop';
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  isBaseDevice: boolean;
}

// src/plugin/types/index.ts - Type exports
export * from './FigmaTypes';
export * from './ThemeTypes';
export * from '../../shared/types/Common';

// src/ui/App.tsx - UI entry point
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PluginUI } from './components/PluginUI';
import './styles/global.css';

console.log('🎨 UI starting...');

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<PluginUI />);

console.log('✅ UI initialized successfully');

// public/ui.html - UI HTML template
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma to React Native Plugin</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--figma-color-bg);
      color: var(--figma-color-text);
      overflow: hidden;
    }
    
    #root {
      width: 100vw;
      height: 100vh;
    }
    
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-size: 14px;
      color: var(--figma-color-text-secondary);
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">Loading plugin...</div>
  </div>
</body>
</html>

// manifest.json - Updated plugin manifest
{
  "name": "Figma to React Native",
  "id": "figma-to-rn-plugin",
  "api": "1.0.0",
  "main": "dist/code.js",
  "capabilities": ["inspect"],
  "enableProposedApi": false,
  "documentAccess": "dynamic-page",
  "editorType": ["figma", "dev"],
  "ui": "dist/ui.html",
  "permissions": ["currentuser"],
  "networkAccess": {
    "allowedDomains": ["none"]
  },
  "menu": [
    {
      "name": "Extract Design System",
      "command": "extract-design-system"
    },
    {
      "name": "Generate React Native",
      "command": "generate-react-native"
    }
  ]
}