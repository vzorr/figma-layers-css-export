// src/plugin/core/PluginManager.ts - Complete Rewrite with Better Architecture

// Import Figma types first
/// <reference types="@figma/plugin-typings" />


import { DeviceDetector } from './DeviceDetector';
import { ThemeGenerator } from './ThemeGenerator';
import { ReactNativeGenerator } from '../generators/ReactNativeGenerator';
import { LayerAnalyzer } from '../analyzers/LayerAnalyzer';
import { 
  DeviceInfo,
  ThemeTokens,
  LayerData,
  GenerationOptions,
  UIToPluginMessage,
  PluginToUIMessage,
  DesignSystemAnalyzedMessage,
  LayersDataMessage,
  ThemeFileGeneratedMessage,
  ReactNativeGeneratedMessage,
  ErrorMessage,
  AnalysisProgressMessage
} from '../../shared/types';

// ============================================================================
// CONFIGURATION AND CONSTANTS
// ============================================================================

interface PluginConfig {
  readonly MAX_LAYER_DEPTH: number;
  readonly MAX_CHILDREN_PER_LAYER: number;
  readonly ANALYSIS_TIMEOUT_MS: number;
  readonly MESSAGE_TIMEOUT_MS: number;
  readonly MAX_RETRY_ATTEMPTS: number;
  readonly RETRY_DELAY_MS: number;
  readonly UI_DIMENSIONS: { width: number; height: number };
  readonly PERFORMANCE_THRESHOLDS: {
    maxNodes: number;
    maxAnalysisTime: number;
    memoryWarningThreshold: number;
  };
}

const DEFAULT_CONFIG: PluginConfig = {
  MAX_LAYER_DEPTH: 5,
  MAX_CHILDREN_PER_LAYER: 30,
  ANALYSIS_TIMEOUT_MS: 15000,
  MESSAGE_TIMEOUT_MS: 5000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  UI_DIMENSIONS: { width: 480, height: 700 },
  PERFORMANCE_THRESHOLDS: {
    maxNodes: 1000,
    maxAnalysisTime: 10000,
    memoryWarningThreshold: 50
  }
} as const;

// ============================================================================
// ERROR HANDLING SYSTEM
// ============================================================================

abstract class PluginError extends Error {
  abstract readonly code: string;
  abstract readonly userMessage: string;
  abstract readonly recoveryAction?: string;
  
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

class FigmaAPIError extends PluginError {
  readonly code = 'FIGMA_API_ERROR';
  readonly userMessage = 'Failed to access Figma data';
  readonly recoveryAction = 'Please try refreshing the plugin or reopening the file';
}

class AnalysisTimeoutError extends PluginError {
  readonly code = 'ANALYSIS_TIMEOUT';
  readonly userMessage = 'Design analysis is taking too long';
  readonly recoveryAction = 'Try selecting a smaller portion of your design or simplifying the layout';
}

class InvalidNodeError extends PluginError {
  readonly code = 'INVALID_NODE';
  readonly userMessage = 'Selected element is no longer available';
  readonly recoveryAction = 'Please select a different element';
}

class GenerationError extends PluginError {
  readonly code = 'GENERATION_ERROR';
  readonly userMessage = 'Failed to generate React Native code';
  readonly recoveryAction = 'Try adjusting the generation options or selecting a simpler component';
}

class MemoryLimitError extends PluginError {
  readonly code = 'MEMORY_LIMIT';
  readonly userMessage = 'Design file is too complex to analyze';
  readonly recoveryAction = 'Try working with a smaller portion of your design';
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

interface PluginState {
  readonly devices: DeviceInfo[];
  readonly baseDevice: DeviceInfo | null;
  readonly themeTokens: ThemeTokens | null;
  readonly currentLayers: LayerData[];
  readonly isAnalyzed: boolean;
  readonly isProcessing: boolean;
  readonly lastError: PluginError | null;
  readonly analysisProgress: { step: string; progress: number } | null;
  readonly performanceMetrics: {
    nodesProcessed: number;
    analysisStartTime: number;
    memoryUsage: number;
  };
}

class StateManager {
  private state: PluginState;
  private readonly listeners: Set<(state: PluginState) => void> = new Set();

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): PluginState {
    return {
      devices: [],
      baseDevice: null,
      themeTokens: null,
      currentLayers: [],
      isAnalyzed: false,
      isProcessing: false,
      lastError: null,
      analysisProgress: null,
      performanceMetrics: {
        nodesProcessed: 0,
        analysisStartTime: 0,
        memoryUsage: 0
      }
    };
  }

