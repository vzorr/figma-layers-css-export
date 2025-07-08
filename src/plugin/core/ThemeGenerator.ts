// src/plugin/core/ThemeGenerator.ts - Fixed TypeScript Issues
import { DeviceInfo, ColorToken, TypographyToken, SpacingToken, ThemeTokens } from '../../shared/types';

export class ThemeGenerator {
  private static colorFrequency = new Map<string, number>();
  private static fontFrequency = new Map<string, { family: string; size: number; weight: string; count: number }>();
  private static spacingFrequency = new Map<number, number>();

  /**
   * Analyze entire design system from all pages
   */
  static analyzeDesignSystem(): ThemeTokens {
    console.log("🎨 Analyzing design system...");
    
    // Reset frequency counters
    this.colorFrequency.clear();
    this.fontFrequency.clear();
    this.spacingFrequency.clear();

    // Analyze all pages
    for (const page of figma.root.children) {
      if (page.type === 'PAGE') {
        this.analyzePage(page);
      }
    }

    // Extract tokens from frequency data
    const tokens: ThemeTokens = {
      colors: this.extractColorTokens(),
      typography: this.extractTypographyTokens(),
      spacing: this.extractSpacingTokens(),
      shadows: this.extractShadowTokens(),
      borderRadius: this.extractBorderRadiusTokens()
    };

    console.log("✅ Design system analysis complete", tokens);
    return tokens;
  }

  /**
   * Generate theme file compatible with your existing theme structure
   */
  static generateThemeFile(tokens: ThemeTokens, baseDevice: DeviceInfo): string {
    const colorsObject = this.generateColorsObject(tokens.colors);
    const typographyObject = this.generateTypographyObject(tokens.typography);
    const responsiveUtils = this.generateResponsiveUtils(baseDevice);

    return `// Auto-generated theme file from Figma design system
import { Dimensions, Platform, PixelRatio } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const { width, height } = Dimensions.get('window');

${responsiveUtils}

// ============================================================================
// COLORS (Extracted from Design)
// ============================================================================
${colorsObject}

// ============================================================================
// TYPOGRAPHY (Extracted from Design)
// ============================================================================
${typographyObject}

// ============================================================================
// SPACING SYSTEM (Extracted from Design)
// ============================================================================
export const SPACING = {
${tokens.spacing.map(token => `  ${token.name}: normalize(${token.value}),`).join('\n')}
};

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================
export const SIZES = {
  width,
  height,
  wp,
  hp,
  normalize,
  getBreakpointFontSize,
  getDeviceType,
  deviceType: getDeviceType(),
  isTablet: getDeviceType() === 'tablet',
  isLargePhone: getDeviceType() === 'large_phone',
  baseWidth: BASE_WIDTH,
  baseHeight: BASE_HEIGHT,
};

// Enhanced text styles with device-aware sizing
export const createTextStyle = (
  size: number, 
  weight: '400' | '500' | '600' | '700' | 'bold' = '400',
  options: {
    color?: string,
    letterSpacing?: number,
    lineHeight?: number,
    tabletSizeMultiplier?: number
  } = {}
) => {
  const deviceType = getDeviceType();
  let finalSize = normalize(size);
  
  if (deviceType === 'tablet' && options.tabletSizeMultiplier) {
    finalSize = size * options.tabletSizeMultiplier;
  }
  
  return {
    fontSize: finalSize,
    fontFamily: weight === '600' ? FONTS.interSemiBold : 
               weight === '500' ? FONTS.interMedium :
               weight === '700' || weight === 'bold' ? FONTS.interBold : 
               FONTS.interRegular,
    color: options.color || COLORS.Navy,
    letterSpacing: options.letterSpacing ?? (size >= 16 ? -0.32 : 0),
    lineHeight: options.lineHeight,
  };
};

// Device-aware text styles
export const TEXT_STYLES = {
${tokens.typography.map(token => this.generateTextStyle(token)).join(',\n')}
};

// Responsive spacing utility
export const getResponsiveSpacing = (baseSpacing: number): number => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'tablet':
      return Math.round(baseSpacing * 1.5);
    case 'large_phone':
      return Math.round(baseSpacing * 1.2);
    case 'small_phone':
      return Math.round(baseSpacing * 0.9);
    default:
      return baseSpacing;
  }
};
`;
  }

