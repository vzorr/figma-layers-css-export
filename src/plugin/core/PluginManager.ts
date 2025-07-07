// src/plugin/core/PluginManager.ts - Fixed and Enhanced
import { DeviceDetector, DeviceInfo } from './DeviceDetector';
import { ThemeGenerator, ThemeTokens } from './ThemeGenerator';
import { ReactNativeGenerator } from '../generators/ReactNativeGenerator';
import { LayerAnalyzer } from '../analyzers/LayerAnalyzer';
import { LayerData } from '../types/FigmaTypes';

interface GenerationOptions {
  useTypeScript: boolean;
  useResponsive: boolean;
  useThemeTokens: boolean;
  componentType: 'screen' | 'component' | 'section';
  includeNavigation: boolean;
  outputFormat: 'single-file' | 'separate-styles';
}

interface PluginState {
  devices: DeviceInfo[];
  baseDevice: DeviceInfo | null;
  themeTokens: ThemeTokens | null;
  isAnalyzed: boolean;
  currentLayers: LayerData[];
}

export class PluginManager {
  private state: PluginState = {
    devices: [],
    baseDevice: null,
    themeTokens: null,
    isAnalyzed: false,
    currentLayers: []
  };

  constructor() {
    this.initializePlugin();
    this.setupMessageHandler();
  }

  /**
   * Initialize the plugin
   */
  private async initializePlugin() {
    console.log('🚀 [PluginManager] Enhanced Plugin starting...');
    
    figma.showUI(__html__, { 
      width: 480, 
      height: 700,
      themeColors: true 
    });

    // Perform initial analysis
    await this.analyzeDesignSystem();
    
    console.log('✅ [PluginManager] Plugin initialized successfully');
  }

  /**
   * Setup message handler for UI communication
   */
  private setupMessageHandler() {
    figma.ui.onmessage = async (msg: any) => {
      console.log(`📨 [PluginManager] Received message: ${msg.type}`);
      
      try {
        await this.handleMessage(msg);
      } catch (error) {
        console.error(`❌ [PluginManager] Error handling message:`, error);
        this.sendError(`Error: ${(error as Error).message}`);
      }
    };
  }

  /**
   * Handle incoming messages from UI
   */
  private async handleMessage(msg: any) {
    switch (msg.type) {
      case 'ui-ready':
        await this.handleUIReady();
        break;

      case 'get-layers':
        await this.handleGetLayers();
        break;

      case 'get-theme-file':
        await this.handleGetThemeFile();
        break;

      case 'generate-react-native':
        await this.handleGenerateReactNative(msg.layerId, msg.options);
        break;

      case 'reanalyze-design-system':
        await this.handleReanalyzeDesignSystem();
        break;

      case 'select-layer':
        await this.handleSelectLayer(msg.layerId);
        break;

      case 'close':
        figma.closePlugin();
        break;

      default:
        console.warn(`⚠️ [PluginManager] Unknown message type: ${msg.type}`);
    }
  }

  /**
   * Analyze the entire design system
   */
  private async analyzeDesignSystem() {
    try {
      console.log('🔍 [PluginManager] Analyzing design system...');
      
      // 1. Detect all devices in the document
      this.state.devices = DeviceDetector.scanDocument();
      console.log(`📱 [PluginManager] Found ${this.state.devices.length} device types`);
      
      // 2. Select base device for responsive calculations
      this.state.baseDevice = DeviceDetector.selectBaseDevice(this.state.devices);
      console.log(`📐 [PluginManager] Base device: ${this.state.baseDevice.name}`);
      
      // 3. Extract design tokens
      this.state.themeTokens = ThemeGenerator.analyzeDesignSystem();
      console.log(`🎨 [PluginManager] Extracted tokens:`, {
        colors: this.state.themeTokens.colors.length,
        typography: this.state.themeTokens.typography.length,
        spacing: this.state.themeTokens.spacing.length
      });
      
      // 4. Get current page layers
      this.state.currentLayers = this.getCurrentPageLayers();
      console.log(`📋 [PluginManager] Found ${this.state.currentLayers.length} screen layers`);
      
      this.state.isAnalyzed = true;
      
    } catch (error) {
      console.error('❌ [PluginManager] Error analyzing design system:', error);
      this.sendError('Failed to analyze design system: ' + (error as Error).message);
    }
  }

  /**
   * Handle UI ready message
   */
  private async handleUIReady() {
    this.sendMessage({
      type: 'design-system-analyzed',
      data: {
        devices: this.state.devices,
        baseDevice: this.state.baseDevice,
        themeTokens: this.state.themeTokens,
        layers: this.state.currentLayers
      }
    });
  }

