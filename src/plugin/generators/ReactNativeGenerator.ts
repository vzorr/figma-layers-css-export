// src/plugin/generators/ReactNativeGenerator.ts - Complete Implementation
import { LayerData } from '../types/FigmaTypes';
import { DeviceInfo } from '../core/DeviceDetector';
import { ThemeTokens } from '../core/ThemeGenerator';
import { 
  LayerAnalyzer, 
  ComponentPattern, 
  LayoutAnalysis, 
  VisualProperties, 
  TextAnalysis 
} from '../analyzers/LayerAnalyzer';

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

export class ReactNativeGenerator {
  
  /**
   * Generate a complete React Native component from a layer
   */
  static generateComponent(layer: LayerData, context: GenerationContext): GeneratedComponent {
    console.log(`🚀 [ReactNativeGenerator] Generating: ${context.componentName}`);
    
    // Reset context
    context.usedComponents.clear();
    context.imports.clear();
    context.hooks.clear();
    context.stateVariables = [];

    // Add base imports
    this.addBaseImports(context);

    // Generate JSX and styles
    const jsx = this.generateJSX(layer, context, 1);
    const styles = this.generateStyleSheet(layer, context);
    const imports = this.generateImports(context);
    const hooks = this.generateHooks(context);

    // Assemble complete component
    const code = this.assembleComponent(jsx, styles, imports, hooks, context);

    return {
      code,
      imports: Array.from(context.imports),
      dependencies: this.getDependencies(context)
    };
  }

  /**
   * Generate JSX structure for a layer
   */
  private static generateJSX(layer: LayerData, context: GenerationContext, depth: number = 1): string {
    const pattern = LayerAnalyzer.detectComponentPattern(layer);
    const layout = LayerAnalyzer.analyzeLayout(layer);
    const visual = LayerAnalyzer.extractVisualProperties(layer);
    
    console.log(`🎨 Processing ${layer.name} (${pattern.type}, confidence: ${pattern.confidence.toFixed(2)})`);

    // Generate based on pattern type
    switch (pattern.type) {
      case 'button':
        return this.generateButton(layer, pattern, context, depth);
      case 'input':
        return this.generateInput(layer, pattern, context, depth);
      case 'card':
        return this.generateCard(layer, pattern, context, depth);
      case 'text':
        return this.generateText(layer, pattern, context, depth);
      case 'image':
        return this.generateImage(layer, pattern, context, depth);
      case 'header':
        return this.generateHeader(layer, pattern, context, depth);
      case 'navigation':
        return this.generateNavigation(layer, pattern, context, depth);
      default:
        return this.generateContainer(layer, layout, context, depth);
    }
  }

  /**
   * Generate button component
   */
  private static generateButton(
    layer: LayerData, 
    pattern: ComponentPattern, 
    context: GenerationContext, 
    depth: number
  ): string {
    context.imports.add('TouchableOpacity');
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'button');
    const textContent = this.extractTextFromLayer(layer) || layer.name || 'Button';
    const handlerName = `handle${this.toPascalCase(layer.name)}Press`;
    
    // Add press handler to hooks
    context.hooks.add(`  const ${handlerName} = () => {\n    console.log('${layer.name} pressed');\n  };`);
    
    let jsx = `${indent}<TouchableOpacity\n`;
    jsx += `${indent}  style={styles.${styleName}}\n`;
    jsx += `${indent}  onPress={${handlerName}}\n`;
    jsx += `${indent}  activeOpacity={0.7}\n`;
    jsx += `${indent}>\n`;
    
    if (textContent) {
      jsx += `${indent}  <Text style={styles.${styleName}Text}>${textContent}</Text>\n`;
    }
    
    jsx += `${indent}</TouchableOpacity>\n`;
    
