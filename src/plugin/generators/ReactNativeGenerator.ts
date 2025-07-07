// src/plugin/generators/ReactNativeGenerator.ts
import { LayerData } from '../types/FigmaTypes';
import { DeviceInfo } from '../core/DeviceDetector';
import { ThemeTokens } from '../core/ThemeGenerator';
import { LayerAnalyzer, ComponentPattern, LayoutAnalysis, VisualProperties, TextAnalysis } from '../analyzers/LayerAnalyzer';

export interface GenerationOptions {
  useTypeScript: boolean;
  useResponsive: boolean;
  useThemeTokens: boolean;
  componentType: 'screen' | 'component' | 'section';
  includeNavigation: boolean;
  outputFormat: 'single-file' | 'separate-styles';
  styleFramework: 'stylesheet' | 'styled-components';
  includeComments: boolean;
}

export interface GenerationContext {
  baseDevice: DeviceInfo;
  themeTokens: ThemeTokens | null;
  options: GenerationOptions;
  componentName: string;
  usedComponents: Set<string>;
  imports: Set<string>;
  hooks: Set<string>;
}

export interface GeneratedComponent {
  code: string;
  imports: string[];
  dependencies: string[];
  styleSheet?: string;
}

export interface ComponentTemplate {
  jsx: string;
  styles: Record<string, any>;
  imports: string[];
  hooks: string[];
}

export class ReactNativeGenerator {
  
  /**
   * Generate a complete React Native component from a layer
   */
  static generateComponent(layer: LayerData, context: GenerationContext): GeneratedComponent {
    console.log(`🚀 [ReactNativeGenerator] Generating component: ${context.componentName}`);
    
    // Reset context for new generation
    context.usedComponents.clear();
    context.imports.clear();
    context.hooks.clear();

    // Add base imports
    this.addBaseImports(context);

    // Generate JSX and styles
    const jsx = this.generateJSX(layer, context, 1);
    const styles = this.generateStyleSheet(layer, context);
    const imports = this.generateImports(context);
    const hooks = this.generateHooks(context);

    // Combine everything into a complete component
    const code = this.assembleComponent(jsx, styles, imports, hooks, context);

    return {
      code,
      imports: Array.from(context.imports),
      dependencies: this.getDependencies(context),
      styleSheet: context.options.outputFormat === 'separate-styles' ? styles : undefined
    };
  }

  /**
   * Generate JSX structure for a layer
   */
  static generateJSX(layer: LayerData, context: GenerationContext, depth: number = 1): string {
    const pattern = LayerAnalyzer.detectComponentPattern(layer);
    const layout = LayerAnalyzer.analyzeLayout(layer);
    const visual = LayerAnalyzer.extractVisualProperties(layer);
    
    console.log(`🎨 [ReactNativeGenerator] Processing ${layer.name} (${pattern.type}, confidence: ${pattern.confidence.toFixed(2)})`);

    // Generate JSX based on component pattern
    switch (pattern.type) {
      case 'button':
        return this.generateButton(layer, pattern, layout, visual, context, depth);
      
      case 'input':
        return this.generateInput(layer, pattern, layout, visual, context, depth);
      
      case 'card':
        return this.generateCard(layer, pattern, layout, visual, context, depth);
      
      case 'text':
        return this.generateText(layer, pattern, layout, visual, context, depth);
      
      case 'image':
        return this.generateImage(layer, pattern, layout, visual, context, depth);
      
      case 'list-item':
        return this.generateListItem(layer, pattern, layout, visual, context, depth);
      
      case 'header':
        return this.generateHeader(layer, pattern, layout, visual, context, depth);
      
      case 'navigation':
        return this.generateNavigation(layer, pattern, layout, visual, context, depth);
      
      default:
        return this.generateContainer(layer, pattern, layout, visual, context, depth);
    }
  }

  /**
   * Generate button component
   */
  private static generateButton(
    layer: LayerData, 
    pattern: ComponentPattern, 
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
    context: GenerationContext, 
    depth: number
  ): string {
    context.imports.add('TouchableOpacity');
    context.hooks.add('onPress');
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'button');
    const textContent = pattern.properties.textContent || layer.name || 'Button';
    
