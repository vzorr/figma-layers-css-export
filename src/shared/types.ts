// src/shared/types.ts - Consolidated Types for Plugin
import { LayoutAnalysis, ComponentPattern, VisualProperties, TextAnalysis } from '../plugin/analyzers/LayerAnalyzer';

// ============================================================================
// DEVICE DETECTION TYPES
// ============================================================================

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

// ============================================================================
// THEME SYSTEM TYPES
// ============================================================================

export interface ColorToken {
  name: string;
  value: string;
  usage: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic';
  variants?: {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
  };
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

// ============================================================================
// LAYER DATA TYPES
// ============================================================================

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
  
  // Visual properties
  fills?: any[];
  strokes?: any[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: any[];
  opacity?: number;
  rotation?: number;
  
  // Text properties
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

// ============================================================================
// GENERATION OPTIONS
// ============================================================================

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

// ============================================================================
// PLUGIN-UI COMMUNICATION TYPES
// ============================================================================

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
  | ErrorMessage;

export type UIToPluginMessage = 
  | UIReadyMessage
  | GetLayersMessage
  | GetThemeFileMessage
  | GenerateReactNativeMessage
  | SelectLayerMessage
  | ReanalyzeDesignSystemMessage
  | CloseMessage;

// ============================================================================
// UTILITY TYPES
// ============================================================================

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

// Re-export analyzer types for convenience
export type {
  LayoutAnalysis,
  ComponentPattern,
  VisualProperties,
  TextAnalysis
} from '../plugin/analyzers/LayerAnalyzer';