// src/plugin/types/LayerTypes.ts
import { DeviceInfo } from '../core/DeviceDetector';
import { LayoutAnalysis, ComponentPattern, VisualProperties, TextAnalysis } from '../analyzers/LayerAnalyzer';

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
  
  // Text properties
  fontSize?: number;
  fontName?: any;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  characters?: string;
  lineHeight?: any;
  letterSpacing?: any;
}