  /**
   * Handle get layers request
   */
  private async handleGetLayers() {
    const layers = this.getCurrentPageLayers();
    this.sendMessage({
      type: 'layers-data',
      data: layers
    });
  }

  /**
   * Handle theme file generation
   */
  private async handleGetThemeFile() {
    if (!this.state.themeTokens || !this.state.baseDevice) {
      throw new Error('Design system not analyzed yet');
    }

    const themeFile = ThemeGenerator.generateThemeFile(
      this.state.themeTokens, 
      this.state.baseDevice
    );
    
    this.sendMessage({
      type: 'theme-file-generated',
      data: themeFile
    });
  }

  /**
   * Handle React Native generation with enhanced analysis
   */
  private async handleGenerateReactNative(layerId: string, options: GenerationOptions) {
    if (!this.state.isAnalyzed) {
      throw new Error('Design system not analyzed yet');
    }

    console.log(`🚀 [PluginManager] Generating React Native for layer: ${layerId}`);

    const node = await figma.getNodeByIdAsync(layerId);
    if (!node) {
      throw new Error('Layer not found');
    }

    // Extract detailed layer data with enhanced analysis
    const layerData = this.extractEnhancedLayerData(node as SceneNode, 4);
    
    // Create generation context
    const context = {
      baseDevice: this.state.baseDevice!,
      themeTokens: this.state.themeTokens,
      options,
      componentName: this.sanitizeComponentName(layerData.name),
      usedComponents: new Set<string>(),
      imports: new Set<string>(),
      hooks: new Set<string>(),
      stateVariables: [] as string[]
    };

    // Generate React Native component using enhanced generator
    const generatedComponent = ReactNativeGenerator.generateComponent(layerData, context);
    
    console.log(`✅ [PluginManager] Generated ${generatedComponent.code.length} characters of code`);
    
    this.sendMessage({
      type: 'react-native-generated',
      data: generatedComponent.code
    });
  }

  /**
   * Handle reanalysis request
   */
  private async handleReanalyzeDesignSystem() {
    await this.analyzeDesignSystem();
    await this.handleUIReady();
  }

