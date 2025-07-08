// src/plugin/core/PluginManager.ts - Enhanced with Better Error Handling and Performance
import { DeviceDetector } from './DeviceDetector';
import { ThemeGenerator } from './ThemeGenerator';
import { ReactNativeGenerator } from '../generators/ReactNativeGenerator';
import { LayerAnalyzer } from '../analyzers/LayerAnalyzer';
import { 
  DeviceInfo,
  ThemeTokens,
  LayerData,
  GenerationOptions,
  NodeProperties,
  UIToPluginMessage,
  PluginToUIMessage
} from '../../shared/types';

interface PluginState {
  devices: DeviceInfo[];
  baseDevice: DeviceInfo | null;
  themeTokens: ThemeTokens | null;
  isAnalyzed: boolean;
  currentLayers: LayerData[];
  isProcessing: boolean;
  lastError: string | null;
}

export class PluginManager {
  private state: PluginState = {
    devices: [],
    baseDevice: null,
    themeTokens: null,
    isAnalyzed: false,
    currentLayers: [],
    isProcessing: false,
    lastError: null
  };

  private readonly MAX_LAYER_DEPTH = 5;
  private readonly MAX_CHILDREN_PER_LAYER = 30;
  private readonly ANALYSIS_TIMEOUT = 15000; // 15 seconds

  constructor() {
    this.initializePlugin();
    this.setupMessageHandler();
  }

  /**
   * Initialize the plugin with comprehensive error handling
   */
  private async initializePlugin() {
    console.log('🚀 [PluginManager] Enhanced Plugin starting...');
    
    try {
      // Show UI immediately
      figma.showUI(__html__, { 
        width: 480, 
        height: 700,
        themeColors: true 
      });

      // Set UI visible and ready state
      figma.ui.postMessage({ 
        type: 'plugin-ready',
        timestamp: Date.now()
      });

      // Perform initial analysis with timeout
      await this.analyzeDesignSystemWithTimeout();
      
      console.log('✅ [PluginManager] Plugin initialized successfully');
      
    } catch (error) {
      console.error('❌ [PluginManager] Initialization failed:', error);
      this.handleError(error as Error, 'Plugin Initialization');
    }
  }

  /**
   * Setup message handler with enhanced error handling
   */
  private setupMessageHandler() {
    figma.ui.onmessage = async (msg: any) => {
      if (!msg || typeof msg !== 'object') {
        console.warn('⚠️ [PluginManager] Invalid message received:', msg);
        return;
      }

      console.log(`📨 [PluginManager] Received message: ${msg.type}`);
      
      // Prevent concurrent operations
      if (this.state.isProcessing && msg.type !== 'close') {
        this.sendError('Plugin is currently processing. Please wait...');
        return;
      }

      try {
        this.state.isProcessing = true;
        await this.handleMessage(msg as UIToPluginMessage);
      } catch (error) {
        console.error(`❌ [PluginManager] Error handling message ${msg.type}:`, error);
        this.handleError(error as Error, `Message Handler: ${msg.type}`);
      } finally {
        this.state.isProcessing = false;
      }
    };
  }

