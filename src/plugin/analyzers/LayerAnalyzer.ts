// src/plugin/analyzers/LayerAnalyzer.ts - Fixed Version

// Import Figma types first
/// <reference types="@figma/plugin-typings" />


import { 
  LayerData, 
  LayoutAnalysis,
  ComponentPattern,
  VisualProperties,
  TextAnalysis,
  ResponsiveAnalysis,
  DeviceInfo
} from '../../shared/types';

export class LayerAnalyzer {
  
  /**
   * Analyze the layout structure of a layer with error handling
   */
  static analyzeLayout(layer: LayerData): LayoutAnalysis {
    try {
      const props = layer.properties || {};
      
      // Check if it's an auto-layout frame
      if (props.layoutMode && props.layoutMode !== 'NONE') {
        return this.analyzeAutoLayout(layer);
      }
      
      // Check if children are positioned absolutely
      if (layer.children && layer.children.length > 0) {
        return this.analyzeManualLayout(layer);
      }
      
      // Single element or leaf node
      return {
        layoutType: 'absolute',
        isScrollable: this.isScrollableContent(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error analyzing layout for ${layer.name}:`, error);
      return { layoutType: 'absolute' };
    }
  }

  /**
   * Analyze auto-layout frames with validation
   */
  private static analyzeAutoLayout(layer: LayerData): LayoutAnalysis {
    try {
      const props = layer.properties || {};
      
      const analysis: LayoutAnalysis = {
        layoutType: 'flex',
        flexDirection: props.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
        justifyContent: this.mapFigmaJustifyContent(props.primaryAxisAlignItems),
        alignItems: this.mapFigmaAlignItems(props.counterAxisAlignItems),
        isScrollable: this.isScrollableContent(layer)
      };

      // Add spacing if available
      if (typeof props.itemSpacing === 'number') {
        analysis.spacing = props.itemSpacing;
        analysis.gap = props.itemSpacing;
      }

      // Add padding if available
      if (typeof props.paddingTop === 'number' || typeof props.paddingLeft === 'number') {
        analysis.padding = {
          top: props.paddingTop || 0,
          right: props.paddingRight || 0,
          bottom: props.paddingBottom || 0,
          left: props.paddingLeft || 0
        };
      }

      return analysis;
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error in autoLayout analysis:`, error);
      return { layoutType: 'flex', flexDirection: 'column' };
    }
  }

  /**
   * Analyze manually positioned layouts
   */
  private static analyzeManualLayout(layer: LayerData): LayoutAnalysis {
    try {
      if (!layer.children || layer.children.length === 0) {
        return { layoutType: 'absolute' };
      }

      // Check if children are arranged in a grid-like pattern
      if (this.isGridLayout(layer.children)) {
        return {
          layoutType: 'grid',
          isScrollable: this.isScrollableContent(layer)
        };
      }

      // Check if children are stacked (vertically aligned)
      if (this.isStackLayout(layer.children)) {
        return {
          layoutType: 'stack',
          flexDirection: 'column',
          isScrollable: this.isScrollableContent(layer)
        };
      }

      // Default to absolute positioning
      return {
        layoutType: 'absolute',
        isScrollable: this.isScrollableContent(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error in manual layout analysis:`, error);
      return { layoutType: 'absolute' };
    }
  }

  /**
   * Detect component patterns with improved confidence scoring
   */
  static detectComponentPattern(layer: LayerData): ComponentPattern {
    try {
      const patterns = [
        this.checkButtonPattern(layer),
        this.checkInputPattern(layer),
        this.checkCardPattern(layer),
        this.checkListItemPattern(layer),
        this.checkHeaderPattern(layer),
        this.checkImagePattern(layer),
        this.checkTextPattern(layer),
        this.checkNavigationPattern(layer)
      ];

      // Return the pattern with highest confidence
      const bestPattern = patterns.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      // Only return patterns with reasonable confidence
      return bestPattern.confidence > 0.3 ? bestPattern : {
        type: 'container',
        confidence: 0.5,
        properties: {},
        isInteractive: false
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error detecting component pattern for ${layer.name}:`, error);
      return {
        type: 'container',
        confidence: 0.1,
        properties: {},
        isInteractive: false
      };
    }
  }

  /**
   * Extract visual properties with comprehensive error handling
   */
  static extractVisualProperties(layer: LayerData): VisualProperties {
    try {
      const props = layer.properties || {};
      const visual: VisualProperties = {};

      // Extract background color safely using any type to avoid conflicts
      if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) {
        try {
          const fill = props.fills[0] as any;
          if (fill && fill.type === 'SOLID' && fill.color) {
            visual.backgroundColor = this.rgbToHex(fill.color);
          }
        } catch (fillError) {
          console.warn(`⚠️ [LayerAnalyzer] Error extracting fill color:`, fillError);
        }
      }

      // Extract border radius safely
      if (typeof props.cornerRadius === 'number' && props.cornerRadius >= 0) {
        visual.borderRadius = props.cornerRadius;
      }

      // Extract border properties safely
      if (props.strokes && Array.isArray(props.strokes) && props.strokes.length > 0) {
        try {
          const stroke = props.strokes[0] as any;
          if (stroke && stroke.type === 'SOLID' && stroke.color) {
            visual.borderColor = this.rgbToHex(stroke.color);
            visual.borderWidth = typeof props.strokeWeight === 'number' ? props.strokeWeight : 1;
          }
        } catch (strokeError) {
          console.warn(`⚠️ [LayerAnalyzer] Error extracting stroke color:`, strokeError);
        }
      }

      // Extract shadow properties safely
      if (props.effects && Array.isArray(props.effects)) {
        try {
          const shadowEffect = props.effects.find((effect: any) => {
            if (!effect) return false;
            if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return false;
            if (effect.visible === false) return false;
            return true;
          });
          
          if (shadowEffect && shadowEffect.color) {
            visual.shadowProperties = {
              shadowColor: this.rgbToHex(shadowEffect.color),
              shadowOffset: {
                width: shadowEffect.offset?.x || 0,
                height: shadowEffect.offset?.y || 0
              },
              shadowOpacity: shadowEffect.color?.a || 0.25,
              shadowRadius: shadowEffect.radius || 4,
              elevation: Math.round((shadowEffect.radius || 4) / 2)
            };
          }
        } catch (shadowError) {
          console.warn(`⚠️ [LayerAnalyzer] Error extracting shadow properties:`, shadowError);
        }
      }

      // Extract opacity safely
      if (typeof props.opacity === 'number' && props.opacity >= 0 && props.opacity <= 1) {
        visual.opacity = props.opacity;
      }

      // Extract rotation safely
      if (typeof props.rotation === 'number') {
        visual.rotation = props.rotation;
      }

      return visual;
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error extracting visual properties for ${layer.name}:`, error);
      return {};
    }
  }

  /**
   * Analyze text properties with enhanced validation
   */
  static analyzeText(layer: LayerData): TextAnalysis | null {
    try {
      if (layer.type !== 'TEXT') return null;

      const props = layer.properties || {};
      
      const analysis: TextAnalysis = {
        content: props.characters || layer.name || '',
        fontSize: (typeof props.fontSize === 'number' && props.fontSize > 0) ? props.fontSize : 16,
        fontWeight: this.mapFigmaFontWeight(this.getFontStyle(props.fontName)),
        fontFamily: this.getFontFamily(props.fontName) || 'Inter',
        color: this.extractTextColor(props),
        textAlign: this.mapFigmaTextAlign(props.textAlignHorizontal),
        lineHeight: this.getLineHeight(props.lineHeight),
        letterSpacing: this.getLetterSpacing(props.letterSpacing)
      };

      // Determine text type with validation
      analysis.isHeading = this.isHeadingText(analysis);
      analysis.isButton = this.isButtonText(layer, analysis);
      analysis.isLabel = this.isLabelText(analysis);

      return analysis;
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error analyzing text for ${layer.name}:`, error);
      return null;
    }
  }