  /**
   * Handle layer selection
   */
  private async handleSelectLayer(layerId: string) {
    const node = await figma.getNodeByIdAsync(layerId);
    if (node) {
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
  }

  /**
   * Get current page layers with screen detection
   */
  private getCurrentPageLayers(): LayerData[] {
    try {
      const currentPage = figma.currentPage;
      if (!currentPage) return [];

      // Filter for screen-like frames
      const screenFrames = currentPage.children.filter(child => 
        child.type === 'FRAME' && this.isScreenFrame(child)
      );

      return screenFrames.map(frame => this.extractEnhancedLayerData(frame));
    } catch (error) {
      console.error('[PluginManager] Error getting current page layers:', error);
      return [];
    }
  }

  /**
   * Check if frame represents a screen
   */
  private isScreenFrame(frame: FrameNode): boolean {
    const width = frame.width;
    const height = frame.height;
    const name = frame.name.toLowerCase();

    // Check if dimensions match detected devices
    const matchesDevice = this.state.devices.some(device => 
      Math.abs(device.width - width) <= 5 && Math.abs(device.height - height) <= 5
    );

    // Check if name suggests it's a screen
    const hasScreenName = /screen|page|view|layout|mobile|tablet|desktop|iphone|ipad|android/.test(name);

    // Check if it has substantial content
    const hasSubstantialContent = frame.children.length >= 3;

    return matchesDevice || hasScreenName || hasSubstantialContent;
  }

  /**
   * Extract enhanced layer data with analysis
   */
  private extractEnhancedLayerData(node: SceneNode, maxDepth: number = 3, currentDepth: number = 0): LayerData {
    try {
      const layerData: LayerData = {
        id: node.id,
        name: node.name || 'Unnamed Layer',
        type: node.type,
        visible: node.visible ?? true,
        locked: node.locked ?? false,
        properties: this.extractNodeProperties(node),
        deviceInfo: this.getNodeDeviceInfo(node)
      };

      // Add enhanced analysis
      if (this.state.isAnalyzed) {
        try {
          layerData.layoutAnalysis = LayerAnalyzer.analyzeLayout(layerData);
          layerData.componentPattern = LayerAnalyzer.detectComponentPattern(layerData);
          layerData.visualProperties = LayerAnalyzer.extractVisualProperties(layerData);
          
          if (layerData.type === 'TEXT') {
            layerData.textAnalysis = LayerAnalyzer.analyzeText(layerData);
          }

          console.log(`🔍 [PluginManager] Enhanced analysis for ${layerData.name}: ${layerData.componentPattern?.type} (${layerData.componentPattern?.confidence.toFixed(2)})`);
        } catch (analysisError) {
          console.warn('⚠️ [PluginManager] Analysis error for layer:', layerData.name, analysisError);
        }
      }

      // Process children if within depth limit
      if (currentDepth < maxDepth && 'children' in node && node.children && node.children.length > 0) {
        const childrenToProcess = node.children.slice(0, 25);
        layerData.children = childrenToProcess.map(child => {
          try {
            return this.extractEnhancedLayerData(child, maxDepth, currentDepth + 1);
          } catch (error) {
            console.warn('⚠️ [PluginManager] Error processing child node:', error);
            return {
              id: child.id,
              name: child.name || 'Error Loading',
              type: child.type,
              visible: false,
              locked: false
            };
          }
        });
      }

      return layerData;
    } catch (error) {
      console.error('❌ [PluginManager] Error extracting enhanced layer data:', error);
      throw error;
    }
  }

  /**
   * Extract comprehensive node properties
   */
  private extractNodeProperties(node: SceneNode): any {
    const props: any = {
      x: 'x' in node ? node.x : undefined,
      y: 'y' in node ? node.y : undefined,
      width: 'width' in node ? node.width : undefined,
      height: 'height' in node ? node.height : undefined,
    };

    // Extract layout properties for auto-layout frames
    if ('layoutMode' in node) {
      props.layoutMode = node.layoutMode;
      if ('itemSpacing' in node) props.itemSpacing = node.itemSpacing;
      if ('paddingLeft' in node) props.paddingLeft = node.paddingLeft;
      if ('paddingRight' in node) props.paddingRight = node.paddingRight;
      if ('paddingTop' in node) props.paddingTop = node.paddingTop;
      if ('paddingBottom' in node) props.paddingBottom = node.paddingBottom;
      if ('primaryAxisAlignItems' in node) props.primaryAxisAlignItems = node.primaryAxisAlignItems;
      if ('counterAxisAlignItems' in node) props.counterAxisAlignItems = node.counterAxisAlignItems;
    }

    // Extract visual properties
    if ('fills' in node && node.fills) {
      props.fills = Array.isArray(node.fills) ? node.fills : [node.fills];
    }

    if ('strokes' in node && node.strokes) {
      props.strokes = Array.isArray(node.strokes) ? node.strokes : [node.strokes];
      if ('strokeWeight' in node) props.strokeWeight = node.strokeWeight;
    }

    if ('cornerRadius' in node) {
      props.cornerRadius = node.cornerRadius;
    }

    if ('effects' in node && node.effects) {
      props.effects = Array.isArray(node.effects) ? node.effects : [node.effects];
    }

    if ('opacity' in node) {
      props.opacity = node.opacity;
    }

    // Extract text properties for text nodes
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      props.fontSize = textNode.fontSize;
      props.fontName = textNode.fontName;
      props.characters = textNode.characters;
      props.textAlignHorizontal = textNode.textAlignHorizontal;
      props.textAlignVertical = textNode.textAlignVertical;
      props.lineHeight = textNode.lineHeight;
      props.letterSpacing = textNode.letterSpacing;
    }

    return props;
  }

  /**
   * Get device information for a node
   */
  private getNodeDeviceInfo(node: SceneNode): DeviceInfo | null {
    if (node.type === 'FRAME') {
      const width = node.width;
      const height = node.height;
      
      // Find matching device
      const matchingDevice = this.state.devices.find(device => 
        Math.abs(device.width - width) <= 5 && Math.abs(device.height - height) <= 5
      );

      return matchingDevice || null;
    }

    return null;
  }

  /**
   * Sanitize component name for React - FIXED
   */
  private sanitizeComponentName(name: string): string {
    // Remove special characters and ensure it starts with a letter
    const sanitized = name.replace(/[^a-zA-Z0-9]/g, '').replace(/^\d/, 'Component');
    return sanitized || 'GeneratedComponent';
  }

  /**
   * Send message to UI
   */
  private sendMessage(message: any) {
    figma.ui.postMessage(message);
  }

  /**
   * Send error message to UI
   */
  private sendError(message: string) {
    this.sendMessage({
      type: 'error',
      message
    });
  }

  /**
   * Cleanup when plugin closes
   */
  cleanup() {
    console.log('🔄 [PluginManager] Plugin cleaning up...');
    // Perform any necessary cleanup
  }
}