  getState(): Readonly<PluginState> {
    return this.state;
  }

  updateState(updater: (prevState: PluginState) => Partial<PluginState>): void {
    const updates = updater(this.state);
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  subscribe(listener: (state: PluginState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    });
  }

  reset(): void {
    this.state = this.getInitialState();
    this.notifyListeners();
  }
}

// ============================================================================
// MESSAGE HANDLING SYSTEM
// ============================================================================

type MessageHandler<T extends UIToPluginMessage> = (message: T) => Promise<void>;

class MessageRouter {
  private readonly handlers = new Map<string, MessageHandler<any>>();
  private readonly pendingMessages = new Map<string, { resolve: Function; reject: Function; timeout: number }>();

  registerHandler<T extends UIToPluginMessage>(
    type: T['type'], 
    handler: MessageHandler<T>
  ): void {
    this.handlers.set(type, handler);
  }

  async handleMessage(message: UIToPluginMessage): Promise<void> {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      throw new Error(`No handler registered for message type: ${message.type}`);
    }

    try {
      await handler(message);
    } catch (error) {
      console.error(`Handler error for ${message.type}:`, error);
      throw error;
    }
  }

  sendMessage(message: PluginToUIMessage): void {
    try {
      figma.ui.postMessage(message);
    } catch (error) {
      console.error('Failed to send message to UI:', error);
      throw new FigmaAPIError('Failed to communicate with UI', { message, error });
    }
  }

  sendMessageWithTimeout(message: PluginToUIMessage, timeoutMs: number = DEFAULT_CONFIG.MESSAGE_TIMEOUT_MS): Promise<void> {
    return new Promise((resolve, reject) => {
      const messageId = `${message.type}_${Date.now()}_${Math.random()}`;
      
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error(`Message ${message.type} timed out`));
      }, timeoutMs);

      this.pendingMessages.set(messageId, { resolve, reject, timeout });

      try {
        this.sendMessage({ ...message, id: messageId });
        // For now, resolve immediately since we don't have response handling
        // In a full implementation, you'd wait for a response message
        resolve();
        clearTimeout(timeout);
        this.pendingMessages.delete(messageId);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingMessages.delete(messageId);
        reject(error);
      }
    });
  }
}

// ============================================================================
// OPERATION MANAGEMENT
// ============================================================================

class OperationManager {
  private readonly activeOperations = new Set<string>();
  private readonly operationTimeouts = new Map<string, number>();

