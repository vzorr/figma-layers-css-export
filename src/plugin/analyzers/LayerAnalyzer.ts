// src/plugin/analyzers/LayerAnalyzer.ts - Fixed TypeScript Issues
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

// Define proper types for Figma effects
interface FigmaDropShadowEffect {
  type: 'DROP_SHADOW';
  color: RGB & { a?: number };
  offset: Vector;
  radius: number;
  spread?: number;
  visible?: boolean;
  blendMode?: BlendMode;
}

interface FigmaInnerShadowEffect {
  type: 'INNER_SHADOW';
  color: RGB & { a?: number };
  offset: Vector;
  radius: number;
  spread?: number;
  visible?: boolean;
  blendMode?: BlendMode;
}

type FigmaEffect = FigmaDropShadowEffect | FigmaInnerShadowEffect | Effect;

export class LayerAnalyzer {
  
  /**
   * Analyze the layout structure of a layer
   */
  static analyzeLayout(layer: LayerData): LayoutAnalysis {
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
  }

  /**
   * Analyze auto-layout frames
   */
  private static analyzeAutoLayout(layer: LayerData): LayoutAnalysis {
    const props = layer.properties || {};
    
    return {
      layoutType: 'flex',
      flexDirection: props.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
      justifyContent: this.mapFigmaJustifyContent(props.primaryAxisAlignItems),
      alignItems: this.mapFigmaAlignItems(props.counterAxisAlignItems),
      spacing: props.itemSpacing || 0,
      padding: {
        top: props.paddingTop || 0,
        right: props.paddingRight || 0,
        bottom: props.paddingBottom || 0,
        left: props.paddingLeft || 0
      },
      gap: props.itemSpacing || 0,
      isScrollable: this.isScrollableContent(layer)
    };
  }

  /**
   * Analyze manually positioned layouts
   */
  private static analyzeManualLayout(layer: LayerData): LayoutAnalysis {
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
  }

  /**
   * Detect component patterns based on layer structure and properties
   */
  static detectComponentPattern(layer: LayerData): ComponentPattern {
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

    return bestPattern.confidence > 0.3 ? bestPattern : {
      type: 'container',
      confidence: 0.5,
      properties: {},
      isInteractive: false
    };
  }

  /**
   * Extract visual properties from a layer
   */
  static extractVisualProperties(layer: LayerData): VisualProperties {
    const props = layer.properties || {};
    const visual: VisualProperties = {};

    // Extract background color
    if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) {
      const fill = props.fills[0] as Paint;
      if (fill && fill.type === 'SOLID' && 'color' in fill) {
        visual.backgroundColor = this.rgbToHex(fill.color);
      }
    }

    // Extract border radius
    if (typeof props.cornerRadius === 'number') {
      visual.borderRadius = props.cornerRadius;
    }

    // Extract border properties
    if (props.strokes && Array.isArray(props.strokes) && props.strokes.length > 0) {
      const stroke = props.strokes[0] as Paint;
      if (stroke && stroke.type === 'SOLID' && 'color' in stroke) {
        visual.borderColor = this.rgbToHex(stroke.color);
        visual.borderWidth = props.strokeWeight || 1;
      }
    }

    // Extract shadow properties - FIXED
    if (props.effects && Array.isArray(props.effects)) {
      const shadowEffect = props.effects.find((effect: Effect) => 
        effect && effect.visible !== false && (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
      ) as DropShadowEffect | InnerShadowEffect | undefined;
      
      if (shadowEffect) {
        visual.shadowProperties = {
          shadowColor: this.rgbToHex(shadowEffect.color),
          shadowOffset: {
            width: shadowEffect.offset?.x || 0,
            height: shadowEffect.offset?.y || 0
          },
          shadowOpacity: shadowEffect.color?.a || 0.25,
          shadowRadius: shadowEffect.radius || 4,
          elevation: Math.round((shadowEffect.radius || 4) / 2) // Android elevation
        };
      }
    }

    // Extract opacity
    if (typeof props.opacity === 'number') {
      visual.opacity = props.opacity;
    }

    // Extract rotation
    if (typeof props.rotation === 'number') {
      visual.rotation = props.rotation;
    }

    return visual;
  }

