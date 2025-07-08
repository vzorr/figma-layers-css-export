// src/shared/types.ts - Updated with Proper Figma Types

// ============================================================================
// FIGMA API TYPES (Enhanced)
// ============================================================================

// Use Figma's built-in Vector type instead of defining our own

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface RGBA extends RGB {
  a: number;
}

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
  shadows: unknown[];
  borderRadius: unknown[];
}

// ============================================================================
// LAYER ANALYSIS TYPES
// ============================================================================

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
  properties: Record<string, unknown>;
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
  elevation?: number; // Android
}

export interface HierarchyAnalysis {
  depth: number;
  parentType?: string;
  childrenCount: number;
  isLeaf: boolean;
  isContainer: boolean;
  position: 'relative' | 'absolute';
  zIndex?: number;
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

// ============================================================================
// LAYER DATA TYPES
// ============================================================================

// Enhanced Figma fill type
export interface FigmaFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI' | 'VIDEO';
  color?: RGB;
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
  // Additional properties for other fill types
  gradientHandlePositions?: Vector[];
  gradientStops?: Array<{
    color: RGBA;
    position: number;
  }>;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageHash?: string;
  gifRef?: string;
}

// Enhanced Figma stroke type
export interface FigmaStroke {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  color?: RGB;
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
}

// Enhanced Figma effect types
export interface FigmaEffect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  color?: RGBA;
  offset?: Vector;
  radius: number;
  spread?: number;
  visible?: boolean;
  blendMode?: string;
}

// Enhanced FontName type - Use Figma's built-in FontName
// (No need to redefine - Figma provides this)

// Enhanced LineHeight type - Match Figma's actual LineHeight structure
export type FigmaLineHeight = 
  | { readonly unit: "AUTO" }
  | { readonly unit: "PIXELS"; readonly value: number }
  | { readonly unit: "PERCENT"; readonly value: number };

// Enhanced LetterSpacing type - Match Figma's actual LetterSpacing structure  
export type FigmaLetterSpacing = 
  | { readonly unit: "PIXELS"; readonly value: number }
  | { readonly unit: "PERCENT"; readonly value: number };

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
  
  // Visual properties (Enhanced)
  fills?: FigmaFill[];
  strokes?: FigmaStroke[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: FigmaEffect[];
  opacity?: number;
  rotation?: number;
  
  // Text properties (Enhanced)
  fontSize?: number;
  fontName?: FontName; // Use Figma's built-in FontName type
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  characters?: string;
  lineHeight?: LineHeight; // Use Figma's built-in LineHeight type
  letterSpacing?: LetterSpacing; // Use Figma's built-in LetterSpacing type
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