  // ============================================================================
  // HELPER METHODS - Simplified to avoid type conflicts
  // ============================================================================

  private static rgbToHex(rgb: any): string {
    try {
      if (!rgb || typeof rgb.r !== 'number' || typeof rgb.g !== 'number' || typeof rgb.b !== 'number') {
        return '#000000';
      }
      
      const r = Math.round(Math.max(0, Math.min(255, rgb.r * 255)));
      const g = Math.round(Math.max(0, Math.min(255, rgb.g * 255)));
      const b = Math.round(Math.max(0, Math.min(255, rgb.b * 255)));
      
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error converting RGB to hex:`, error);
      return '#000000';
    }
  }

  private static getFontFamily(fontName: any): string {
    try {
      if (!fontName || typeof fontName !== 'object') return 'Inter';
      return fontName.family || 'Inter';
    } catch {
      return 'Inter';
    }
  }

  private static getFontStyle(fontName: any): string {
    try {
      if (!fontName || typeof fontName !== 'object') return 'Regular';
      return fontName.style || 'Regular';
    } catch {
      return 'Regular';
    }
  }

  private static getLineHeight(lineHeight: any): number | undefined {
    try {
      if (!lineHeight || typeof lineHeight !== 'object') return undefined;
      if (lineHeight.unit === 'AUTO') return undefined;
      if (lineHeight.unit === 'PIXELS' || lineHeight.unit === 'PERCENT') {
        const value = lineHeight.value;
        return typeof value === 'number' && value > 0 ? value : undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private static getLetterSpacing(letterSpacing: any): number | undefined {
    try {
      if (!letterSpacing || typeof letterSpacing !== 'object') return undefined;
      if (letterSpacing.unit === 'PIXELS' || letterSpacing.unit === 'PERCENT') {
        const value = letterSpacing.value;
        return typeof value === 'number' ? value : undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  // ============================================================================
  // PATTERN DETECTION METHODS - Simplified versions
  // ============================================================================

  private static checkButtonPattern(layer: LayerData): ComponentPattern {
    try {
      let confidence = 0;
      const name = (layer.name || '').toLowerCase();

      // Check name indicators
      if (/button|btn|cta|submit|action/.test(name)) confidence += 0.4;

      // Check if it has a background color
      if (layer.properties?.fills && Array.isArray(layer.properties.fills) && layer.properties.fills.length > 0) {
        confidence += 0.2;
      }

      // Check if it has rounded corners
      if (typeof layer.properties?.cornerRadius === 'number' && layer.properties.cornerRadius > 0) {
        confidence += 0.2;
      }

      // Check if it contains text
      if (this.hasTextChild(layer)) confidence += 0.3;

      return {
        type: 'button',
        confidence: Math.min(confidence, 1),
        properties: {
          hasBackground: !!(layer.properties?.fills && Array.isArray(layer.properties.fills) && layer.properties.fills.length > 0),
          hasRoundedCorners: !!(typeof layer.properties?.cornerRadius === 'number' && layer.properties.cornerRadius > 0),
          textContent: this.extractTextFromChildren(layer)
        },
        interactionType: 'touchable',
        isInteractive: true,
        hasText: this.hasTextChild(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking button pattern:`, error);
      return { type: 'button', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  private static checkInputPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = (layer.name || '').toLowerCase();

    if (/input|field|textfield|search|email|password/.test(name)) confidence += 0.5;
    if (layer.properties?.strokes?.length || layer.properties?.fills?.length) confidence += 0.3;

    return {
      type: 'input',
      confidence: Math.min(confidence, 1),
      properties: {},
      isInteractive: true
    };
  }

  private static checkCardPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = (layer.name || '').toLowerCase();

    if (/card|tile|item|post/.test(name)) confidence += 0.3;
    if (layer.children && layer.children.length >= 2) confidence += 0.3;

    return {
      type: 'card',
      confidence: Math.min(confidence, 1),
      properties: {},
      isInteractive: false
    };
  }

