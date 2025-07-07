// src/plugin/core/PluginManager.ts
import { DeviceDetector, DeviceInfo } from './DeviceDetector';
import { ThemeGenerator, ThemeTokens } from './ThemeGenerator';
import { LayerData } from '../types/FigmaTypes';
import { 
  UIToPluginMessage, 
  PluginToUIMessage,
  GenerationOptions 
} from '../../shared/types/Messages';

interface PluginState {
  devices: DeviceInfo[];
  baseDevice: DeviceInfo | null;
  themeTokens: ThemeTokens | null;
  isAnalyzed: boolean;
}

export class PluginManager {
  private state: PluginState = {
    devices: [],
    baseDevice: null,
    themeTokens: null,
    isAnalyzed: false
  };

  constructor() {
    this.initializePlugin();
    this.setupMessageHandler();
  }

  /**
   * Initialize the plugin
   */
  private async initializePlugin() {
    console.log('🚀 [PluginManager.ts:25] Enhanced Plugin starting...');
    
    figma.showUI(__html__, { 
      width: 480, 
      height: 700,
      themeColors: true 
    });

    // Perform initial analysis
    await this.analyzeDesignSystem();
    
    console.log('✅ [PluginManager.ts:35] Plugin initialized successfully');
  }

  /**
   * Setup message handler for UI communication
   */
  private setupMessageHandler() {
    figma.ui.onmessage = async (msg: UIToPluginMessage) => {
      console.log(`📨 [PluginManager.ts:43] Received message: ${msg.type}`);
      
      try {
        await this.handleMessage(msg);
      } catch (error) {
        console.error(`❌ [PluginManager.ts:48] Error handling message:`, error);
        this.sendError(`Error: ${(error as Error).message}`);
      }
    };
  }

  /**
   * Handle incoming messages from UI
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
        console.warn(`⚠️ [PluginManager.ts:82] Unknown message type: ${(msg as any).type}`);
    }
  }

  /**
   * Analyze the entire design system
   */
  private async analyzeDesignSystem() {
    try {
      console.log('🔍 [PluginManager.ts:91] Analyzing design system...');
      
      // 1. Detect all devices in the document
      this.state.devices = DeviceDetector.scanDocument();
      console.log(`📱 [PluginManager.ts:95] Found ${this.state.devices.length} device types`);
      
      // 2. Select base device for responsive calculations
      this.state.baseDevice = DeviceDetector.selectBaseDevice(this.state.devices);
      console.log(`📐 [PluginManager.ts:99] Base device: ${this.state.baseDevice.name}`);
      
      // 3. Extract design tokens
      this.state.themeTokens = ThemeGenerator.analyzeDesignSystem();
      console.log(`🎨 [PluginManager.ts:103] Extracted tokens:`, {
        colors: this.state.themeTokens.colors.length,
        typography: this.state.themeTokens.typography.length,
        spacing: this.state.themeTokens.spacing.length
      });
      
      this.state.isAnalyzed = true;
      
    } catch (error) {
      console.error('❌ [PluginManager.ts:112] Error analyzing design system:', error);
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
        layers: this.getCurrentPageLayers()
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
   * Handle React Native generation
   */
  private async handleGenerateReactNative(layerId: string, options: GenerationOptions) {
    if (!this.state.isAnalyzed) {
      throw new Error('Design system not analyzed yet');
    }

    const node = await figma.getNodeByIdAsync(layerId);
    if (!node) {
      throw new Error('Layer not found');
    }

    // For now, generate a basic component structure
    const layerData = this.extractLayerData(node as SceneNode, 4);
    const rnCode = this.generateBasicReactNativeComponent(layerData, options);
    
    this.sendMessage({
      type: 'react-native-generated',
      data: rnCode
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
   * Get current page layers
   */
  private getCurrentPageLayers(): LayerData[] {
    try {
      const currentPage = figma.currentPage;
      if (!currentPage) return [];

      // Filter for screen-like frames
      const screenFrames = currentPage.children.filter(child => 
        child.type === 'FRAME' && this.isScreenFrame(child)
      );

      return screenFrames.map(frame => this.extractLayerData(frame));
    } catch (error) {
      console.error('[PluginManager.ts:207] Error getting current page layers:', error);
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

    return matchesDevice || hasScreenName || frame.children.length >= 3;
  }

  /**
   * Extract layer data with enhanced information
   */
  private extractLayerData(node: SceneNode, maxDepth: number = 3, currentDepth: number = 0): LayerData {
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

      // Process children if within depth limit
      if (currentDepth < maxDepth && 'children' in node && node.children && node.children.length > 0) {
        const childrenToProcess = node.children.slice(0, 25);
        layerData.children = childrenToProcess.map(child => {
          try {
            return this.extractLayerData(child, maxDepth, currentDepth + 1);
          } catch (error) {
            console.warn('⚠️ [PluginManager.ts:246] Error processing child node:', error);
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
      console.error('❌ [PluginManager.ts:258] Error extracting layer data:', error);
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

    // Extract layout properties
    if ('layoutMode' in node) {
      props.layoutMode = node.layoutMode;
      props.itemSpacing = 'itemSpacing' in node ? node.itemSpacing : undefined;
      props.paddingLeft = 'paddingLeft' in node ? node.paddingLeft : undefined;
      props.paddingRight = 'paddingRight' in node ? node.paddingRight : undefined;
      props.paddingTop = 'paddingTop' in node ? node.paddingTop : undefined;
      props.paddingBottom = 'paddingBottom' in node ? node.paddingBottom : undefined;
    }

    // Extract visual properties
    if ('fills' in node && node.fills) {
      props.fills = node.fills;
    }

    if ('cornerRadius' in node) {
      props.cornerRadius = node.cornerRadius;
    }

    // Extract text properties
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      props.fontSize = textNode.fontSize;
      props.fontName = textNode.fontName;
      props.characters = textNode.characters;
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
   * Generate basic React Native component (placeholder for full implementation)
   */
  private generateBasicReactNativeComponent(layerData: LayerData, options: GenerationOptions): string {
    const componentName = this.sanitizeComponentName(layerData.name);
    
    return `import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ${options.useResponsive ? 'Dimensions,' : ''}
} from 'react-native';
${options.useThemeTokens ? "\nimport { COLORS, FONTS, normalize, scale, verticalScale } from './theme';" : ''}

${options.useResponsive ? 'const { width: SCREEN_WIDTH } = Dimensions.get("window");' : ''}

${options.useTypeScript ? 'const ' : 'const '}${componentName}${options.useTypeScript ? ': React.FC' : ''} = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>${layerData.name}</Text>
      {/* Generated component structure will go here */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ${options.useThemeTokens ? 'COLORS.Background || "#FFFFFF"' : '"#FFFFFF"'},
  },
  title: {
    fontSize: ${options.useResponsive ? 'normalize(24)' : '24'},
    ${options.useThemeTokens ? 'fontFamily: FONTS.interBold,' : 'fontWeight: "bold",'}
    color: ${options.useThemeTokens ? 'COLORS.Navy || "#000000"' : '"#000000"'},
    textAlign: 'center',
    marginVertical: ${options.useResponsive ? 'verticalScale(20)' : '20'},
  },
});

export default ${componentName};`;
  }

  /**
   * Sanitize component name
   */
  private sanitizeComponentName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^\d/, 'Component$&') || 'GeneratedComponent';
  }

  /**
   * Send message to UI
   */
  private sendMessage(message: PluginToUIMessage) {
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
    console.log('🔄 [PluginManager.ts:392] Plugin cleaning up...');
    // Perform any necessary cleanup
  }
}