  /**
   * Handle incoming messages from UI with better error boundaries
   */
  private async handleMessage(msg: UIToPluginMessage) {
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
        console.warn(`⚠️ [PluginManager] Unknown message type: ${(msg as any).type}`);
    }
  }

  /**
   * Analyze design system with timeout and progress reporting
   */
  private async analyzeDesignSystemWithTimeout() {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Design system analysis timed out'));
      }, this.ANALYSIS_TIMEOUT);

      this.analyzeDesignSystem()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Analyze the entire design system with progress tracking
   */
  private async analyzeDesignSystem() {
    try {
      console.log('🔍 [PluginManager] Analyzing design system...');
      this.state.lastError = null;
      
      // Send progress update
      this.sendMessage({
        type: 'analysis-progress',
        data: { step: 'devices', progress: 0.2 }
      } as any);

      // 1. Detect all devices in the document
      this.state.devices = DeviceDetector.scanDocument();
      console.log(`📱 [PluginManager] Found ${this.state.devices.length} device types`);
      
      // Send progress update
      this.sendMessage({
        type: 'analysis-progress',
        data: { step: 'base-device', progress: 0.4 }
      } as any);

      // 2. Select base device for responsive calculations
      this.state.baseDevice = DeviceDetector.selectBaseDevice(this.state.devices);
      if (this.state.baseDevice) {
        console.log(`📐 [PluginManager] Base device: ${this.state.baseDevice.name}`);
      } else {
        console.warn('⚠️ [PluginManager] No base device selected, using fallback');
      }
      
      // Send progress update
      this.sendMessage({
        type: 'analysis-progress',
        data: { step: 'theme-tokens', progress: 0.6 }
      } as any);

      // 3. Extract design tokens with error handling
      try {
        this.state.themeTokens = ThemeGenerator.analyzeDesignSystem();
        
        if (this.state.themeTokens) {
          console.log(`🎨 [PluginManager] Extracted tokens:`, {
            colors: this.state.themeTokens.colors.length,
            typography: this.state.themeTokens.typography.length,
            spacing: this.state.themeTokens.spacing.length
          });
        }
      } catch (error) {
        console.error('❌ [PluginManager] Theme extraction failed:', error);
        // Continue with empty theme tokens
        this.state.themeTokens = {
          colors: [],
          typography: [],
          spacing: [],
          shadows: [],
          borderRadius: []
        };
      }
      
      // Send progress update
      this.sendMessage({
        type: 'analysis-progress',
        data: { step: 'layers', progress: 0.8 }
      } as any);

      // 4. Get current page layers with limits
      this.state.currentLayers = this.getCurrentPageLayers();
      console.log(`📋 [PluginManager] Found ${this.state.currentLayers.length} screen layers`);
      
      this.state.isAnalyzed = true;
      
      // Send completion
      this.sendMessage({
        type: 'analysis-progress',
        data: { step: 'complete', progress: 1.0 }
      } as any);
      
    } catch (error) {
      console.error('❌ [PluginManager] Error analyzing design system:', error);
      this.state.lastError = (error as Error).message;
      throw error;
    }
  }

  /**
   * Handle UI ready message with state validation
   */
  private async handleUIReady() {
    try {
      // Validate state before sending
      const dataToSend = {
        devices: this.state.devices || [],
        baseDevice: this.state.baseDevice,
        themeTokens: this.state.themeTokens,
        layers: this.state.currentLayers || []
      };

      this.sendMessage({
        type: 'design-system-analyzed',
        data: dataToSend
      });

      // Send any cached errors
      if (this.state.lastError) {
        this.sendError(this.state.lastError);
      }
    } catch (error) {
      console.error('❌ [PluginManager] Error in handleUIReady:', error);
      this.handleError(error as Error, 'UI Ready Handler');
    }
  }

  /**
   * Handle get layers request with error boundaries
   */
  private async handleGetLayers() {
    try {
      const layers = this.getCurrentPageLayers();
      this.sendMessage({
        type: 'layers-data',
        data: layers
      });
    } catch (error) {
      console.error('❌ [PluginManager] Error getting layers:', error);
      this.handleError(error as Error, 'Get Layers');
    }
  }

  /**
   * Handle theme file generation with validation
   */
  private async handleGetThemeFile() {
    try {
      if (!this.state.themeTokens || !this.state.baseDevice) {
        throw new Error('Design system not analyzed yet. Please wait for analysis to complete.');
      }

      const themeFile = ThemeGenerator.generateThemeFile(
        this.state.themeTokens, 
        this.state.baseDevice
      );
      
      this.sendMessage({
        type: 'theme-file-generated',
        data: themeFile
      });
    } catch (error) {
      console.error('❌ [PluginManager] Error generating theme file:', error);
      this.handleError(error as Error, 'Theme Generation');
    }
  }

  /**
   * Handle React Native generation with enhanced validation
   */
  private async handleGenerateReactNative(layerId: string, options: GenerationOptions) {
    try {
      if (!this.state.isAnalyzed || !this.state.baseDevice) {
        throw new Error('Design system not analyzed yet. Please wait for analysis to complete.');
      }

      if (!layerId) {
        throw new Error('No layer ID provided');
      }

      console.log(`🚀 [PluginManager] Generating React Native for layer: ${layerId}`);

      // Validate node exists
      const node = await figma.getNodeByIdAsync(layerId);
      if (!node) {
        throw new Error(`Layer with ID ${layerId} not found. It may have been deleted.`);
      }

      // Validate node is a scene node
      if (!('x' in node) && !('children' in node)) {
        throw new Error('Selected layer is not a valid scene node');
      }

      // Extract layer data with size limits
      const layerData = this.extractEnhancedLayerData(node as SceneNode, this.MAX_LAYER_DEPTH);
      
      // Validate layer data
      if (!layerData) {
        throw new Error('Failed to extract layer data');
      }

      // Create generation context with validation
      if (!this.state.baseDevice) {
        throw new Error('Base device not available');
      }

      const context = {
        baseDevice: this.state.baseDevice,
        themeTokens: this.state.themeTokens,
        options: options || this.getDefaultOptions(),
        componentName: this.sanitizeComponentName(layerData.name),
        usedComponents: new Set<string>(),
        imports: new Set<string>(),
        hooks: new Set<string>(),
        stateVariables: [] as string[]
      };

      // Generate React Native component
      const generatedComponent = ReactNativeGenerator.generateComponent(layerData, context);
      
      if (!generatedComponent || !generatedComponent.code) {
        throw new Error('Failed to generate component code');
      }

      console.log(`✅ [PluginManager] Generated ${generatedComponent.code.length} characters of code`);
      
      this.sendMessage({
        type: 'react-native-generated',
        data: generatedComponent.code
      });

    } catch (error) {
      console.error('❌ [PluginManager] Error generating React Native:', error);
      this.handleError(error as Error, 'React Native Generation');
    }
  }

  /**
   * Handle reanalysis request with cleanup
   */
  private async handleReanalyzeDesignSystem() {
    try {
      // Reset state
      this.state.isAnalyzed = false;
      this.state.currentLayers = [];
      this.state.lastError = null;

      await this.analyzeDesignSystemWithTimeout();
      await this.handleUIReady();
    } catch (error) {
      console.error('❌ [PluginManager] Error reanalyzing:', error);
      this.handleError(error as Error, 'Reanalysis');
    }
  }

  /**
   * Handle layer selection with validation
   */
  private async handleSelectLayer(layerId: string) {
    try {
      if (!layerId) {
        throw new Error('No layer ID provided');
      }

      const node = await figma.getNodeByIdAsync(layerId);
      if (!node) {
        throw new Error('Layer not found');
      }

      if ('x' in node || 'children' in node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
    } catch (error) {
      console.error('❌ [PluginManager] Error selecting layer:', error);
      this.handleError(error as Error, 'Layer Selection');
    }
  }

  /**
   * Get current page layers with performance limits
   */
  private getCurrentPageLayers(): LayerData[] {
    try {
      const currentPage = figma.currentPage;
      if (!currentPage) {
        console.warn('⚠️ [PluginManager] No current page available');
        return [];
      }

      // Filter for screen-like frames with limits
      const screenFrames = currentPage.children
        .filter(child => child.type === 'FRAME' && this.isScreenFrame(child))
        .slice(0, 50); // Limit to 50 frames for performance

      return screenFrames.map(frame => {
        try {
          return this.extractEnhancedLayerData(frame);
        } catch (error) {
          console.warn(`⚠️ [PluginManager] Error processing frame ${frame.name}:`, error);
          return {
            id: frame.id,
            name: frame.name || 'Error Loading Frame',
            type: frame.type,
            visible: false,
            locked: false
          };
        }
      });
    } catch (error) {
      console.error('❌ [PluginManager] Error getting current page layers:', error);
      return [];
    }
  }

  /**
   * Check if frame represents a screen with enhanced detection
   */
  private isScreenFrame(frame: FrameNode): boolean {
    try {
      const width = frame.width;
      const height = frame.height;
      const name = frame.name.toLowerCase();

      // Check size constraints
      if (width < 200 || height < 300 || width > 3000 || height > 3000) {
        return false;
      }

      // Check if dimensions match detected devices
      const matchesDevice = this.state.devices.some(device => 
        Math.abs(device.width - width) <= 10 && Math.abs(device.height - height) <= 10
      );

      // Check if name suggests it's a screen
      const hasScreenName = /screen|page|view|layout|mobile|tablet|desktop|iphone|ipad|android|mockup/.test(name);

      // Check if it has substantial content
      const hasSubstantialContent = frame.children.length >= 2;

      return matchesDevice || hasScreenName || hasSubstantialContent;
    } catch (error) {
      console.warn('⚠️ [PluginManager] Error checking screen frame:', error);
      return false;
    }
  }

  /**
   * Extract enhanced layer data with performance limits and error handling
   */
  private extractEnhancedLayerData(node: SceneNode, maxDepth: number = 3, currentDepth: number = 0): LayerData {
    try {
      const layerData: LayerData = {
        id: node.id,
        name: node.name || 'Unnamed Layer',
        type: node.type,
        visible: node.visible ?? true,
        locked: node.locked ?? false,
        properties: this.extractNodePropertiesSafely(node),
        deviceInfo: this.getNodeDeviceInfo(node)
      };

      // Add enhanced analysis with error handling
      if (this.state.isAnalyzed) {
        try {
          layerData.layoutAnalysis = LayerAnalyzer.analyzeLayout(layerData);
          layerData.componentPattern = LayerAnalyzer.detectComponentPattern(layerData);
          layerData.visualProperties = LayerAnalyzer.extractVisualProperties(layerData);
          
          if (layerData.type === 'TEXT') {
            const textAnalysis = LayerAnalyzer.analyzeText(layerData);
            if (textAnalysis !== null) {
              layerData.textAnalysis = textAnalysis;
            }
          }
        } catch (analysisError) {
          console.warn(`⚠️ [PluginManager] Analysis error for layer ${layerData.name}:`, analysisError);
        }
      }

      // Process children with limits
      if (currentDepth < maxDepth && 'children' in node && node.children && node.children.length > 0) {
        const childrenToProcess = node.children.slice(0, this.MAX_CHILDREN_PER_LAYER);
        layerData.children = childrenToProcess.map(child => {
          try {
            return this.extractEnhancedLayerData(child, maxDepth, currentDepth + 1);
          } catch (error) {
            console.warn(`⚠️ [PluginManager] Error processing child node:`, error);
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
   * Safely extract node properties with comprehensive null checking
   */
  private extractNodePropertiesSafely(node: SceneNode): NodeProperties {
    const props: NodeProperties = {};

    try {
      // Basic positioning - safe for all nodes
      if ('x' in node && typeof node.x === 'number') props.x = node.x;
      if ('y' in node && typeof node.y === 'number') props.y = node.y;
      if ('width' in node && typeof node.width === 'number') props.width = node.width;
      if ('height' in node && typeof node.height === 'number') props.height = node.height;

      // Layout properties for auto-layout frames
      if ('layoutMode' in node && node.layoutMode) {
        props.layoutMode = node.layoutMode;
        
        // Safe extraction with figma.mixed handling
        if ('itemSpacing' in node && typeof node.itemSpacing === 'number') {
          props.itemSpacing = node.itemSpacing;
        }
        
        // Padding properties
        ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].forEach(prop => {
          if (prop in node && typeof (node as any)[prop] === 'number') {
            (props as any)[prop] = (node as any)[prop];
          }
        });

        if ('primaryAxisAlignItems' in node) props.primaryAxisAlignItems = node.primaryAxisAlignItems;
        if ('counterAxisAlignItems' in node) props.counterAxisAlignItems = node.counterAxisAlignItems;
      }

      // Visual properties with null checks
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        props.fills = node.fills as readonly Paint[];
      }

      if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        props.strokes = node.strokes as readonly Paint[];
        if ('strokeWeight' in node && typeof node.strokeWeight === 'number') {
          props.strokeWeight = node.strokeWeight;
        }
      }

      // Corner radius with figma.mixed handling
      if ('cornerRadius' in node && node.cornerRadius !== undefined && node.cornerRadius !== figma.mixed) {
        if (typeof node.cornerRadius === 'number') {
          props.cornerRadius = node.cornerRadius;
        }
      }

      if ('effects' in node && node.effects && Array.isArray(node.effects)) {
        props.effects = node.effects as readonly Effect[];
      }

      // Opacity and rotation with figma.mixed handling
      if ('opacity' in node && typeof node.opacity === 'number') {
        props.opacity = node.opacity;
      }

      if ('rotation' in node && typeof node.rotation === 'number') {
        props.rotation = node.rotation;
      }

      // Text properties for text nodes with comprehensive figma.mixed handling
      if (node.type === 'TEXT') {
        const textNode = node as TextNode;
        
        if (typeof textNode.fontSize === 'number') {
          props.fontSize = textNode.fontSize;
        }
        
        // Handle fontName properly
        if (textNode.fontName && textNode.fontName !== figma.mixed && typeof textNode.fontName === 'object') {
          props.fontName = textNode.fontName as FontName;
        }
        
        if (textNode.characters) {
          props.characters = textNode.characters;
        }
        
        if (textNode.textAlignHorizontal) {
          props.textAlignHorizontal = textNode.textAlignHorizontal;
        }
        
        if (textNode.textAlignVertical) {
          props.textAlignVertical = textNode.textAlignVertical;
        }
        
        if (textNode.lineHeight && textNode.lineHeight !== figma.mixed) {
          props.lineHeight = textNode.lineHeight;
        }
        
        if (textNode.letterSpacing && textNode.letterSpacing !== figma.mixed) {
          props.letterSpacing = textNode.letterSpacing;
        }
      }

    } catch (error) {
      console.warn(`⚠️ [PluginManager] Error extracting properties for ${node.name}:`, error);
    }

    return props;
  }

  /**
   * Get device information for a node
   */
  private getNodeDeviceInfo(node: SceneNode): DeviceInfo | null {
    try {
      if (node.type === 'FRAME') {
        const width = node.width;
        const height = node.height;
        
        return this.state.devices.find(device => 
          Math.abs(device.width - width) <= 5 && Math.abs(device.height - height) <= 5
        ) || null;
      }
    } catch (error) {
      console.warn('⚠️ [PluginManager] Error getting device info:', error);
    }

    return null;
  }

  /**
   * Get default generation options
   */
  private getDefaultOptions(): GenerationOptions {
    return {
      useTypeScript: true,
      useResponsive: true,
      useThemeTokens: true,
      componentType: 'screen',
      includeNavigation: false,
      outputFormat: 'single-file'
    };
  }

  /**
   * Sanitize component name for React with validation
   */
  private sanitizeComponentName(name: string): string {
    if (!name || typeof name !== 'string') {
      return 'GeneratedComponent';
    }

    // Remove special characters and ensure it starts with a letter
    const sanitized = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^\d+/, '')
      .trim();
    
    if (!sanitized || sanitized.length === 0) {
      return 'GeneratedComponent';
    }

    // Ensure first letter is uppercase
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }

  /**
   * Enhanced error handling with context
   */
  private handleError(error: Error, context: string) {
    const errorMessage = `${context}: ${error.message}`;
    console.error(`❌ [PluginManager] ${errorMessage}`, error);
    
    this.state.lastError = errorMessage;
    this.sendError(errorMessage);
  }

  /**
   * Send message to UI with error handling
   */
  private sendMessage(message: PluginToUIMessage) {
    try {
      figma.ui.postMessage(message);
    } catch (error) {
      console.error('❌ [PluginManager] Error sending message to UI:', error);
    }
  }

  /**
   * Send error message to UI
   */
  private sendError(message: string) {
    try {
      this.sendMessage({
        type: 'error',
        message
      });
    } catch (error) {
      console.error('❌ [PluginManager] Error sending error message:', error);
    }
  }

  /**
   * Cleanup when plugin closes
   */
  cleanup() {
    console.log('🔄 [PluginManager] Plugin cleaning up...');
    try {
      // Reset state
      this.state.isProcessing = false;
      this.state.lastError = null;
      
      // Clear any timeouts or intervals if needed
      // (Add cleanup code here if you have any)
    } catch (error) {
      console.error('❌ [PluginManager] Error during cleanup:', error);
    }
  }
}