  /**
   * Analyze text properties for text layers
   */
  static analyzeText(layer: LayerData): TextAnalysis | null {
    if (layer.type !== 'TEXT') return null;

    const props = layer.properties || {};
    
    const analysis: TextAnalysis = {
      content: props.characters || layer.name || '',
      fontSize: (typeof props.fontSize === 'number') ? props.fontSize : 16,
      fontWeight: this.mapFigmaFontWeight(this.getFontStyle(props.fontName)),
      fontFamily: this.getFontFamily(props.fontName) || 'Inter',
      color: this.extractTextColor(props),
      textAlign: this.mapFigmaTextAlign(props.textAlignHorizontal),
      lineHeight: this.getLineHeight(props.lineHeight),
      letterSpacing: this.getLetterSpacing(props.letterSpacing)
    };

    // Determine text type
    analysis.isHeading = this.isHeadingText(analysis);
    analysis.isButton = this.isButtonText(layer, analysis);
    analysis.isLabel = this.isLabelText(analysis);

    return analysis;
  }

  /**
   * Analyze hierarchy and positioning
   */
  static analyzeHierarchy(layer: LayerData, depth: number = 0): HierarchyAnalysis {
    return {
      depth,
      childrenCount: layer.children?.length || 0,
      isLeaf: !layer.children || layer.children.length === 0,
      isContainer: (layer.children?.length || 0) > 0,
      position: this.determinePositionType(layer),
      zIndex: this.calculateZIndex(layer, depth)
    };
  }

  /**
   * Analyze responsive behavior
   */
  static analyzeResponsive(layer: LayerData, baseDevice: DeviceInfo): ResponsiveAnalysis {
    const props = layer.properties || {};
    
    return {
      baseWidth: props.width || 0,
      baseHeight: props.height || 0,
      scaleType: this.determineScaleType(layer, baseDevice),
      aspectRatio: props.width && props.height ? props.width / props.height : undefined
    };
  }

  // ============================================================================
  // HELPER METHODS FOR TEXT PROPERTIES
  // ============================================================================

  private static getFontFamily(fontName: FontName | undefined): string {
    if (!fontName) return 'Inter';
    return fontName.family || 'Inter';
  }

  private static getFontStyle(fontName: FontName | undefined): string {
    if (!fontName) return 'Regular';
    return fontName.style || 'Regular';
  }

  private static getLineHeight(lineHeight: LineHeight | undefined): number | undefined {
    if (!lineHeight) return undefined;
    
    // Handle Figma's LineHeight structure
    if (typeof lineHeight === 'object') {
      if (lineHeight.unit === 'AUTO') {
        return undefined; // AUTO lineHeight doesn't have a numeric value
      }
      if ((lineHeight.unit === 'PIXELS' || lineHeight.unit === 'PERCENT') && 'value' in lineHeight) {
        return lineHeight.value;
      }
    }
    return undefined;
  }

  private static getLetterSpacing(letterSpacing: LetterSpacing | undefined): number | undefined {
    if (!letterSpacing) return undefined;
    
    // Handle Figma's LetterSpacing structure
    if (typeof letterSpacing === 'object' && 'value' in letterSpacing) {
      if (letterSpacing.unit === 'PIXELS' || letterSpacing.unit === 'PERCENT') {
        return letterSpacing.value;
      }
    }
    return undefined;
  }

  // ============================================================================
  // PATTERN DETECTION METHODS
  // ============================================================================

  private static checkButtonPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const props = layer.properties || {};
    const name = layer.name.toLowerCase();

    // Check name indicators
    if (/button|btn|cta|submit|action/.test(name)) confidence += 0.4;