  async executeWithTimeout<T>(
    operationId: string,
    operation: () => Promise<T>,
    timeoutMs: number,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    if (this.activeOperations.has(operationId)) {
      throw new Error(`Operation ${operationId} is already running`);
    }

    this.activeOperations.add(operationId);
    
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cleanup(operationId);
        reject(new AnalysisTimeoutError(`Operation ${operationId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.operationTimeouts.set(operationId, timeout);

      operation()
        .then(result => {
          this.cleanup(operationId);
          resolve(result);
        })
        .catch(error => {
          this.cleanup(operationId);
          reject(error);
        });
    });
  }

  private cleanup(operationId: string): void {
    this.activeOperations.delete(operationId);
    const timeout = this.operationTimeouts.get(operationId);
    if (timeout) {
      clearTimeout(timeout);
      this.operationTimeouts.delete(operationId);
    }
  }

  isOperationActive(operationId: string): boolean {
    return this.activeOperations.has(operationId);
  }

  cancelOperation(operationId: string): void {
    this.cleanup(operationId);
  }

  cancelAllOperations(): void {
    for (const operationId of this.activeOperations) {
      this.cleanup(operationId);
    }
  }
}

// ============================================================================
// MAIN PLUGIN MANAGER CLASS
// ============================================================================

export class PluginManager {
  private readonly config: PluginConfig;
  private readonly stateManager: StateManager;
  private readonly messageRouter: MessageRouter;
  private readonly operationManager: OperationManager;
  
  constructor(config: Partial<PluginConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stateManager = new StateManager();
    this.messageRouter = new MessageRouter();
    this.operationManager = new OperationManager();
    
    this.setupMessageHandlers();
    this.initializePlugin();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private async initializePlugin(): Promise<void> {
    console.log('🚀 [PluginManager] Enhanced Plugin starting...');
    
    try {
      // Validate Figma environment
      this.validateFigmaEnvironment();
      
      // Show UI immediately
      this.showUI();
      
      // Set UI ready state
      this.messageRouter.sendMessage({ 
        type: 'plugin-ready',
        timestamp: Date.now()
      } as any);

      // Perform initial analysis with timeout
      await this.analyzeDesignSystemSafely();
      
      console.log('✅ [PluginManager] Plugin initialized successfully');
      
    } catch (error) {
      console.error('❌ [PluginManager] Initialization failed:', error);
      this.handleError(error, 'Plugin Initialization');
    }
  }

  private validateFigmaEnvironment(): void {
    if (typeof figma === 'undefined') {
      throw new FigmaAPIError('Figma API not available');
    }

    if (!figma.currentPage) {
      throw new FigmaAPIError('No current page available');
    }

    if (!figma.ui) {
      throw new FigmaAPIError('UI system not available');
    }
  }

  private showUI(): void {
    try {
      figma.showUI(__html__, { 
        width: this.config.UI_DIMENSIONS.width, 
        height: this.config.UI_DIMENSIONS.height,
        themeColors: true 
      });
    } catch (error) {
      throw new FigmaAPIError('Failed to show UI', { error });
    }
  }

  // ============================================================================
  // MESSAGE HANDLING SETUP
  // ============================================================================

  private setupMessageHandlers(): void {
    this.messageRouter.registerHandler('ui-ready', this.handleUIReady.bind(this));
    this.messageRouter.registerHandler('get-layers', this.handleGetLayers.bind(this));
    this.messageRouter.registerHandler('get-theme-file', this.handleGetThemeFile.bind(this));
    this.messageRouter.registerHandler('generate-react-native', this.handleGenerateReactNative.bind(this));
    this.messageRouter.registerHandler('reanalyze-design-system', this.handleReanalyzeDesignSystem.bind(this));
    this.messageRouter.registerHandler('select-layer', this.handleSelectLayer.bind(this));
    this.messageRouter.registerHandler('close', this.handleClose.bind(this));

    // Set up Figma's message listener
    figma.ui.onmessage = async (msg: any) => {
      if (!msg || typeof msg !== 'object') {
        console.warn('⚠️ [PluginManager] Invalid message received:', msg);
        return;
      }

      console.log(`📨 [PluginManager] Received message: ${msg.type}`);
      
      try {
        await this.messageRouter.handleMessage(msg as UIToPluginMessage);
      } catch (error) {
        console.error(`❌ [PluginManager] Error handling message ${msg.type}:`, error);
        this.handleError(error, `Message Handler: ${msg.type}`);
      }
    };
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  private async handleUIReady(): Promise<void> {
    try {
      const state = this.stateManager.getState();
      
      const message: DesignSystemAnalyzedMessage = {
        type: 'design-system-analyzed',
        data: {
          devices: state.devices,
          baseDevice: state.baseDevice,
          themeTokens: state.themeTokens,
          layers: state.currentLayers
        }
      };

      this.messageRouter.sendMessage(message);

      // Send any cached errors
      if (state.lastError) {
        this.sendErrorMessage(state.lastError);
      }
    } catch (error) {
      throw new FigmaAPIError('Failed to handle UI ready', { error });
    }
  }

  private async handleGetLayers(): Promise<void> {
    try {
      const layers = await this.getCurrentPageLayersSafely();
      
      const message: LayersDataMessage = {
        type: 'layers-data',
        data: layers
      };

      this.messageRouter.sendMessage(message);
    } catch (error) {
      throw new FigmaAPIError('Failed to get layers', { error });
    }
  }

  private async handleGetThemeFile(): Promise<void> {
    const state = this.stateManager.getState();
    
    if (!state.themeTokens || !state.baseDevice) {
      throw new GenerationError('Design system not analyzed yet. Please wait for analysis to complete.');
    }

    try {
      const themeFile = ThemeGenerator.generateThemeFile(state.themeTokens, state.baseDevice);
      
      const message: ThemeFileGeneratedMessage = {
        type: 'theme-file-generated',
        data: themeFile
      };

      this.messageRouter.sendMessage(message);
    } catch (error) {
      throw new GenerationError('Failed to generate theme file', { error });
    }
  }

  private async handleGenerateReactNative(message: { layerId: string; options: GenerationOptions }): Promise<void> {
    const { layerId, options } = message;
    const state = this.stateManager.getState();
    
    if (!state.isAnalyzed || !state.baseDevice) {
      throw new GenerationError('Design system not analyzed yet. Please wait for analysis to complete.');
    }

    if (!layerId) {
      throw new InvalidNodeError('No layer ID provided');
    }

    console.log(`🚀 [PluginManager] Generating React Native for layer: ${layerId}`);

    try {
      // Validate node exists and is accessible
      const node = await this.getNodeSafely(layerId);
      
      // Extract layer data with performance monitoring
      const layerData = await this.extractLayerDataSafely(node);
      
      // Create generation context
      const context = this.createGenerationContext(layerData, options, state);

      // Generate React Native component
      const generatedComponent = ReactNativeGenerator.generateComponent(layerData, context);
      
      if (!generatedComponent?.code) {
        throw new GenerationError('Failed to generate component code');
      }

      console.log(`✅ [PluginManager] Generated ${generatedComponent.code.length} characters of code`);
      
      const responseMessage: ReactNativeGeneratedMessage = {
        type: 'react-native-generated',
        data: generatedComponent.code
      };

      this.messageRouter.sendMessage(responseMessage);

    } catch (error) {
      if (error instanceof PluginError) {
        throw error;
      }
      throw new GenerationError('Failed to generate React Native code', { error, layerId });
    }
  }

  private async handleReanalyzeDesignSystem(): Promise<void> {
    this.stateManager.updateState(() => ({
      isAnalyzed: false,
      currentLayers: [],
      lastError: null
    }));

    await this.analyzeDesignSystemSafely();
    await this.handleUIReady();
  }

  private async handleSelectLayer(message: { layerId: string }): Promise<void> {
    const { layerId } = message;
    
    if (!layerId) {
      throw new InvalidNodeError('No layer ID provided');
    }

    try {
      const node = await this.getNodeSafely(layerId);
      
      if ('x' in node || 'children' in node) {
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
    } catch (error) {
      throw new InvalidNodeError('Layer not found or inaccessible', { layerId, error });
    }
  }

  private async handleClose(): Promise<void> {
    this.cleanup();
    figma.closePlugin();
  }

  // ============================================================================
  // DESIGN SYSTEM ANALYSIS
  // ============================================================================

  private async analyzeDesignSystemSafely(): Promise<void> {
    const operationId = 'analyze-design-system';
    
    try {
      await this.operationManager.executeWithTimeout(
        operationId,
        () => this.analyzeDesignSystem(),
        this.config.ANALYSIS_TIMEOUT_MS,
        (progress) => this.reportProgress('analysis', progress)
      );
    } catch (error) {
      if (error instanceof AnalysisTimeoutError) {
        throw error;
      }
      throw new FigmaAPIError('Design system analysis failed', { error });
    }
  }

  private async analyzeDesignSystem(): Promise<void> {
    console.log('🔍 [PluginManager] Analyzing design system...');
    
    this.stateManager.updateState(() => ({ 
      lastError: null,
      isProcessing: true,
      performanceMetrics: {
        nodesProcessed: 0,
        analysisStartTime: Date.now(),
        memoryUsage: 0
      }
    }));

    try {
      // 1. Device detection
      this.reportProgress('devices', 0.2);
      const devices = DeviceDetector.scanDocument();
      console.log(`📱 [PluginManager] Found ${devices.length} device types`);
      
      // 2. Base device selection
      this.reportProgress('base-device', 0.4);
      const baseDevice = DeviceDetector.selectBaseDevice(devices);
      console.log(`📐 [PluginManager] Base device: ${baseDevice?.name || 'fallback'}`);
      
      // 3. Theme token extraction
      this.reportProgress('theme-tokens', 0.6);
      const themeTokens = await this.extractThemeTokensSafely();
      
      // 4. Layer analysis
      this.reportProgress('layers', 0.8);
      const currentLayers = await this.getCurrentPageLayersSafely();
      console.log(`📋 [PluginManager] Found ${currentLayers.length} screen layers`);
      
      // Update state with results
      this.stateManager.updateState(() => ({
        devices,
        baseDevice,
        themeTokens,
        currentLayers,
        isAnalyzed: true,
        isProcessing: false,
        analysisProgress: null
      }));
      
      this.reportProgress('complete', 1.0);
      
    } catch (error) {
      this.stateManager.updateState(() => ({ 
        isProcessing: false,
        analysisProgress: null
      }));
      throw error;
    }
  }

  private async extractThemeTokensSafely(): Promise<ThemeTokens> {
    try {
      return ThemeGenerator.analyzeDesignSystem();
    } catch (error) {
      console.warn('⚠️ [PluginManager] Theme extraction failed, using fallback:', error);
      // Return empty theme tokens as fallback
      return {
        colors: [],
        typography: [],
        spacing: [],
        shadows: [],
        borderRadius: []
      };
    }
  }

  // ============================================================================
  // LAYER DATA EXTRACTION
  // ============================================================================

  private async getCurrentPageLayersSafely(): Promise<LayerData[]> {
    try {
      const currentPage = figma.currentPage;
      if (!currentPage) {
        throw new FigmaAPIError('No current page available');
      }

      // Filter for screen-like frames with performance limits
      const screenFrames = currentPage.children
        .filter(child => child.type === 'FRAME' && this.isScreenFrame(child))
        .slice(0, 50); // Limit for performance

      const layers: LayerData[] = [];
      
      for (const frame of screenFrames) {
        try {
          const layerData = await this.extractLayerDataSafely(frame);
          layers.push(layerData);
        } catch (error) {
          console.warn(`⚠️ [PluginManager] Error processing frame ${frame.name}:`, error);
          // Add error placeholder
          layers.push({
            id: frame.id,
            name: `${frame.name} (Error Loading)`,
            type: frame.type,
            visible: false,
            locked: false
          });
        }
      }

      return layers;
    } catch (error) {
      console.error('❌ [PluginManager] Error getting current page layers:', error);
      return [];
    }
  }

  private async extractLayerDataSafely(node: SceneNode): Promise<LayerData> {
    try {
      return await this.operationManager.executeWithTimeout(
        `extract-layer-${node.id}`,
        () => this.extractEnhancedLayerData(node, this.config.MAX_LAYER_DEPTH),
        5000 // 5 second timeout per layer
      );
    } catch (error) {
      if (error instanceof AnalysisTimeoutError) {
        throw new MemoryLimitError(`Layer ${node.name} is too complex to analyze`);
      }
      throw error;
    }
  }

  private async extractEnhancedLayerData(node: SceneNode, maxDepth: number = 3, currentDepth: number = 0): Promise<LayerData> {
    // Update performance metrics
    this.stateManager.updateState(state => ({
      performanceMetrics: {
        ...state.performanceMetrics,
        nodesProcessed: state.performanceMetrics.nodesProcessed + 1
      }
    }));

    // Check performance thresholds
    const state = this.stateManager.getState();
    if (state.performanceMetrics.nodesProcessed > this.config.PERFORMANCE_THRESHOLDS.maxNodes) {
      throw new MemoryLimitError('Too many nodes processed');
    }

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
    if (state.isAnalyzed) {
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
      const childrenToProcess = node.children.slice(0, this.config.MAX_CHILDREN_PER_LAYER);
      const children: LayerData[] = [];
      
      for (const child of childrenToProcess) {
        try {
          const childData = await this.extractEnhancedLayerData(child, maxDepth, currentDepth + 1);
          children.push(childData);
        } catch (error) {
          console.warn(`⚠️ [PluginManager] Error processing child node:`, error);
          children.push({
            id: child.id,
            name: child.name || 'Error Loading',
            type: child.type,
            visible: false,
            locked: false
          });
        }
      }
      
      layerData.children = children;
    }

    return layerData;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async getNodeSafely(nodeId: string): Promise<SceneNode> {
    try {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new InvalidNodeError(`Node with ID ${nodeId} not found`);
      }

      if (!('x' in node) && !('children' in node)) {
        throw new InvalidNodeError('Selected node is not a valid scene node');
      }

      return node as SceneNode;
    } catch (error) {
      if (error instanceof PluginError) {
        throw error;
      }
      throw new FigmaAPIError('Failed to access node', { nodeId, error });
    }
  }

  private extractNodePropertiesSafely(node: SceneNode): any {
    // Implementation similar to original but with better error handling
    const props: any = {};

    try {
      // Basic positioning - safe for all nodes
      if ('x' in node && typeof node.x === 'number') props.x = node.x;
      if ('y' in node && typeof node.y === 'number') props.y = node.y;
      if ('width' in node && typeof node.width === 'number') props.width = node.width;
      if ('height' in node && typeof node.height === 'number') props.height = node.height;

      // Layout properties for auto-layout frames
      if ('layoutMode' in node && node.layoutMode) {
        props.layoutMode = node.layoutMode;
        
        if ('itemSpacing' in node && typeof node.itemSpacing === 'number') {
          props.itemSpacing = node.itemSpacing;
        }
        
        // Padding properties
        ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].forEach(prop => {
          if (prop in node && typeof (node as any)[prop] === 'number') {
            props[prop] = (node as any)[prop];
          }
        });

        if ('primaryAxisAlignItems' in node) props.primaryAxisAlignItems = node.primaryAxisAlignItems;
        if ('counterAxisAlignItems' in node) props.counterAxisAlignItems = node.counterAxisAlignItems;
      }

      // Visual properties - using any to avoid type conflicts
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        props.fills = node.fills;
      }

      if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        props.strokes = node.strokes;
        if ('strokeWeight' in node && typeof node.strokeWeight === 'number') {
          props.strokeWeight = node.strokeWeight;
        }
      }

      // Corner radius with mixed handling
      if ('cornerRadius' in node && node.cornerRadius !== undefined && node.cornerRadius !== (figma as any).mixed) {
        if (typeof node.cornerRadius === 'number') {
          props.cornerRadius = node.cornerRadius;
        }
      }

      if ('effects' in node && node.effects && Array.isArray(node.effects)) {
        props.effects = node.effects;
      }

      // Opacity and rotation
      if ('opacity' in node && typeof node.opacity === 'number') {
        props.opacity = node.opacity;
      }

      if ('rotation' in node && typeof node.rotation === 'number') {
        props.rotation = node.rotation;
      }

      // Text properties for text nodes
      if (node.type === 'TEXT') {
        const textNode = node as any;
        
        if (typeof textNode.fontSize === 'number') {
          props.fontSize = textNode.fontSize;
        }
        
        if (textNode.fontName && textNode.fontName !== (figma as any).mixed && typeof textNode.fontName === 'object') {
          props.fontName = textNode.fontName;
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
        
        if (textNode.lineHeight && textNode.lineHeight !== (figma as any).mixed) {
          props.lineHeight = textNode.lineHeight;
        }
        
        if (textNode.letterSpacing && textNode.letterSpacing !== (figma as any).mixed) {
          props.letterSpacing = textNode.letterSpacing;
        }
      }

    } catch (error) {
      console.warn(`⚠️ [PluginManager] Error extracting properties for ${node.name}:`, error);
    }

    return props;
  }

  private getNodeDeviceInfo(node: SceneNode): DeviceInfo | null {
    try {
      if (node.type === 'FRAME') {
        const width = (node as any).width;
        const height = (node as any).height;
        
        const state = this.stateManager.getState();
        return state.devices.find(device => 
          Math.abs(device.width - width) <= 5 && Math.abs(device.height - height) <= 5
        ) || null;
      }
    } catch (error) {
      console.warn('⚠️ [PluginManager] Error getting device info:', error);
    }

    return null;
  }

  private isScreenFrame(frame: any): boolean {
    try {
      const width = frame.width;
      const height = frame.height;
      const name = frame.name.toLowerCase();

      // Check size constraints
      if (width < 200 || height < 300 || width > 3000 || height > 3000) {
        return false;
      }

      // Check if dimensions match detected devices
      const state = this.stateManager.getState();
      const matchesDevice = state.devices.some(device => 
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

  private createGenerationContext(layerData: LayerData, options: GenerationOptions, state: PluginState): any {
    if (!state.baseDevice) {
      throw new GenerationError('Base device not available');
    }

    return {
      baseDevice: state.baseDevice,
      themeTokens: state.themeTokens,
      options: options || this.getDefaultOptions(),
      componentName: this.sanitizeComponentName(layerData.name),
      usedComponents: new Set<string>(),
      imports: new Set<string>(),
      hooks: new Set<string>(),
      stateVariables: [] as string[]
    };
  }

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

  private sanitizeComponentName(name: string): string {
    if (!name || typeof name !== 'string') {
      return 'GeneratedComponent';
    }

    const sanitized = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^\d+/, '')
      .trim();
    
    if (!sanitized || sanitized.length === 0) {
      return 'GeneratedComponent';
    }

    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private handleError(error: any, context: string): void {
    let pluginError: PluginError;

    if (error instanceof PluginError) {
      pluginError = error;
    } else {
      pluginError = new FigmaAPIError(`${context}: ${error.message}`, { error, context });
    }

    console.error(`❌ [PluginManager] ${pluginError.message}`, pluginError);
    
    this.stateManager.updateState(() => ({ 
      lastError: pluginError,
      isProcessing: false,
      analysisProgress: null
    }));
    
    this.sendErrorMessage(pluginError);
  }

  private sendErrorMessage(error: PluginError): void {
    try {
      const message: ErrorMessage = {
        type: 'error',
        message: error.userMessage || error.message
      };
      this.messageRouter.sendMessage(message);
    } catch (sendError) {
      console.error('❌ [PluginManager] Error sending error message:', sendError);
    }
  }

  private reportProgress(step: string, progress: number): void {
    this.stateManager.updateState(() => ({
      analysisProgress: { step, progress }
    }));

    try {
      const message: AnalysisProgressMessage = {
        type: 'analysis-progress',
        data: { step, progress }
      };
      this.messageRouter.sendMessage(message);
    } catch (error) {
      console.warn('⚠️ [PluginManager] Failed to report progress:', error);
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    console.log('🔄 [PluginManager] Plugin cleaning up...');
    
    try {
      this.operationManager.cancelAllOperations();
      this.stateManager.reset();
      
      // Clear any listeners or timeouts
      // (Additional cleanup code would go here)
      
    } catch (error) {
      console.error('❌ [PluginManager] Error during cleanup:', error);
    }
  }
}