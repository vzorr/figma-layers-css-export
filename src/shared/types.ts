// src/shared/types.ts - SIMPLIFIED version (no figma.d.ts needed!)

// ============================================================================
// PLUGIN-SPECIFIC TYPES ONLY
// ============================================================================
// Note: Figma types are provided by @figma/plugin-typings automatically
// We don't need to redeclare or import them!

// Device Detection Types
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

export interface ResponsiveBreakpoints {
  mobile: {
    small: number;
    normal: number;
    large: number;
  };
  tablet: number;
  desktop: number;
}

// Theme System Types
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

// Layer Analysis Types
export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LayoutAnalysis {
  layoutType: 'flex' | 'absolute' | 'stack' | 'grid';
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  spacing?: number;
  padding?: EdgeInsets;
  gap?: number;
  isScrollable?: boolean;
}

export interface ComponentPattern {
  type: 'button' | 'input' | 'card' | 'list-item' | 'header' | 'navigation' | 'image' | 'text' | 'container' | 'custom';
  confidence: number;
  properties: Record<string, any>;
  interactionType?: 'touchable' | 'scrollable' | 'static';
  hasText?: boolean;
  hasImage?: boolean;
  isInteractive?: boolean;
}

export interface VisualProperties {
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadowProperties?: ShadowProperties;
  opacity?: number;
  rotation?: number;
}

export interface ShadowProperties {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation?: number;
}

export interface TextAnalysis {
  content: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  color: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;
  isHeading?: boolean;
  isButton?: boolean;
  isLabel?: boolean;
}

export interface ResponsiveAnalysis {
  baseWidth: number;
  baseHeight: number;
  scaleType: 'fixed' | 'responsive' | 'flexible';
  minWidth?: number;
  maxWidth?: number;
  aspectRatio?: number;
}

// Layer Data Types (Compatible with Figma API but don't conflict)
export interface NodeProperties {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  
  // Layout properties
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  
  // Visual properties - use any to avoid conflicts with Figma types
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: any[];
  opacity?: number;
  rotation?: number;
  
  // Text properties - use any to avoid conflicts
  fontSize?: number;
  fontName?: any;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  characters?: string;
  lineHeight?: any;
  letterSpacing?: any;
}

export interface LayerData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children?: LayerData[];
  properties?: NodeProperties;
  deviceInfo?: DeviceInfo | null;
  
  // Enhanced analysis data
  layoutAnalysis?: LayoutAnalysis;
  componentPattern?: ComponentPattern;
  visualProperties?: VisualProperties;
  textAnalysis?: TextAnalysis;
}

// Generation Options
export interface GenerationOptions {
  useTypeScript: boolean;
  useResponsive: boolean;
  useThemeTokens: boolean;
  componentType: 'screen' | 'component' | 'section';
  includeNavigation: boolean;
  outputFormat: 'single-file' | 'separate-styles';
}

export interface GenerationContext {
  baseDevice: DeviceInfo;
  themeTokens: ThemeTokens | null;
  options: GenerationOptions;
  componentName: string;
  usedComponents: Set<string>;
  imports: Set<string>;
  hooks: Set<string>;
  stateVariables: string[];
}

export interface GeneratedComponent {
  code: string;
  imports: string[];
  dependencies: string[];
}

// Plugin-UI Communication Types
export interface BaseMessage {
  type: string;
  id?: string;
}

// Messages from Plugin to UI
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

export interface AnalysisProgressMessage extends BaseMessage {
  type: 'analysis-progress';
  data: {
    step: string;
    progress: number;
  };
}

// Messages from UI to Plugin
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

export interface SelectLayerMessage extends BaseMessage {
  type: 'select-layer';
  layerId: string;
}

export interface ReanalyzeDesignSystemMessage extends BaseMessage {
  type: 'reanalyze-design-system';
}

export interface CloseMessage extends BaseMessage {
  type: 'close';
}

// Union types for message handling
export type PluginToUIMessage = 
  | DesignSystemAnalyzedMessage
  | LayersDataMessage
  | ThemeFileGeneratedMessage
  | ReactNativeGeneratedMessage
  | ErrorMessage
  | AnalysisProgressMessage;

export type UIToPluginMessage = 
  | UIReadyMessage
  | GetLayersMessage
  | GetThemeFileMessage
  | GenerateReactNativeMessage
  | SelectLayerMessage
  | ReanalyzeDesignSystemMessage
  | CloseMessage;

// Utility Types
export interface PluginState {
  devices: DeviceInfo[];
  baseDevice: DeviceInfo | null;
  themeTokens: ThemeTokens | null;
  layers: LayerData[];
  selectedLayer: LayerData | null;
  isLoading: boolean;
  error: string | null;
  isAnalyzed: boolean;
}

export interface UIState {
  activeTab: 'overview' | 'screens' | 'theme' | 'options';
  showCodePanel: boolean;
  generatedCode: string;
  options: GenerationOptions;
}