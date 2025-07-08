// src/plugin/analyzers/LayerAnalyzer.ts - Complete Enhanced Version with Better Error Handling
import { 
  LayerData, 
  NodeProperties, 
  DeviceInfo,
  LayoutAnalysis,
  ComponentPattern,
  VisualProperties,
  HierarchyAnalysis,
  TextAnalysis,
  ResponsiveAnalysis
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

      // Extract background color safely
      if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) {
        try {
          const fill = props.fills[0] as Paint;
          if (fill && fill.type === 'SOLID' && 'color' in fill && fill.color) {
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
          const stroke = props.strokes[0] as Paint;
          if (stroke && stroke.type === 'SOLID' && 'color' in stroke && stroke.color) {
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
          const shadowEffect = props.effects.find((effect: Effect) => {
            if (!effect) return false;
            
            // Check if it's a shadow effect type
            if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return false;
            
            // Check if it has visible property and if it's not false
            const hasVisible = 'visible' in effect;
            if (hasVisible && (effect as any).visible === false) return false;
            
            return true;
          }) as DropShadowEffect | InnerShadowEffect | undefined;
          
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

  /**
   * Analyze hierarchy and positioning
   */
  static analyzeHierarchy(layer: LayerData, depth: number = 0): HierarchyAnalysis {
    try {
      return {
        depth,
        childrenCount: layer.children?.length || 0,
        isLeaf: !layer.children || layer.children.length === 0,
        isContainer: (layer.children?.length || 0) > 0,
        position: this.determinePositionType(layer),
        zIndex: this.calculateZIndex(layer, depth)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error analyzing hierarchy for ${layer.name}:`, error);
      return {
        depth,
        childrenCount: 0,
        isLeaf: true,
        isContainer: false,
        position: 'relative'
      };
    }
  }

  /**
   * Analyze responsive behavior
   */
  static analyzeResponsive(layer: LayerData, baseDevice: DeviceInfo): ResponsiveAnalysis {
    try {
      const props = layer.properties || {};
      
      return {
        baseWidth: props.width || 0,
        baseHeight: props.height || 0,
        scaleType: this.determineScaleType(layer, baseDevice),
        aspectRatio: props.width && props.height ? props.width / props.height : undefined
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error analyzing responsive for ${layer.name}:`, error);
      return {
        baseWidth: 0,
        baseHeight: 0,
        scaleType: 'fixed'
      };
    }
  }

  // ============================================================================
  // HELPER METHODS FOR TEXT PROPERTIES
  // ============================================================================

  private static getFontFamily(fontName: FontName | undefined): string {
    try {
      if (!fontName || typeof fontName !== 'object') return 'Inter';
      return fontName.family || 'Inter';
    } catch {
      return 'Inter';
    }
  }

  private static getFontStyle(fontName: FontName | undefined): string {
    try {
      if (!fontName || typeof fontName !== 'object') return 'Regular';
      return fontName.style || 'Regular';
    } catch {
      return 'Regular';
    }
  }

  private static getLineHeight(lineHeight: LineHeight | undefined): number | undefined {
    try {
      if (!lineHeight || typeof lineHeight !== 'object') return undefined;
      
      if (lineHeight.unit === 'AUTO') {
        return undefined;
      }
      
      if ((lineHeight.unit === 'PIXELS' || lineHeight.unit === 'PERCENT') && 'value' in lineHeight) {
        const value = (lineHeight as any).value;
        return typeof value === 'number' && value > 0 ? value : undefined;
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }

  private static getLetterSpacing(letterSpacing: LetterSpacing | undefined): number | undefined {
    try {
      if (!letterSpacing || typeof letterSpacing !== 'object') return undefined;
      
      if ('value' in letterSpacing) {
        const value = (letterSpacing as any).value;
        if (typeof value === 'number' && 
            (letterSpacing.unit === 'PIXELS' || letterSpacing.unit === 'PERCENT')) {
          return value;
        }
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }

  // ============================================================================
  // PATTERN DETECTION METHODS
  // ============================================================================

  private static checkButtonPattern(layer: LayerData): ComponentPattern {
    try {
      let confidence = 0;
      const props = layer.properties || {};
      const name = (layer.name || '').toLowerCase();

      // Check name indicators
      if (/button|btn|cta|submit|action/.test(name)) confidence += 0.4;

      // Check if it has a background color
      if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) confidence += 0.2;

      // Check if it has rounded corners
      if (typeof props.cornerRadius === 'number' && props.cornerRadius > 0) confidence += 0.2;

      // Check if it contains text
      if (this.hasTextChild(layer)) confidence += 0.3;

      // Check size constraints (reasonable button size)
      if (typeof props.width === 'number' && typeof props.height === 'number') {
        if (props.width >= 60 && props.width <= 300 && props.height >= 32 && props.height <= 60) {
          confidence += 0.2;
        }
      }

      return {
        type: 'button',
        confidence: Math.min(confidence, 1),
        properties: {
          hasBackground: !!(props.fills && Array.isArray(props.fills) && props.fills.length > 0),
          hasRoundedCorners: !!(typeof props.cornerRadius === 'number' && props.cornerRadius > 0),
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
    try {
      let confidence = 0;
      const name = (layer.name || '').toLowerCase();

      // Check name indicators
      if (/input|field|textfield|search|email|password/.test(name)) confidence += 0.5;

      // Check if it has a border or background
      if (layer.properties?.strokes?.length || layer.properties?.fills?.length) confidence += 0.3;

      // Check if it contains placeholder text
      if (this.hasPlaceholderText(layer)) confidence += 0.3;

      return {
        type: 'input',
        confidence: Math.min(confidence, 1),
        properties: {
          placeholder: this.extractPlaceholderText(layer),
          inputType: this.determineInputType(layer)
        },
        interactionType: 'touchable',
        isInteractive: true,
        hasText: this.hasTextChild(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking input pattern:`, error);
      return { type: 'input', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  private static checkCardPattern(layer: LayerData): ComponentPattern {
    try {
      let confidence = 0;
      const props = layer.properties || {};
      const name = (layer.name || '').toLowerCase();

      // Check name indicators
      if (/card|tile|item|post/.test(name)) confidence += 0.3;

      // Check if it has shadow or border
      if (props.effects && Array.isArray(props.effects)) {
        const hasShadow = props.effects.some((effect: Effect) => {
          if (!effect || effect.type !== 'DROP_SHADOW') return false;
          
          // Check visible property safely
          const hasVisible = 'visible' in effect;
          if (hasVisible && (effect as any).visible === false) return false;
          
          return true;
        });
        if (hasShadow) confidence += 0.3;
      }
      
      if (props.strokes && Array.isArray(props.strokes) && props.strokes.length > 0) confidence += 0.2;

      // Check if it has rounded corners
      if (typeof props.cornerRadius === 'number' && props.cornerRadius > 4) confidence += 0.2;

      // Check if it has multiple children (complex content)
      if (layer.children && layer.children.length >= 2) confidence += 0.3;

      return {
        type: 'card',
        confidence: Math.min(confidence, 1),
        properties: {
          hasElevation: !!(props.effects && Array.isArray(props.effects) && 
            props.effects.some((effect: Effect) => {
              if (!effect || effect.type !== 'DROP_SHADOW') return false;
              const hasVisible = 'visible' in effect;
              return !hasVisible || (effect as any).visible !== false;
            })),
          hasBorder: !!(props.strokes && Array.isArray(props.strokes) && props.strokes.length > 0),
          childrenCount: layer.children?.length || 0
        },
        interactionType: this.isClickableCard(layer) ? 'touchable' : 'static',
        isInteractive: this.isClickableCard(layer),
        hasText: this.hasTextChild(layer),
        hasImage: this.hasImageChild(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking card pattern:`, error);
      return { type: 'card', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  private static checkListItemPattern(layer: LayerData): ComponentPattern {
    try {
      let confidence = 0;
      const name = (layer.name || '').toLowerCase();

      // Check name indicators
      if (/item|row|cell|entry/.test(name)) confidence += 0.3;

      // Check if parent seems like a list
      if (this.hasListLikeParent(layer)) confidence += 0.4;

      // Check layout structure
      if (this.hasHorizontalLayout(layer)) confidence += 0.3;

      return {
        type: 'list-item',
        confidence: Math.min(confidence, 1),
        properties: {
          layout: this.getItemLayout(layer)
        },
        interactionType: 'touchable',
        isInteractive: true,
        hasText: this.hasTextChild(layer),
        hasImage: this.hasImageChild(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking list item pattern:`, error);
      return { type: 'list-item', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  private static checkHeaderPattern(layer: LayerData): ComponentPattern {
    try {
      let confidence = 0;
      const name = (layer.name || '').toLowerCase();
      const props = layer.properties || {};

      // Check name indicators
      if (/header|navbar|title|appbar/.test(name)) confidence += 0.4;

      // Check position (likely at top)
      if (typeof props.y === 'number' && props.y < 100) confidence += 0.3;

      // Check if it spans full width
      if (this.spansFullWidth(layer)) confidence += 0.3;

      return {
        type: 'header',
        confidence: Math.min(confidence, 1),
        properties: {
          position: 'top',
          hasNavigation: this.hasNavigationElements(layer)
        },
        interactionType: 'static',
        isInteractive: this.hasNavigationElements(layer),
        hasText: this.hasTextChild(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking header pattern:`, error);
      return { type: 'header', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  private static checkImagePattern(layer: LayerData): ComponentPattern {
    try {
      let confidence = 0;

      // Direct image check
      if (layer.type === 'RECTANGLE' && this.hasImageFill(layer)) confidence = 0.9;
      if (layer.type === 'ELLIPSE' && this.hasImageFill(layer)) confidence = 0.9;

      // Name indicators
      const name = (layer.name || '').toLowerCase();
      if (/image|img|photo|picture|avatar|icon/.test(name)) confidence += 0.3;

      return {
        type: 'image',
        confidence: Math.min(confidence, 1),
        properties: {
          aspectRatio: this.calculateAspectRatio(layer),
          isCircular: layer.type === 'ELLIPSE',
          isIcon: this.isIconSized(layer)
        },
        interactionType: 'static',
        isInteractive: false,
        hasImage: true
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking image pattern:`, error);
      return { type: 'image', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  private static checkTextPattern(layer: LayerData): ComponentPattern {
    try {
      if (layer.type !== 'TEXT') {
        return { type: 'text', confidence: 0, properties: {}, isInteractive: false };
      }

      return {
        type: 'text',
        confidence: 0.9,
        properties: {
          textType: this.determineTextType(layer)
        },
        interactionType: 'static',
        isInteractive: false,
        hasText: true
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking text pattern:`, error);
      return { type: 'text', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  private static checkNavigationPattern(layer: LayerData): ComponentPattern {
    try {
      let confidence = 0;
      const name = (layer.name || '').toLowerCase();

      // Check name indicators
      if (/nav|menu|tab|bottom.*bar|navigation/.test(name)) confidence += 0.5;

      // Check if it has multiple similar children (nav items)
      if (this.hasNavigationItems(layer)) confidence += 0.4;

      return {
        type: 'navigation',
        confidence: Math.min(confidence, 1),
        properties: {
          navigationType: this.determineNavigationType(layer),
          itemCount: this.countNavigationItems(layer)
        },
        interactionType: 'touchable',
        isInteractive: true,
        hasText: this.hasTextChild(layer)
      };
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking navigation pattern:`, error);
      return { type: 'navigation', confidence: 0, properties: {}, isInteractive: false };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private static isGridLayout(children: LayerData[]): boolean {
    try {
      if (!children || children.length < 4) return false;
      
      // Check if children are arranged in rows and columns
      const positions = children
        .filter(child => child.properties && typeof child.properties.x === 'number' && typeof child.properties.y === 'number')
        .map(child => ({
          x: child.properties!.x!,
          y: child.properties!.y!
        }));

      if (positions.length < 4) return false;

      const uniqueY = [...new Set(positions.map(p => Math.round(p.y / 10) * 10))];
      const uniqueX = [...new Set(positions.map(p => Math.round(p.x / 10) * 10))];

      return uniqueY.length >= 2 && uniqueX.length >= 2;
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking grid layout:`, error);
      return false;
    }
  }

  private static isStackLayout(children: LayerData[]): boolean {
    try {
      if (!children || children.length < 2) return false;

      // Check if children are vertically aligned with consistent spacing
      const yPositions = children
        .filter(child => child.properties && typeof child.properties.y === 'number')
        .map(child => child.properties!.y!)
        .sort((a, b) => a - b);

      if (yPositions.length < 2) return false;

      const gaps = [];
      
      for (let i = 1; i < yPositions.length; i++) {
        gaps.push(yPositions[i] - yPositions[i - 1]);
      }

      if (gaps.length === 0) return false;

      // Check if gaps are relatively consistent
      const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      const maxVariation = Math.max(...gaps) - Math.min(...gaps);
      
      return maxVariation < avgGap * 0.5; // Less than 50% variation
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking stack layout:`, error);
      return false;
    }
  }

  private static isScrollableContent(layer: LayerData): boolean {
    try {
      const name = (layer.name || '').toLowerCase();
      if (/scroll|list|feed|content/.test(name)) return true;

      // Check if content exceeds typical screen bounds
      const props = layer.properties || {};
      if (typeof props.height === 'number' && props.height > 800) return true;

      return false;
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking scrollable content:`, error);
      return false;
    }
  }

  private static hasTextChild(layer: LayerData): boolean {
    try {
      if (!layer.children) return false;
      return layer.children.some(child => 
        child.type === 'TEXT' || this.hasTextChild(child)
      );
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking text child:`, error);
      return false;
    }
  }

  private static hasImageChild(layer: LayerData): boolean {
    try {
      if (!layer.children) return false;
      return layer.children.some(child => 
        this.hasImageFill(child) || this.hasImageChild(child)
      );
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking image child:`, error);
      return false;
    }
  }

  private static hasImageFill(layer: LayerData): boolean {
    try {
      const fills = layer.properties?.fills;
      if (!fills || !Array.isArray(fills)) return false;
      return fills.some((fill: Paint) => fill && fill.type === 'IMAGE');
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error checking image fill:`, error);
      return false;
    }
  }

  private static extractTextFromChildren(layer: LayerData): string {
    try {
      if (layer.type === 'TEXT') {
        return layer.properties?.characters || layer.name || '';
      }
      
      if (!layer.children) return '';
      
      return layer.children
        .map(child => this.extractTextFromChildren(child))
        .filter(text => text.length > 0)
        .join(' ');
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error extracting text from children:`, error);
      return '';
    }
  }

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

  private static rgbToHex(rgb: RGB | null): string {
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

  private static extractTextColor(props: NodeProperties): string {
    try {
      if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) {
        const fill = props.fills[0] as Paint;
        if (fill && fill.type === 'SOLID' && 'color' in fill && fill.color) {
          return this.rgbToHex(fill.color);
        }
      }
      return '#000000';
    } catch (error) {
      console.warn(`⚠️ [LayerAnalyzer] Error extracting text color:`, error);
      return '#000000';
    }
  }

  private static isHeadingText(analysis: TextAnalysis): boolean {
    try {
      return analysis.fontSize >= 20 || parseInt(analysis.fontWeight) >= 600;
    } catch {
      return false;
    }
  }

  private static isButtonText(layer: LayerData, analysis: TextAnalysis): boolean {
    try {
      const name = (layer.name || '').toLowerCase();
      return /button|btn|cta/.test(name) || parseInt(analysis.fontWeight) >= 600;
    } catch {
      return false;
    }
  }

  private static isLabelText(analysis: TextAnalysis): boolean {
    try {
      return analysis.fontSize <= 14 && parseInt(analysis.fontWeight) < 600;
    } catch {
      return false;
    }
  }

  private static determinePositionType(layer: LayerData): 'relative' | 'absolute' {
    try {
      const props = layer.properties || {};
      return (typeof props.x === 'number' && typeof props.y === 'number') ? 'absolute' : 'relative';
    } catch {
      return 'relative';
    }
  }

  private static calculateZIndex(layer: LayerData, depth: number): number {
    try {
      return depth * 10;
    } catch {
      return 0;
    }
  }

  private static determineScaleType(layer: LayerData, baseDevice: DeviceInfo): ResponsiveAnalysis['scaleType'] {
    try {
      const props = layer.properties || {};
      
      if (typeof props.width === 'number' && Math.abs(props.width - baseDevice.width) < 50) {
        return 'responsive';
      }
      
      if (typeof props.width === 'number' && typeof props.height === 'number' && 
          props.width < 100 && props.height < 100) {
        return 'fixed';
      }
      
      return 'flexible';
    } catch {
      return 'fixed';
    }
  }

  // Additional helper methods for pattern detection
  private static hasPlaceholderText(layer: LayerData): boolean {
    try {
      const text = this.extractTextFromChildren(layer).toLowerCase();
      return /placeholder|enter|type|search/.test(text);
    } catch {
      return false;
    }
  }

  private static extractPlaceholderText(layer: LayerData): string {
    try {
      return this.extractTextFromChildren(layer) || 'Enter text';
    } catch {
      return 'Enter text';
    }
  }

  private static determineInputType(layer: LayerData): string {
    try {
      const name = (layer.name || '').toLowerCase();
      const text = this.extractTextFromChildren(layer).toLowerCase();
      
      if (/password/.test(name + text)) return 'password';
      if (/email/.test(name + text)) return 'email';
      if (/phone|tel/.test(name + text)) return 'phone';
      if (/number/.test(name + text)) return 'numeric';
      
      return 'default';
    } catch {
      return 'default';
    }
  }

  private static isClickableCard(layer: LayerData): boolean {
    try {
      const name = (layer.name || '').toLowerCase();
      return /clickable|tap|press|card/.test(name);
    } catch {
      return false;
    }
  }

  private static hasListLikeParent(_layer: LayerData): boolean {
    // This would need parent context, for now return false
    return false;
  }

  private static hasHorizontalLayout(layer: LayerData): boolean {
    try {
      if (!layer.children || layer.children.length < 2) return false;
      
      const firstChild = layer.children[0];
      const secondChild = layer.children[1];
      
      if (!firstChild.properties || !secondChild.properties) return false;
      
      const y1 = firstChild.properties.y;
      const y2 = secondChild.properties.y;
      const x1 = firstChild.properties.x;
      const x2 = secondChild.properties.x;
      
      if (typeof y1 !== 'number' || typeof y2 !== 'number' || 
          typeof x1 !== 'number' || typeof x2 !== 'number') return false;
      
      const yDiff = Math.abs(y1 - y2);
      const xDiff = Math.abs(x1 - x2);
      
      return xDiff > yDiff;
    } catch {
      return false;
    }
  }

  private static getItemLayout(layer: LayerData): string {
    try {
      return this.hasHorizontalLayout(layer) ? 'horizontal' : 'vertical';
    } catch {
      return 'vertical';
    }
  }

  private static spansFullWidth(layer: LayerData): boolean {
    try {
      const width = layer.properties?.width || 0;
      return typeof width === 'number' && width > 300;
    } catch {
      return false;
    }
  }

  private static hasNavigationElements(layer: LayerData): boolean {
    try {
      if (!layer.children) return false;
      
      const navKeywords = /back|menu|search|profile|settings/;
      return layer.children.some(child => navKeywords.test((child.name || '').toLowerCase()));
    } catch {
      return false;
    }
  }

  private static calculateAspectRatio(layer: LayerData): number | undefined {
    try {
      const props = layer.properties || {};
      if (typeof props.width === 'number' && typeof props.height === 'number' && props.height > 0) {
        return props.width / props.height;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private static isIconSized(layer: LayerData): boolean {
    try {
      const props = layer.properties || {};
      const width = props.width || 0;
      const height = props.height || 0;
      
      if (typeof width !== 'number' || typeof height !== 'number') return false;
      
      return width <= 48 && height <= 48 && Math.abs(width - height) <= 8;
    } catch {
      return false;
    }
  }

  private static determineTextType(layer: LayerData): string {
    try {
      const fontSize = layer.properties?.fontSize || 16;
      
      if (typeof fontSize !== 'number') return 'body';
      
      if (fontSize >= 24) return 'heading';
      if (fontSize >= 18) return 'subheading';
      if (fontSize >= 16) return 'body';
      if (fontSize >= 14) return 'caption';
      
      return 'small';
    } catch {
      return 'body';
    }
  }

  private static hasNavigationItems(layer: LayerData): boolean {
    try {
      if (!layer.children || layer.children.length < 2) return false;
      
      const firstChild = layer.children[0];
      const similarChildren = layer.children.filter(child => {
        if (child.type !== firstChild.type) return false;
        
        const width1 = firstChild.properties?.width;
        const width2 = child.properties?.width;
        
        if (typeof width1 !== 'number' || typeof width2 !== 'number') return false;
        
        return Math.abs(width1 - width2) < 20;
      });
      
      return similarChildren.length >= 2;
    } catch {
      return false;
    }
  }

  private static determineNavigationType(layer: LayerData): string {
    try {
      const name = (layer.name || '').toLowerCase();
      const props = layer.properties || {};
      
      if (/bottom|tab/.test(name)) return 'bottom-tabs';
      if (/top|header/.test(name)) return 'top-tabs';
      if (typeof props.y === 'number' && props.y < 100) return 'top-navigation';
      
      return 'bottom-navigation';
    } catch {
      return 'bottom-navigation';
    }
  }

  private static countNavigationItems(layer: LayerData): number {
    try {
      return layer.children?.length || 0;
    } catch {
      return 0;
    }
  }
}