  private static checkListItemPattern(layer: LayerData): ComponentPattern {
    return { type: 'list-item', confidence: 0.2, properties: {}, isInteractive: true };
  }

  private static checkHeaderPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = (layer.name || '').toLowerCase();
    if (/header|navbar|title|appbar/.test(name)) confidence += 0.4;

    return {
      type: 'header',
      confidence: Math.min(confidence, 1),
      properties: {},
      isInteractive: false
    };
  }

  private static checkImagePattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    if (layer.type === 'RECTANGLE' && this.hasImageFill(layer)) confidence = 0.9;
    if (layer.type === 'ELLIPSE' && this.hasImageFill(layer)) confidence = 0.9;

    return {
      type: 'image',
      confidence: Math.min(confidence, 1),
      properties: {},
      isInteractive: false,
      hasImage: true
    };
  }

  private static checkTextPattern(layer: LayerData): ComponentPattern {
    if (layer.type !== 'TEXT') {
      return { type: 'text', confidence: 0, properties: {}, isInteractive: false };
    }

    return {
      type: 'text',
      confidence: 0.9,
      properties: {},
      isInteractive: false,
      hasText: true
    };
  }

  private static checkNavigationPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = (layer.name || '').toLowerCase();
    if (/nav|menu|tab|bottom.*bar|navigation/.test(name)) confidence += 0.5;

    return {
      type: 'navigation',
      confidence: Math.min(confidence, 1),
      properties: {},
      isInteractive: true
    };
  }

  // ============================================================================
  // UTILITY METHODS - Simplified
  // ============================================================================

  private static isScrollableContent(layer: LayerData): boolean {
    const name = (layer.name || '').toLowerCase();
    return /scroll|list|feed|content/.test(name);
  }

  private static isGridLayout(children: LayerData[]): boolean {
    return children.length >= 4; // Simplified check
  }

  private static isStackLayout(children: LayerData[]): boolean {
    return children.length >= 2; // Simplified check
  }

  private static hasTextChild(layer: LayerData): boolean {
    if (!layer.children) return false;
    return layer.children.some(child => 
      child.type === 'TEXT' || this.hasTextChild(child)
    );
  }

  private static hasImageFill(layer: LayerData): boolean {
    try {
      const fills = layer.properties?.fills;
      if (!fills || !Array.isArray(fills)) return false;
      return fills.some((fill: any) => fill && fill.type === 'IMAGE');
    } catch {
      return false;
    }
  }

  private static extractTextFromChildren(layer: LayerData): string {
    if (layer.type === 'TEXT') {
      return layer.properties?.characters || layer.name || '';
    }
    
    if (!layer.children) return '';
    
    return layer.children
      .map(child => this.extractTextFromChildren(child))
      .filter(text => text.length > 0)
      .join(' ');
  }

  private static extractTextColor(props: any): string {
    try {
      if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) {
        const fill = props.fills[0] as any;
        if (fill && fill.type === 'SOLID' && fill.color) {
          return this.rgbToHex(fill.color);
        }
      }
      return '#000000';
    } catch {
      return '#000000';
    }
  }

  // Mapping functions
  private static mapFigmaJustifyContent(align?: string): LayoutAnalysis['justifyContent'] {
    const mapping: Record<string, LayoutAnalysis['justifyContent']> = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between'
    };
    return mapping[align || ''] || 'flex-start';
  }

  private static mapFigmaAlignItems(align?: string): LayoutAnalysis['alignItems'] {
    const mapping: Record<string, LayoutAnalysis['alignItems']> = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'STRETCH': 'stretch'
    };
    return mapping[align || ''] || 'flex-start';
  }

  private static mapFigmaFontWeight(style: string): string {
    const weightMap: Record<string, string> = {
      'Thin': '100',
      'ExtraLight': '200',
      'Light': '300',
      'Regular': '400',
      'Medium': '500',
      'SemiBold': '600',
      'Bold': '700',
      'ExtraBold': '800',
      'Black': '900'
    };
    return weightMap[style] || '400';
  }

  private static mapFigmaTextAlign(align?: string): TextAnalysis['textAlign'] {
    const mapping: Record<string, TextAnalysis['textAlign']> = {
      'LEFT': 'left',
      'CENTER': 'center',
      'RIGHT': 'right'
    };
    return mapping[align || ''] || 'left';
  }

  private static isHeadingText(analysis: TextAnalysis): boolean {
    return analysis.fontSize >= 20 || parseInt(analysis.fontWeight) >= 600;
  }

  private static isButtonText(layer: LayerData, analysis: TextAnalysis): boolean {
    const name = (layer.name || '').toLowerCase();
    return /button|btn|cta/.test(name) || parseInt(analysis.fontWeight) >= 600;
  }

  private static isLabelText(analysis: TextAnalysis): boolean {
    return analysis.fontSize <= 14 && parseInt(analysis.fontWeight) < 600;
  }
}