    let jsx = `${indent}<TouchableOpacity\n`;
    jsx += `${indent}  style={styles.${styleName}}\n`;
    jsx += `${indent}  onPress={() => handle${this.toPascalCase(layer.name)}Press()}\n`;
    jsx += `${indent}  activeOpacity={0.7}\n`;
    jsx += `${indent}>\n`;
    
    // Add text if it has text content
    if (pattern.hasText && textContent) {
      jsx += `${indent}  <Text style={styles.${styleName}Text}>${textContent}</Text>\n`;
    }
    
    // Add children if any
    if (layer.children && layer.children.length > 0) {
      for (const child of layer.children) {
        if (child.type !== 'TEXT') { // Skip text children as we handle them above
          jsx += this.generateJSX(child, context, depth + 1);
        }
      }
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
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
    context: GenerationContext, 
    depth: number
  ): string {
    context.imports.add('TextInput');
    context.hooks.add('useState');
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'input');
    const placeholder = pattern.properties.placeholder || 'Enter text';
    const inputType = pattern.properties.inputType || 'default';
    const stateName = this.toCamelCase(layer.name) + 'Value';
    
    // Add state hook
    context.hooks.add(`const [${stateName}, set${this.toPascalCase(stateName)}] = useState('');`);
    
    let jsx = `${indent}<TextInput\n`;
    jsx += `${indent}  style={styles.${styleName}}\n`;
    jsx += `${indent}  placeholder="${placeholder}"\n`;
    jsx += `${indent}  value={${stateName}}\n`;
    jsx += `${indent}  onChangeText={set${this.toPascalCase(stateName)}}\n`;
    jsx += `${indent}  keyboardType="${this.mapInputType(inputType)}"\n`;
    
    if (inputType === 'password') {
      jsx += `${indent}  secureTextEntry={true}\n`;
    }
    
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
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
    context: GenerationContext, 
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'card');
    
    let jsx = '';
    
    // Add TouchableOpacity if it's interactive
    if (pattern.isInteractive) {
      context.imports.add('TouchableOpacity');
      jsx += `${indent}<TouchableOpacity\n`;
      jsx += `${indent}  style={styles.${styleName}}\n`;
      jsx += `${indent}  onPress={() => handle${this.toPascalCase(layer.name)}Press()}\n`;
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
    
    // Close container
    if (pattern.isInteractive) {
      jsx += `${indent}</TouchableOpacity>\n`;
    } else {
      jsx += `${indent}</View>\n`;
    }
    
    return jsx;
  }

  /**
   * Generate text component
   */
  private static generateText(
    layer: LayerData, 
    pattern: ComponentPattern, 
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
    context: GenerationContext, 
    depth: number
  ): string {
    const textAnalysis = LayerAnalyzer.analyzeText(layer);
    if (!textAnalysis) return '';
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'text');
    const content = textAnalysis.content || layer.name || 'Text';
    
    let jsx = `${indent}<Text style={styles.${styleName}}>\n`;
    jsx += `${indent}  ${this.escapeText(content)}\n`;
    jsx += `${indent}</Text>\n`;
    
    return jsx;
  }

  /**
   * Generate image component
   */
  private static generateImage(
    layer: LayerData, 
    pattern: ComponentPattern, 
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
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
   * Generate container component
   */
  private static generateContainer(
    layer: LayerData, 
    pattern: ComponentPattern, 
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
    context: GenerationContext, 
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'container');
    
    // Choose container type based on layout
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
   * Generate list item component
   */
  private static generateListItem(
    layer: LayerData, 
    pattern: ComponentPattern, 
    layout: LayoutAnalysis, 
    visual: VisualProperties, 
    context: GenerationContext, 
    depth: number
  ): string {
    context.imports.add('TouchableOpacity');
    
    const indent = '  '.repeat(depth);
    const styleName = this.getStyleName(layer, 'listItem');