  /**
   * Analyze a single page for design tokens
   */
  private static analyzePage(page: PageNode) {
    for (const child of page.children) {
      this.analyzeNode(child);
    }
  }

  /**
   * Recursively analyze nodes for design tokens
   */
  private static analyzeNode(node: SceneNode) {
    // Extract colors
    this.extractColorsFromNode(node);
    
    // Extract typography
    if (node.type === 'TEXT') {
      this.extractTypographyFromNode(node);
    }
    
    // Extract spacing
    this.extractSpacingFromNode(node);

    // Recurse into children
    if ('children' in node && node.children) {
      for (const child of node.children) {
        this.analyzeNode(child);
      }
    }
  }

  /**
   * Extract colors from a node
   */
  private static extractColorsFromNode(node: SceneNode) {
    try {
      // Fill colors
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && 'color' in fill) {
            const color = this.rgbToHex(fill.color);
            this.colorFrequency.set(color, (this.colorFrequency.get(color) || 0) + 1);
          }
        }
      }

      // Stroke colors
      if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        for (const stroke of node.strokes) {
          if (stroke.type === 'SOLID' && 'color' in stroke) {
            const color = this.rgbToHex(stroke.color);
            this.colorFrequency.set(color, (this.colorFrequency.get(color) || 0) + 1);
          }
        }
      }
    } catch (error) {
      console.warn("Error extracting colors from node:", error);
    }
  }

  /**
   * Extract typography from text nodes
   */
  private static extractTypographyFromNode(node: TextNode) {
    try {
      const fontSize = (typeof node.fontSize === 'number' ? node.fontSize : undefined) || 16;
      const fontFamily = (node.fontName && typeof node.fontName === 'object' && 'family' in node.fontName) ? node.fontName.family : 'Inter';
      const fontWeight = (node.fontName && typeof node.fontName === 'object' && 'style' in node.fontName) ? node.fontName.style : 'Regular';
      
      const key = `${fontFamily}-${fontSize}-${fontWeight}`;
      const existing = this.fontFrequency.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        this.fontFrequency.set(key, {
          family: fontFamily,
          size: fontSize,
          weight: this.mapFontWeight(fontWeight),
          count: 1
        });
      }
    } catch (error) {
      console.warn("Error extracting typography from node:", error);
    }
  }

  /**
   * Extract spacing patterns from layout
   */
  private static extractSpacingFromNode(node: SceneNode) {
    try {
      // Auto-layout spacing
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        if ('itemSpacing' in node && typeof node.itemSpacing === 'number') {
          this.spacingFrequency.set(node.itemSpacing, (this.spacingFrequency.get(node.itemSpacing) || 0) + 1);
        }
        
        if ('paddingLeft' in node && typeof node.paddingLeft === 'number') {
          this.spacingFrequency.set(node.paddingLeft, (this.spacingFrequency.get(node.paddingLeft) || 0) + 1);
        }
      }

      // Border radius
      if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
        this.spacingFrequency.set(node.cornerRadius, (this.spacingFrequency.get(node.cornerRadius) || 0) + 1);
      }
    } catch (error) {
      console.warn("Error extracting spacing from node:", error);
    }
  }

  /**
   * Convert RGB to hex
   */
  private static rgbToHex(rgb: RGB): string {
    const r = Math.round(rgb.r * 255);
    const g = Math.round(rgb.g * 255);
    const b = Math.round(rgb.b * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  /**
   * Map Figma font weights to CSS font weights
   */
  private static mapFontWeight(figmaWeight: string): string {
    const weightMap: { [key: string]: string } = {
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
    
    return weightMap[figmaWeight] || '400';
  }

  /**
   * Extract color tokens from frequency data
   */
  private static extractColorTokens(): ColorToken[] {
    const tokens: ColorToken[] = [];
    const sortedColors = Array.from(this.colorFrequency.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .slice(0, 20); // Take top 20 colors

    for (let i = 0; i < sortedColors.length; i++) {
      const [color] = sortedColors[i];
      tokens.push({
        name: this.generateColorName(color, i),
        value: color,
        usage: this.determineColorUsage(color, i)
      });
    }

    return tokens;
  }

  /**
   * Extract typography tokens from frequency data
   */
  private static extractTypographyTokens(): TypographyToken[] {
    const tokens: TypographyToken[] = [];
    const sortedFonts = Array.from(this.fontFrequency.values())
      .sort((a, b) => b.count - a.count) // Sort by frequency
      .slice(0, 10); // Take top 10 typography styles

    for (let i = 0; i < sortedFonts.length; i++) {
      const font = sortedFonts[i];
      tokens.push({
        name: this.generateTypographyName(font, i),
        fontFamily: font.family,
        fontSize: font.size,
        fontWeight: font.weight,
        usage: this.determineTypographyUsage(font.size, font.weight)
      });
    }

    return tokens;
  }

  /**
   * Extract spacing tokens from frequency data
   */
  private static extractSpacingTokens(): SpacingToken[] {
    const tokens: SpacingToken[] = [];
    const sortedSpacing = Array.from(this.spacingFrequency.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by frequency
      .filter(([value]) => value > 0 && value <= 200) // Reasonable spacing values
      .slice(0, 15); // Take top 15 spacing values

    for (let i = 0; i < sortedSpacing.length; i++) {
      const [value] = sortedSpacing[i];
      tokens.push({
        name: this.generateSpacingName(value),
        value,
        usage: this.determineSpacingUsage(value)
      });
    }

    return tokens;
  }

  /**
   * Generate semantic color names
   */
  private static generateColorName(color: string, index: number): string {
    // Simple color naming based on hue
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    if (r === g && g === b) {
      return `gray${Math.round((r / 255) * 900)}`;
    }

    if (index === 0) return 'primary';
    if (index === 1) return 'secondary';
    if (index === 2) return 'accent';

    return `color${index + 1}`;
  }

  /**
   * Determine color usage category
   */
  private static determineColorUsage(color: string, index: number): ColorToken['usage'] {
    if (index === 0) return 'primary';
    if (index === 1) return 'secondary';
    if (index === 2) return 'accent';
    if (color === '#FFFFFF' || color === '#000000') return 'neutral';
    return 'semantic';
  }

  /**
   * Generate other required methods for typography, spacing, etc.
   */
  private static generateTypographyName(font: { family: string; size: number; weight: string; count: number }, index: number): string {
    if (font.size >= 24) return `heading${index + 1}`;
    if (font.size >= 16) return `body${index + 1}`;
    return `caption${index + 1}`;
  }

  private static determineTypographyUsage(size: number, weight: string): TypographyToken['usage'] {
    if (size >= 24 || weight === '700') return 'heading';
    if (size >= 16) return 'body';
    if (size <= 12) return 'caption';
    return 'body';
  }

  private static generateSpacingName(value: number): string {
    // Round to nearest 4px and create semantic names
    const rounded = Math.round(value / 4) * 4;
    const scale = rounded / 4;
    return `spacing${scale}x`; // spacing1x, spacing2x, etc.
  }

  private static determineSpacingUsage(value: number): SpacingToken['usage'] {
    if (value <= 4) return 'gap';
    if (value <= 16) return 'padding';
    if (value <= 32) return 'margin';
    return 'radius';
  }

  private static generateColorsObject(colors: ColorToken[]): string {
    return `export const COLORS = {
${colors.map(color => `  ${color.name}: "${color.value}",`).join('\n')}
  // Legacy colors for backward compatibility
  Yellow: "#FFC800",
  Navy400: "#001326",
  Navy300: "#001A32",
  Navy200: "#335372",
  Navy100: "#99B9D8",
  Navy: "#00203F",
  ErrorRed: "#FD4C4F",
  Black: "#272727",
  ConfirmGreen: "#04AA0A",
  Background: "#FFFFFF",
  white: "#FFF",
  grey: "#BEBEBE",
};`;
  }

  private static generateTypographyObject(typography: TypographyToken[]): string {
    return `export const FONTS = {
  interRegular: "Inter-Regular",
  interMedium: "Inter-Medium",
  interSemiBold: "Inter-SemiBold",
  interBold: "Inter-Bold",
  interLight: "Inter-Light",
  interBlack: "Inter-Black",
};

export const fontSize = {
${typography.map(typo => `  ${typo.name}: normalize(${typo.fontSize}),`).join('\n')}
  // Legacy font sizes
  ${Array.from({length: 36}, (_, i) => `${i + 5}: normalize(${i + 5}),`).join('\n  ')}
};`;
  }

  private static generateTextStyle(token: TypographyToken): string {
    return `  ${token.name}: createTextStyle(${token.fontSize}, '${token.fontWeight}')`;
  }

  private static generateResponsiveUtils(baseDevice: DeviceInfo): string {
    return `// Base dimensions (${baseDevice.name} - design reference)
const BASE_WIDTH = ${baseDevice.width};
const BASE_HEIGHT = ${baseDevice.height};

// Device categorization and responsive font system
const getDeviceType = () => {
  const aspectRatio = height / width;
  const minDimension = Math.min(width, height);
  
  if (minDimension >= 768) {
    return 'tablet';
  } else if (minDimension >= 600) {
    return 'large_phone';
  } else if (minDimension >= 350) {
    return 'normal_phone';
  } else {
    return 'small_phone';
  }
};

const getResponsiveFontSize = (baseFontSize: number): number => {
  const deviceType = getDeviceType();
  let scale = width / BASE_WIDTH;
  
  switch (deviceType) {
    case 'tablet':
      scale = Math.min(scale, 1.4);
      scale = Math.max(scale, 1.2);
      break;
    case 'large_phone':
      scale = Math.min(scale, 1.25);
      scale = Math.max(scale, 1.05);
      break;
    case 'normal_phone':
      scale = Math.min(scale, 1.3);
      scale = Math.max(scale, 0.9);
      break;
    case 'small_phone':
      scale = Math.min(scale, 1.1);
      scale = Math.max(scale, 0.85);
      break;
  }
  
  let fontSize = baseFontSize * scale;
  
  if (Platform.OS === 'android') {
    fontSize = fontSize * 0.95;
  }
  
  fontSize = Math.max(fontSize, 10);
  return Math.round(PixelRatio.roundToNearestPixel(fontSize));
};

const getBreakpointFontSize = (baseFontSize: number): number => {
  const minDimension = Math.min(width, height);
  
  if (minDimension >= 768) {
    return Math.round(baseFontSize * 1.3);
  } else if (minDimension >= 414) {
    return Math.round(baseFontSize * 1.15);
  } else if (minDimension >= 375) {
    return baseFontSize;
  } else if (minDimension >= 350) {
    return Math.round(baseFontSize * 0.95);
  } else {
    return Math.round(baseFontSize * 0.9);
  }
};

const normalize = getResponsiveFontSize;`;
  }

  private static extractShadowTokens(): unknown[] {
    // Placeholder for shadow extraction
    return [];
  }

  private static extractBorderRadiusTokens(): unknown[] {
    // Placeholder for border radius extraction
    return [];
  }
}