    return jsx;
  }

  /**
   * Generate input component
   */
  private static generateInput(
    layer: LayerData, 
    pattern: ComponentPattern, 
    context: GenerationContext, 
    depth: number
  ): string {
    context.imports.add('TextInput');
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'input');
    const stateName = this.toCamelCase(layer.name) + 'Value';
    const placeholder = this.extractTextFromLayer(layer) || 'Enter text';
    
    // Add state hook
    context.stateVariables.push(`const [${stateName}, set${this.toPascalCase(stateName)}] = useState('');`);
    
    let jsx = `${indent}<TextInput\n`;
    jsx += `${indent}  style={styles.${styleName}}\n`;
    jsx += `${indent}  placeholder="${placeholder}"\n`;
    jsx += `${indent}  value={${stateName}}\n`;
    jsx += `${indent}  onChangeText={set${this.toPascalCase(stateName)}}\n`;
    jsx += `${indent}  placeholderTextColor={${this.getPlaceholderColor(context)}}\n`;
    jsx += `${indent}/>\n`;
    
    return jsx;
  }

  /**
   * Generate card component
   */
  private static generateCard(
    layer: LayerData, 
    pattern: ComponentPattern, 
    context: GenerationContext, 
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'card');
    
    let jsx = '';
    
    if (pattern.isInteractive) {
      context.imports.add('TouchableOpacity');
      const handlerName = `handle${this.toPascalCase(layer.name)}Press`;
      context.hooks.add(`  const ${handlerName} = () => {\n    console.log('${layer.name} pressed');\n  };`);
      
      jsx += `${indent}<TouchableOpacity\n`;
      jsx += `${indent}  style={styles.${styleName}}\n`;
      jsx += `${indent}  onPress={${handlerName}}\n`;
      jsx += `${indent}  activeOpacity={0.9}\n`;
      jsx += `${indent}>\n`;
      depth++;
    } else {
      jsx += `${indent}<View style={styles.${styleName}}>\n`;
    }
    
    // Add children
    if (layer.children && layer.children.length > 0) {
      for (const child of layer.children) {
        jsx += this.generateJSX(child, context, depth + 1);
      }
    }
    
    jsx += `${indent}</${pattern.isInteractive ? 'TouchableOpacity' : 'View'}>\n`;
    
    return jsx;
  }

  /**
   * Generate text component
   */
  private static generateText(
    layer: LayerData, 
    pattern: ComponentPattern, 
    context: GenerationContext, 
    depth: number
  ): string {
    const textAnalysis = LayerAnalyzer.analyzeText(layer);
    if (!textAnalysis) return '';
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'text');
    const content = this.escapeText(textAnalysis.content || layer.name || 'Text');
    
    return `${indent}<Text style={styles.${styleName}}>${content}</Text>\n`;
  }

  /**
   * Generate image component
   */
  private static generateImage(
    layer: LayerData, 
    pattern: ComponentPattern, 
    context: GenerationContext, 
    depth: number
  ): string {
    context.imports.add('Image');
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'image');
    const width = layer.properties?.width || 100;
    const height = layer.properties?.height || 100;
    
    let jsx = `${indent}<Image\n`;
    jsx += `${indent}  source={{ uri: 'https://via.placeholder.com/${Math.round(width)}x${Math.round(height)}' }}\n`;
    jsx += `${indent}  style={styles.${styleName}}\n`;
    jsx += `${indent}  resizeMode="cover"\n`;
    jsx += `${indent}/>\n`;
    
    return jsx;
  }

  /**
   * Generate header component
   */
  private static generateHeader(
    layer: LayerData, 
    pattern: ComponentPattern, 
    context: GenerationContext, 
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'header');
    
    let jsx = `${indent}<View style={styles.${styleName}}>\n`;
    
    // Add children or default header content
    if (layer.children && layer.children.length > 0) {
      for (const child of layer.children) {
        jsx += this.generateJSX(child, context, depth + 1);
      }
    } else {
      jsx += `${indent}  <Text style={styles.headerText}>${layer.name}</Text>\n`;
    }
    
    jsx += `${indent}</View>\n`;
    
    return jsx;
  }

  /**
   * Generate navigation component
   */
  private static generateNavigation(
    layer: LayerData, 
    pattern: ComponentPattern, 
    context: GenerationContext, 
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'navigation');
    
    let jsx = `${indent}<View style={styles.${styleName}}>\n`;
    
    if (layer.children && layer.children.length > 0) {
      for (const child of layer.children) {
        jsx += this.generateJSX(child, context, depth + 1);
      }
    }
    
    jsx += `${indent}</View>\n`;
    
    return jsx;
  }

  /**
   * Generate container component
   */
  private static generateContainer(
    layer: LayerData, 
    layout: LayoutAnalysis, 
    context: GenerationContext, 
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'container');
    
    // Choose container type
    let containerType = 'View';
    if (layout.isScrollable) {
      containerType = 'ScrollView';
      context.imports.add('ScrollView');
    }
    
    let jsx = `${indent}<${containerType} style={styles.${styleName}}>\n`;
    
    // Add children
    if (layer.children && layer.children.length > 0) {
      for (const child of layer.children) {
        jsx += this.generateJSX(child, context, depth + 1);
      }
    }
    
    jsx += `${indent}</${containerType}>\n`;
    
    return jsx;
  }

  /**
   * Generate complete StyleSheet
   */
  private static generateStyleSheet(layer: LayerData, context: GenerationContext): string {
    const styles: Record<string, any> = {};
    
    // Collect all styles
    this.collectStyles(layer, context, styles);
    
    // Convert to StyleSheet string
    return `\nconst styles = StyleSheet.create(${JSON.stringify(styles, null, 2).replace(/"/g, '')});`;
  }

  /**
   * Recursively collect styles from layers
   */
  private static collectStyles(
    layer: LayerData, 
    context: GenerationContext, 
    styles: Record<string, any>
  ): void {
    const pattern = LayerAnalyzer.detectComponentPattern(layer);
    const layout = LayerAnalyzer.analyzeLayout(layer);
    const visual = LayerAnalyzer.extractVisualProperties(layer);
    const styleName = this.getStyleName(layer, pattern.type);
    
    // Generate style based on pattern
    styles[styleName] = this.generateStyleForPattern(layer, pattern, layout, visual, context);
    
    // Add text styles for buttons
    if (pattern.type === 'button' && pattern.hasText) {
      styles[`${styleName}Text`] = this.generateButtonTextStyle(layer, context);
    }
    
    // Process children
    if (layer.children) {
      for (const child of layer.children) {
        this.collectStyles(child, context, styles);
      }
    }
  }

  /**
   * Generate style object for a specific pattern
   */
  private static generateStyleForPattern(
    layer: LayerData, 
    pattern: ComponentPattern, 
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
    context: GenerationContext
  ): any {
    const style: any = {};
    const props = layer.properties || {};
    const { useResponsive, useThemeTokens } = context.options;
    
    // Basic dimensions
    if (props.width) {
      style.width = useResponsive ? `scale(${props.width})` : props.width;
    }
    if (props.height) {
      style.height = useResponsive ? `verticalScale(${props.height})` : props.height;
    }
    
    // Layout properties
    if (layout.layoutType === 'flex') {
      style.flexDirection = layout.flexDirection || 'column';
      if (layout.justifyContent) style.justifyContent = layout.justifyContent;
      if (layout.alignItems) style.alignItems = layout.alignItems;
      if (layout.gap) style.gap = useResponsive ? `scale(${layout.gap})` : layout.gap;
    }
    
    // Visual properties
    if (visual.backgroundColor) {
      style.backgroundColor = useThemeTokens 
        ? this.mapColorToTheme(visual.backgroundColor, context)
        : visual.backgroundColor;
    }
    
    if (visual.borderRadius) {
      style.borderRadius = useResponsive 
        ? `moderateScale(${visual.borderRadius})` 
        : visual.borderRadius;
    }
    
    // Pattern-specific styles
    switch (pattern.type) {
      case 'button':
        this.applyButtonStyles(style, context);
        break;
      case 'input':
        this.applyInputStyles(style, context);
        break;
      case 'card':
        this.applyCardStyles(style, visual, context);
        break;
      case 'text':
        this.applyTextStyles(style, layer, context);
        break;
      case 'container':
        this.applyContainerStyles(style, layout, context);
        break;
    }
    
    return style;
  }

  // Style application methods
  private static applyButtonStyles(style: any, context: GenerationContext): void {
    const { useResponsive, useThemeTokens } = context.options;
    
    style.backgroundColor = useThemeTokens ? 'COLORS.primary || "#007AFF"' : '#007AFF';
    style.paddingVertical = useResponsive ? 'verticalScale(12)' : 12;
    style.paddingHorizontal = useResponsive ? 'scale(24)' : 24;
    style.borderRadius = useResponsive ? 'moderateScale(8)' : 8;
    style.alignItems = 'center';
    style.justifyContent = 'center';
  }

  private static applyInputStyles(style: any, context: GenerationContext): void {
    const { useResponsive, useThemeTokens } = context.options;
    
    style.borderWidth = 1;
    style.borderColor = useThemeTokens ? 'COLORS.border || "#E0E0E0"' : '#E0E0E0';
    style.borderRadius = useResponsive ? 'moderateScale(8)' : 8;
    style.paddingHorizontal = useResponsive ? 'scale(16)' : 16;
    style.paddingVertical = useResponsive ? 'verticalScale(12)' : 12;
    style.fontSize = useResponsive ? 'moderateScale(16)' : 16;
  }

  private static applyCardStyles(style: any, visual: VisualProperties, context: GenerationContext): void {
    const { useResponsive, useThemeTokens } = context.options;
    
    style.backgroundColor = useThemeTokens ? 'COLORS.cardBackground || "#FFFFFF"' : '#FFFFFF';
    style.borderRadius = useResponsive ? 'moderateScale(12)' : 12;
    style.padding = useResponsive ? 'scale(16)' : 16;
    
    if (visual.shadowProperties) {
      style.shadowColor = visual.shadowProperties.shadowColor;
      style.shadowOffset = visual.shadowProperties.shadowOffset;
      style.shadowOpacity = visual.shadowProperties.shadowOpacity;
      style.shadowRadius = visual.shadowProperties.shadowRadius;
      style.elevation = visual.shadowProperties.elevation || 4;
    }
  }

  private static applyTextStyles(style: any, layer: LayerData, context: GenerationContext): void {
    const textAnalysis = LayerAnalyzer.analyzeText(layer);
    const { useResponsive, useThemeTokens } = context.options;
    
    if (textAnalysis) {
      style.fontSize = useResponsive 
        ? `moderateScale(${textAnalysis.fontSize})` 
        : textAnalysis.fontSize;
      style.fontWeight = textAnalysis.fontWeight;
      style.color = useThemeTokens 
        ? this.mapColorToTheme(textAnalysis.color, context)
        : textAnalysis.color;
      
      if (textAnalysis.textAlign) style.textAlign = textAnalysis.textAlign;
      if (textAnalysis.lineHeight) style.lineHeight = textAnalysis.lineHeight;
    }
  }

  private static applyContainerStyles(style: any, layout: LayoutAnalysis, context: GenerationContext): void {
    const { useResponsive } = context.options;
    
    if (layout.layoutType === 'flex') {
      style.flexDirection = layout.flexDirection || 'column';
      if (layout.padding) {
        style.paddingTop = useResponsive ? `verticalScale(${layout.padding.top})` : layout.padding.top;
        style.paddingRight = useResponsive ? `scale(${layout.padding.right})` : layout.padding.right;
        style.paddingBottom = useResponsive ? `verticalScale(${layout.padding.bottom})` : layout.padding.bottom;
        style.paddingLeft = useResponsive ? `scale(${layout.padding.left})` : layout.padding.left;
      }
    }
  }

  // Utility methods
  private static generateButtonTextStyle(layer: LayerData, context: GenerationContext): any {
    const { useResponsive, useThemeTokens } = context.options;
    
    return {
      color: useThemeTokens ? 'COLORS.buttonText || "#FFFFFF"' : '#FFFFFF',
      fontSize: useResponsive ? 'moderateScale(16)' : 16,
      fontWeight: '600'
    };
  }

  private static addBaseImports(context: GenerationContext): void {
    context.imports.add('View');
    context.imports.add('Text');
    context.imports.add('StyleSheet');
    
    if (context.options.useResponsive) {
      context.imports.add('Dimensions');
    }
    
    if (context.stateVariables.length > 0) {
      context.imports.add('useState');
    }
  }

  private static generateImports(context: GenerationContext): string {
    let imports = "import React";
    
    if (context.stateVariables.length > 0) {
      imports += ", { useState }";
    }
    
    imports += " from 'react';\n";
    imports += `import {\n  ${Array.from(context.imports).join(',\n  ')}\n} from 'react-native';\n`;
    
    if (context.options.useThemeTokens && context.themeTokens) {
      imports += "\nimport { COLORS, FONTS, normalize, scale, verticalScale, moderateScale } from './theme';\n";
    }
    
    return imports;
  }

  private static generateHooks(context: GenerationContext): string {
    let hooks = '';
    
    // Add state variables
    if (context.stateVariables.length > 0) {
      hooks += '\n  // State variables\n';
      hooks += '  ' + context.stateVariables.join('\n  ') + '\n';
    }
    
    // Add event handlers
    if (context.hooks.size > 0) {
      hooks += '\n  // Event handlers\n';
      hooks += Array.from(context.hooks).join('\n\n') + '\n';
    }
    
    return hooks;
  }

  private static assembleComponent(
    jsx: string, 
    styles: string, 
    imports: string, 
    hooks: string, 
    context: GenerationContext
  ): string {
    const { componentName, options } = context;
    const typeAnnotation = options.useTypeScript ? ': React.FC' : '';
    
    let code = imports;
    
    // Add responsive utilities if needed
    if (options.useResponsive) {
      code += this.generateResponsiveUtils(context.baseDevice);
    }
    
    // Component declaration
    code += `\nconst ${componentName}${typeAnnotation} = () => {`;
    code += hooks;
    code += '\n  return (\n';
    
    // Main container
    if (context.options.componentType === 'screen') {
      code += '    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>\n';
      code += jsx;
      code += '    </ScrollView>\n';
    } else {
      code += jsx;
    }
    
    code += '  );\n';
    code += '};\n';
    
    // Styles
    code += styles;
    
    // Export
    code += `\n\nexport default ${componentName};`;
    
    return code;
  }

  private static generateResponsiveUtils(baseDevice: DeviceInfo): string {
    return `\nconst { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');\n\nconst scale = (size: number) => (SCREEN_WIDTH / ${baseDevice.width}) * size;\nconst verticalScale = (size: number) => (SCREEN_HEIGHT / ${baseDevice.height}) * size;\nconst moderateScale = (size: number, factor: number = 0.5) => \n  size + (scale(size) - size) * factor;\n`;
  }

  // Helper methods
  private static getStyleName(layer: LayerData, patternType: string): string {
    const baseName = layer.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return baseName || patternType;
  }

  private static extractTextFromLayer(layer: LayerData): string | null {
    if (layer.type === 'TEXT') {
      return layer.properties?.characters || layer.name;
    }
    
    if (layer.children) {
      for (const child of layer.children) {
        const text = this.extractTextFromLayer(child);
        if (text) return text;
      }
    }
    
    return null;
  }

  private static escapeText(text: string): string {
    return text.replace(/[<>&"']/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return escapeMap[match];
    });
  }

  private static toPascalCase(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, ' ')
      .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .replace(/\s/g, '');
  }

  private static toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private static getPlaceholderColor(context: GenerationContext): string {
    return context.options.useThemeTokens 
      ? 'COLORS.placeholder || "#999999"' 
      : '"#999999"';
  }

  private static mapColorToTheme(color: string, context: GenerationContext): string {
    if (!context.themeTokens) return color;
    
    // Find closest color in theme
    const closestColor = context.themeTokens.colors.find(c => c.value === color);
    return closestColor ? `COLORS.${closestColor.name}` : color;
  }

  private static getDependencies(context: GenerationContext): string[] {
    const deps: string[] = [];
    
    if (context.options.useResponsive) {
      deps.push('react-native-responsive-screen');
    }
    
    return deps;
  }
}