    // Check if it has a background color
    if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) confidence += 0.2;

    // Check if it has rounded corners
    if (props.cornerRadius && props.cornerRadius > 0) confidence += 0.2;

    // Check if it contains text
    if (this.hasTextChild(layer)) confidence += 0.3;

    // Check size constraints (reasonable button size)
    if (props.width && props.height) {
      if (props.width >= 60 && props.width <= 300 && props.height >= 32 && props.height <= 60) {
        confidence += 0.2;
      }
    }

    return {
      type: 'button',
      confidence: Math.min(confidence, 1),
      properties: {
        hasBackground: !!(props.fills && Array.isArray(props.fills) && props.fills.length > 0),
        hasRoundedCorners: !!(props.cornerRadius && props.cornerRadius > 0),
        textContent: this.extractTextFromChildren(layer)
      },
      interactionType: 'touchable',
      isInteractive: true,
      hasText: this.hasTextChild(layer)
    };
  }

  private static checkInputPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = layer.name.toLowerCase();

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
  }

  private static checkCardPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const props = layer.properties || {};
    const name = layer.name.toLowerCase();

    // Check name indicators
    if (/card|tile|item|post/.test(name)) confidence += 0.3;

    // Check if it has shadow or border
    if (props.effects && Array.isArray(props.effects)) {
      const hasShadow = props.effects.some((effect: Effect) => 
        effect && effect.visible !== false && effect.type === 'DROP_SHADOW'
      );
      if (hasShadow) confidence += 0.3;
    }
    
    if (props.strokes && Array.isArray(props.strokes) && props.strokes.length > 0) confidence += 0.2;

    // Check if it has rounded corners
    if (props.cornerRadius && props.cornerRadius > 4) confidence += 0.2;

    // Check if it has multiple children (complex content)
    if (layer.children && layer.children.length >= 2) confidence += 0.3;

    return {
      type: 'card',
      confidence: Math.min(confidence, 1),
      properties: {
        hasElevation: !!(props.effects && Array.isArray(props.effects) && 
          props.effects.some((effect: Effect) => effect && effect.visible !== false && effect.type === 'DROP_SHADOW')),
        hasBorder: !!(props.strokes && Array.isArray(props.strokes) && props.strokes.length > 0),
        childrenCount: layer.children?.length || 0
      },
      interactionType: this.isClickableCard(layer) ? 'touchable' : 'static',
      isInteractive: this.isClickableCard(layer),
      hasText: this.hasTextChild(layer),
      hasImage: this.hasImageChild(layer)
    };
  }

  private static checkListItemPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = layer.name.toLowerCase();

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
  }

  private static checkHeaderPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = layer.name.toLowerCase();
    const props = layer.properties || {};

    // Check name indicators
    if (/header|navbar|title|appbar/.test(name)) confidence += 0.4;

    // Check position (likely at top)
    if (props.y !== undefined && props.y < 100) confidence += 0.3;

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
  }

  private static checkImagePattern(layer: LayerData): ComponentPattern {
    let confidence = 0;

    // Direct image check
    if (layer.type === 'RECTANGLE' && this.hasImageFill(layer)) confidence = 0.9;
    if (layer.type === 'ELLIPSE' && this.hasImageFill(layer)) confidence = 0.9;

    // Name indicators
    const name = layer.name.toLowerCase();
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
  }

  private static checkTextPattern(layer: LayerData): ComponentPattern {
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
  }

  private static checkNavigationPattern(layer: LayerData): ComponentPattern {
    let confidence = 0;
    const name = layer.name.toLowerCase();

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
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private static isGridLayout(children: LayerData[]): boolean {
    if (children.length < 4) return false;
    
    // Check if children are arranged in rows and columns
    const positions = children.map(child => ({
      x: child.properties?.x || 0,
      y: child.properties?.y || 0
    }));

    const uniqueY = [...new Set(positions.map(p => Math.round(p.y / 10) * 10))];
    const uniqueX = [...new Set(positions.map(p => Math.round(p.x / 10) * 10))];

    return uniqueY.length >= 2 && uniqueX.length >= 2;
  }

  private static isStackLayout(children: LayerData[]): boolean {
    if (children.length < 2) return false;

    // Check if children are vertically aligned with consistent spacing
    const yPositions = children.map(child => child.properties?.y || 0).sort((a, b) => a - b);
    const gaps = [];
    
    for (let i = 1; i < yPositions.length; i++) {
      gaps.push(yPositions[i] - yPositions[i - 1]);
    }

    // Check if gaps are relatively consistent
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const maxVariation = Math.max(...gaps) - Math.min(...gaps);
    
    return maxVariation < avgGap * 0.5; // Less than 50% variation
  }

  private static isScrollableContent(layer: LayerData): boolean {
    const name = layer.name.toLowerCase();
    if (/scroll|list|feed|content/.test(name)) return true;

    // Check if content exceeds typical screen bounds
    const props = layer.properties || {};
    if (props.height && props.height > 800) return true;

    return false;
  }

  private static hasTextChild(layer: LayerData): boolean {
    if (!layer.children) return false;
    return layer.children.some(child => 
      child.type === 'TEXT' || this.hasTextChild(child)
    );
  }

  private static hasImageChild(layer: LayerData): boolean {
    if (!layer.children) return false;
    return layer.children.some(child => 
      this.hasImageFill(child) || this.hasImageChild(child)
    );
  }

  private static hasImageFill(layer: LayerData): boolean {
    const fills = layer.properties?.fills;
    if (!fills || !Array.isArray(fills)) return false;
    return fills.some((fill: Paint) => fill && fill.type === 'IMAGE');
  }

  private static extractTextFromChildren(layer: LayerData): string {
    if (layer.type === 'TEXT') {
      return layer.properties?.characters || layer.name;
    }
    
    if (!layer.children) return '';
    
    return layer.children
      .map(child => this.extractTextFromChildren(child))
      .filter(text => text.length > 0)
      .join(' ');
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
    if (!rgb || typeof rgb.r !== 'number') return '#000000';
    
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  private static extractTextColor(props: NodeProperties): string {
    if (props.fills && Array.isArray(props.fills) && props.fills.length > 0) {
      const fill = props.fills[0] as Paint;
      if (fill && fill.type === 'SOLID' && 'color' in fill) {
        return this.rgbToHex(fill.color);
      }
    }
    return '#000000';
  }

  private static isHeadingText(analysis: TextAnalysis): boolean {
    return analysis.fontSize >= 20 || parseInt(analysis.fontWeight) >= 600;
  }

  private static isButtonText(layer: LayerData, analysis: TextAnalysis): boolean {
    // Check if text is inside a button-like container
    const name = layer.name.toLowerCase();
    return /button|btn|cta/.test(name) || parseInt(analysis.fontWeight) >= 600;
  }

  private static isLabelText(analysis: TextAnalysis): boolean {
    return analysis.fontSize <= 14 && parseInt(analysis.fontWeight) < 600;
  }

  private static determinePositionType(layer: LayerData): 'relative' | 'absolute' {
    // If layer has explicit x,y coordinates, it's likely absolutely positioned
    const props = layer.properties || {};
    return (typeof props.x === 'number' && typeof props.y === 'number') ? 'absolute' : 'relative';
  }

  private static calculateZIndex(layer: LayerData, depth: number): number {
    // Simple z-index calculation based on depth and layer order
    return depth * 10;
  }

  private static determineScaleType(layer: LayerData, baseDevice: DeviceInfo): ResponsiveAnalysis['scaleType'] {
    const props = layer.properties || {};
    
    // If dimensions are close to device dimensions, make it responsive
    if (props.width && Math.abs(props.width - baseDevice.width) < 50) {
      return 'responsive';
    }
    
    // If it's a small element, keep it fixed
    if (props.width && props.width < 100 && props.height && props.height < 100) {
      return 'fixed';
    }
    
    return 'flexible';
  }

  // Additional helper methods for pattern detection
  private static hasPlaceholderText(layer: LayerData): boolean {
    const text = this.extractTextFromChildren(layer).toLowerCase();
    return /placeholder|enter|type|search/.test(text);
  }

  private static extractPlaceholderText(layer: LayerData): string {
    return this.extractTextFromChildren(layer) || 'Enter text';
  }

  private static determineInputType(layer: LayerData): string {
    const name = layer.name.toLowerCase();
    const text = this.extractTextFromChildren(layer).toLowerCase();
    
    if (/password/.test(name + text)) return 'password';
    if (/email/.test(name + text)) return 'email';
    if (/phone|tel/.test(name + text)) return 'phone';
    if (/number/.test(name + text)) return 'numeric';
    
    return 'default';
  }

  private static isClickableCard(layer: LayerData): boolean {
    const name = layer.name.toLowerCase();
    return /clickable|tap|press|card/.test(name);
  }

  private static hasListLikeParent(_layer: LayerData): boolean {
    // This would need parent context, for now return false
    return false;
  }

  private static hasHorizontalLayout(layer: LayerData): boolean {
    if (!layer.children || layer.children.length < 2) return false;
    
    const firstChild = layer.children[0];
    const secondChild = layer.children[1];
    
    if (!firstChild.properties || !secondChild.properties) return false;
    
    const yDiff = Math.abs((firstChild.properties.y || 0) - (secondChild.properties.y || 0));
    const xDiff = Math.abs((firstChild.properties.x || 0) - (secondChild.properties.x || 0));
    
    return xDiff > yDiff; // More horizontal separation than vertical
  }

  private static getItemLayout(layer: LayerData): string {
    return this.hasHorizontalLayout(layer) ? 'horizontal' : 'vertical';
  }

  private static spansFullWidth(layer: LayerData): boolean {
    const width = layer.properties?.width || 0;
    return width > 300; // Assume full width if wider than 300px
  }

  private static hasNavigationElements(layer: LayerData): boolean {
    if (!layer.children) return false;
    
    const navKeywords = /back|menu|search|profile|settings/;
    return layer.children.some(child => navKeywords.test(child.name.toLowerCase()));
  }

  private static calculateAspectRatio(layer: LayerData): number | undefined {
    const props = layer.properties || {};
    if (props.width && props.height) {
      return props.width / props.height;
    }
    return undefined;
  }

  private static isIconSized(layer: LayerData): boolean {
    const props = layer.properties || {};
    const width = props.width || 0;
    const height = props.height || 0;
    
    // Consider it an icon if it's small and roughly square
    return width <= 48 && height <= 48 && Math.abs(width - height) <= 8;
  }

  private static determineTextType(layer: LayerData): string {
    const fontSize = layer.properties?.fontSize || 16;
    
    if (fontSize >= 24) return 'heading';
    if (fontSize >= 18) return 'subheading';
    if (fontSize >= 16) return 'body';
    if (fontSize >= 14) return 'caption';
    
    return 'small';
  }

  private static hasNavigationItems(layer: LayerData): boolean {
    if (!layer.children || layer.children.length < 2) return false;
    
    // Check if children have similar structure (navigation items)
    const firstChild = layer.children[0];
    const similarChildren = layer.children.filter(child => 
      child.type === firstChild.type && 
      Math.abs((child.properties?.width || 0) - (firstChild.properties?.width || 0)) < 20
    );
    
    return similarChildren.length >= 2;
  }

  private static determineNavigationType(layer: LayerData): string {
    const name = layer.name.toLowerCase();
    const props = layer.properties || {};
    
    if (/bottom|tab/.test(name)) return 'bottom-tabs';
    if (/top|header/.test(name)) return 'top-tabs';
    if (props.y !== undefined && props.y < 100) return 'top-navigation';
    
    return 'bottom-navigation';
  }

  private static countNavigationItems(layer: LayerData): number {
    return layer.children?.length || 0;
  }
}