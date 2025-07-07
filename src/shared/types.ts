// Core types for the Figma to React Native plugin

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

export interface ColorToken {
  name: string;
  value: string;
  usage: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic';
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
}

export interface LayerData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children?: LayerData[];
  properties?: LayerProperties;
  deviceInfo?: DeviceInfo | null;
  componentPattern?: ComponentPattern;
}

export interface LayerProperties {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  layoutMode?: string;
  itemSpacing?: number;
  fills?: any[];
  strokes?: any[];
  cornerRadius?: number;
  fontSize?: number;
  fontName?: any;
  characters?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
}

export interface ComponentPattern {
  type: 'button' | 'input' | 'card' | 'text' | 'image' | 'container' | 'header' | 'navigation';
  confidence: number;
  properties: Record<string, any>;
  isInteractive?: boolean;
  hasText?: boolean;
  hasImage?: boolean;
}

export interface GenerationOptions {
  useTypeScript: boolean;
  useResponsive: boolean;
  useThemeTokens: boolean;
  componentType: 'screen' | 'component' | 'section';
  includeNavigation: boolean;
}

// Message types for plugin-UI communication
export interface BaseMessage {
  type: string;
  id?: string;
}

export interface InitializedMessage extends BaseMessage {
  type: 'initialized';
  data: {
    devices: DeviceInfo[];
    baseDevice: DeviceInfo | null;
    themeTokens: ThemeTokens | null;
    layers: LayerData[];
  };
}

export interface ThemeGeneratedMessage extends BaseMessage {
  type: 'theme-generated';
  data: string;
}

export interface CodeGeneratedMessage extends BaseMessage {
  type: 'code-generated';
  data: string;
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  message: string;
}

export interface UIReadyMessage extends BaseMessage {
  type: 'ui-ready';
}

export interface GenerateThemeMessage extends BaseMessage {
  type: 'generate-theme';
}

export interface GenerateCodeMessage extends BaseMessage {
  type: 'generate-code';
  layerId: string;
  options: GenerationOptions;
}

export interface SelectLayerMessage extends BaseMessage {
  type: 'select-layer';
  layerId: string;
}

export interface ReanalyzeMessage extends BaseMessage {
  type: 'reanalyze';
}

export type PluginToUIMessage = 
  | InitializedMessage
  | ThemeGeneratedMessage
  | CodeGeneratedMessage
  | ErrorMessage;

export type UIToPluginMessage = 
  | UIReadyMessage
  | GenerateThemeMessage
  | GenerateCodeMessage
  | SelectLayerMessage
  | ReanalyzeMessage;