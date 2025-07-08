// src/ui/components/PluginUI.tsx - Complete Fixed Version
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  DeviceInfo, 
  ThemeTokens, 
  LayerData,
  GenerationOptions,
  PluginToUIMessage,
  UIToPluginMessage 
} from '../../shared/types';

interface PluginState {
  devices: DeviceInfo[];
  baseDevice: DeviceInfo | null;
  themeTokens: ThemeTokens | null;
  layers: LayerData[];
  selectedLayer: LayerData | null;
  isLoading: boolean;
  error: string | null;
  analysisProgress: {
    step: string;
    progress: number;
  } | null;
}

interface UIState {
  activeTab: 'overview' | 'layers' | 'options';
  showCodePanel: boolean;
  generatedCode: string;
  isGenerating: boolean;
  lastGenerationTime: number | null;
  connectionStatus: 'connecting' | 'connected' | 'error';
}

export const PluginUI: React.FC = () => {
  const [state, setState] = useState<PluginState>({
    devices: [],
    baseDevice: null,
    themeTokens: null,
    layers: [],
    selectedLayer: null,
    isLoading: true,
    error: null,
    analysisProgress: null
  });

  const [uiState, setUIState] = useState<UIState>({
    activeTab: 'overview',
    showCodePanel: false,
    generatedCode: '',
    isGenerating: false,
    lastGenerationTime: null,
    connectionStatus: 'connecting'
  });

  // FIXED: Use in-memory state only (no localStorage in Figma plugins)
  const [options, setOptions] = useState<GenerationOptions>({
    useTypeScript: true,
    useResponsive: true,
    useThemeTokens: true,
    componentType: 'screen',
    includeNavigation: false,
    outputFormat: 'single-file'
  });

  // FIXED: Correct timeout type for browser environment
  const messageTimeoutRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    console.log('🎨 [PluginUI] Component mounted');
    
    // Set up message listener
    const handleMessage = (event: MessageEvent) => {
      handlePluginMessage(event);
    };
    
    window.addEventListener('message', handleMessage);
    
    // Send ready signal with timeout
    sendMessageWithTimeout({ type: 'ui-ready' });

    // Set up connection timeout
    const connectionTimeout = window.setTimeout(() => {
      if (uiState.connectionStatus === 'connecting') {
        setState(prev => ({ 
          ...prev, 
          error: 'Failed to connect to plugin backend. Please try refreshing.',
          isLoading: false 
        }));
        setUIState(prev => ({ ...prev, connectionStatus: 'error' }));
      }
    }, 10000);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.clearTimeout(connectionTimeout);
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []); // FIXED: Remove uiState.connectionStatus dependency to prevent infinite loops

  const handlePluginMessage = useCallback((event: MessageEvent) => {
    const message: PluginToUIMessage = event.data.pluginMessage;
    if (!message) return;

    console.log(`📨 [PluginUI] Received: ${message.type}`);

    // Clear any pending timeouts
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }

    // Update connection status
    setUIState(prev => {
      if (prev.connectionStatus !== 'connected') {
        return { ...prev, connectionStatus: 'connected' };
      }
      return prev;
    });

    switch (message.type) {
      case 'design-system-analyzed':
        handleDesignSystemAnalyzed(message.data);
        break;

      case 'layers-data':
        setState(prev => ({
          ...prev,
          layers: Array.isArray(message.data) ? message.data : [],
          isLoading: false,
          error: null
        }));
        break;

      case 'theme-file-generated':
        handleThemeFileGenerated(message.data);
        break;

      case 'react-native-generated':
        handleReactNativeGenerated(message.data);
        break;

      case 'analysis-progress':
        handleAnalysisProgress(message.data);
        break;

      case 'error':
        handleError(message.message);
        break;

      default:
        console.warn(`⚠️ [PluginUI] Unknown message type: ${(message as any).type}`);
    }
  }, []);

  const handleDesignSystemAnalyzed = (data: any) => {
    try {
      setState(prev => ({
        ...prev,
        devices: Array.isArray(data.devices) ? data.devices : [],
        baseDevice: data.baseDevice || null,
        themeTokens: data.themeTokens || null,
        layers: Array.isArray(data.layers) ? data.layers : [],
        isLoading: false,
        error: null,
        analysisProgress: null
      }));
      
      // Reset retry counter on success
      retryCountRef.current = 0;
    } catch (error) {
      console.error('Error processing design system data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to process design system data',
        isLoading: false
      }));
    }
  };

  const handleThemeFileGenerated = (data: string) => {
    if (typeof data === 'string' && data.length > 0) {
      setUIState(prev => ({
        ...prev,
        generatedCode: data,
        showCodePanel: true,
        isGenerating: false
      }));
    } else {
      handleError('Generated theme file is empty or invalid');
    }
  };

  const handleReactNativeGenerated = (data: string) => {
    if (typeof data === 'string' && data.length > 0) {
      setUIState(prev => ({
        ...prev,
        generatedCode: data,
        showCodePanel: true,
        isGenerating: false,
        lastGenerationTime: Date.now()
      }));
    } else {
      handleError('Generated React Native code is empty or invalid');
    }
  };

  const handleAnalysisProgress = (data: any) => {
    try {
      if (data && typeof data.step === 'string' && typeof data.progress === 'number') {
        setState(prev => ({
          ...prev,
          analysisProgress: {
            step: data.step,
            progress: Math.max(0, Math.min(1, data.progress))
          }
        }));
      }
    } catch (error) {
      console.warn('Error processing analysis progress:', error);
    }
  };

  const handleError = (message: string) => {
    console.error('Plugin error:', message);
    setState(prev => ({
      ...prev,
      error: message,
      isLoading: false,
      analysisProgress: null
    }));
    setUIState(prev => ({
      ...prev,
      isGenerating: false
    }));
  };

  const sendMessage = useCallback((message: UIToPluginMessage) => {
    try {
      if (typeof window !== 'undefined' && window.parent) {
        window.parent.postMessage({ pluginMessage: message }, '*');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      handleError('Failed to communicate with plugin backend');
    }
  }, []);

  const sendMessageWithTimeout = useCallback((message: UIToPluginMessage, timeout: number = 5000) => {
    sendMessage(message);
    
    // Set up timeout for critical messages
    if (['ui-ready', 'get-layers', 'generate-react-native'].includes(message.type)) {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      messageTimeoutRef.current = window.setTimeout(() => {
        console.warn(`Message ${message.type} timed out`);
        if (message.type === 'ui-ready') {
          handleError('Plugin initialization timed out. Please try refreshing.');
        }
      }, timeout);
    }
  }, [sendMessage]);

  const handleLayerSelect = useCallback((layer: LayerData) => {
    if (!layer || !layer.id) {
      console.warn('Invalid layer selected');
      return;
    }

    setState(prev => ({ ...prev, selectedLayer: layer }));
    sendMessage({ type: 'select-layer', layerId: layer.id });
  }, [sendMessage]);

  const handleGenerateTheme = useCallback(() => {
    if (uiState.isGenerating) return;
    
    setUIState(prev => ({ ...prev, isGenerating: true }));
    sendMessageWithTimeout({ type: 'get-theme-file' });
  }, [uiState.isGenerating, sendMessageWithTimeout]);

  const handleGenerateReactNative = useCallback(() => {
    if (!state.selectedLayer) {
      handleError('Please select a layer first');
      return;
    }

    if (uiState.isGenerating) return;

    setUIState(prev => ({ ...prev, isGenerating: true }));
    sendMessageWithTimeout({
      type: 'generate-react-native',
      layerId: state.selectedLayer.id,
      options
    });
  }, [state.selectedLayer, options, uiState.isGenerating, sendMessageWithTimeout]);

  const handleReanalyze = useCallback(() => {
    if (state.isLoading) return;

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      analysisProgress: { step: 'Starting analysis...', progress: 0 } 
    }));
    retryCountRef.current = 0;
    sendMessageWithTimeout({ type: 'reanalyze-design-system' });
  }, [state.isLoading, sendMessageWithTimeout]);

  const handleRetry = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      handleError('Maximum retry attempts reached. Please refresh the plugin.');
      return;
    }

    retryCountRef.current++;
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      analysisProgress: { step: 'Retrying...', progress: 0 }
    }));
    sendMessageWithTimeout({ type: 'ui-ready' });
  }, [sendMessageWithTimeout]);

  const copyToClipboard = useCallback(async () => {
    if (!uiState.generatedCode) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(uiState.generatedCode);
        console.log('✅ Code copied to clipboard');
        // Show success feedback
        const originalText = uiState.generatedCode;
        setUIState(prev => ({ ...prev, generatedCode: '✅ Copied!' }));
        setTimeout(() => {
          setUIState(prev => ({ ...prev, generatedCode: originalText }));
        }, 1000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = uiState.generatedCode;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        console.log('✅ Code copied to clipboard (fallback)');
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      handleError('Failed to copy to clipboard');
    }
  }, [uiState.generatedCode]);

  const downloadCode = useCallback(() => {
    if (!uiState.generatedCode) return;

    try {
      const blob = new Blob([uiState.generatedCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.selectedLayer?.name || 'Component'}.${options.useTypeScript ? 'tsx' : 'jsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download:', error);
      handleError('Failed to download file');
    }
  }, [uiState.generatedCode, state.selectedLayer, options.useTypeScript]);

  const renderLayerTree = (layers: LayerData[], depth = 0): React.ReactNode => {
    return layers.map(layer => (
      <div key={layer.id} style={{ marginLeft: depth * 16 }}>
        <div
          className={`layer-item ${state.selectedLayer?.id === layer.id ? 'selected' : ''}`}
          onClick={() => handleLayerSelect(layer)}
        >
          <span className="layer-icon">{getLayerIcon(layer.type)}</span>
          <span className="layer-name">{layer.name}</span>
          <span className="layer-type">{layer.type}</span>
          {layer.componentPattern && (
            <span className="pattern-badge">
              {layer.componentPattern.type} ({Math.round(layer.componentPattern.confidence * 100)}%)
            </span>
          )}
          {layer.deviceInfo && (
            <span className="device-badge">{layer.deviceInfo.category}</span>
          )}
        </div>
        {layer.children && renderLayerTree(layer.children, depth + 1)}
      </div>
    ));
  };

  const getLayerIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'PAGE': '📄',
      'FRAME': '🟦',
      'COMPONENT': '🧩',
      'INSTANCE': '📱',
      'TEXT': '📝',
      'RECTANGLE': '⬜',
      'ELLIPSE': '⭕',
      'IMAGE': '🖼️',
      'GROUP': '📁'
    };
    return icons[type] || '⚪';
  };

  const getProgressStepText = (step: string): string => {
    const stepTexts: Record<string, string> = {
      'devices': 'Detecting device types...',
      'base-device': 'Selecting base device...',
      'theme-tokens': 'Extracting design tokens...',
      'layers': 'Analyzing layers...',
      'complete': 'Analysis complete!'
    };
    return stepTexts[step] || step;
  };

  // Loading state with progress
  if (state.isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        {state.analysisProgress ? (
          <>
            <p>{getProgressStepText(state.analysisProgress.step)}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${state.analysisProgress.progress * 100}%` }}
              />
            </div>
            <small>{Math.round(state.analysisProgress.progress * 100)}% complete</small>
          </>
        ) : (
          <>
            <p>Analyzing design system...</p>
            <small>Detecting devices, extracting colors, and analyzing components...</small>
          </>
        )}
      </div>
    );
  }

  // Error state with retry
  if (state.error) {
    return (
      <div className="error-container">
        <p className="error-message">❌ {state.error}</p>
        <div className="error-actions">
          <button onClick={handleRetry} className="btn btn-primary">
            🔄 Retry ({retryCountRef.current}/{maxRetries})
          </button>
          <button onClick={() => window.location.reload()} className="btn btn-secondary">
            🔄 Refresh Plugin
          </button>
        </div>
        {retryCountRef.current >= maxRetries && (
          <small className="error-help">
            If this problem persists, try closing and reopening the plugin.
          </small>
        )}
      </div>
    );
  }

  return (
    <div className="plugin-container">
      {!uiState.showCodePanel ? (
        // Main UI
        <div className="main-panel">
          {/* Header with connection status */}
          <div className="header">
            <div className="header-main">
              <h1>🎨 Figma → React Native</h1>
              <div className={`connection-status ${uiState.connectionStatus}`}>
                {uiState.connectionStatus === 'connected' && '🟢'}
                {uiState.connectionStatus === 'connecting' && '🟡'}
                {uiState.connectionStatus === 'error' && '🔴'}
              </div>
            </div>
            <p>
              {state.devices.length} devices • {state.themeTokens?.colors.length || 0} colors • {state.layers.length} screens
              {uiState.lastGenerationTime && (
                <> • Last generated: {new Date(uiState.lastGenerationTime).toLocaleTimeString()}</>
              )}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${uiState.activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setUIState(prev => ({ ...prev, activeTab: 'overview' }))}
            >
              📊 Overview
            </button>
            <button 
              className={`tab ${uiState.activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setUIState(prev => ({ ...prev, activeTab: 'layers' }))}
            >
              📋 Screens ({state.layers.length})
            </button>
            <button 
              className={`tab ${uiState.activeTab === 'options' ? 'active' : ''}`}
              onClick={() => setUIState(prev => ({ ...prev, activeTab: 'options' }))}
            >
              ⚙️ Options
            </button>
          </div>

          <div className="content">
            {/* Overview Tab */}
            {uiState.activeTab === 'overview' && (
              <div className="overview-section">
                {/* Device Summary */}
                {state.devices.length > 0 && (
                  <div className="summary-card">
                    <h3>📱 Detected Devices</h3>
                    <div className="device-list">
                      {state.devices.map(device => (
                        <div key={device.id} className={`device-item ${device.isBaseDevice ? 'base' : ''}`}>
                          <span className="device-name">{device.name}</span>
                          <span className="device-size">{device.width}×{device.height}</span>
                          <span className={`device-type ${device.type}`}>{device.category.replace('_', ' ')}</span>
                          {device.isBaseDevice && <span className="base-badge">BASE</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Theme Summary */}
                {state.themeTokens && (
                  <div className="summary-card">
                    <h3>🎨 Design System</h3>
                    <div className="token-stats">
                      <div className="token-stat">
                        <span className="count">{state.themeTokens.colors.length}</span>
                        <span className="label">Colors</span>
                      </div>
                      <div className="token-stat">
                        <span className="count">{state.themeTokens.typography.length}</span>
                        <span className="label">Typography</span>
                      </div>
                      <div className="token-stat">
                        <span className="count">{state.themeTokens.spacing.length}</span>
                        <span className="label">Spacing</span>
                      </div>
                    </div>

                    {/* Color Preview */}
                    <div className="color-preview">
                      {state.themeTokens.colors.slice(0, 8).map(color => (
                        <div 
                          key={color.name} 
                          className="color-chip"
                          style={{ backgroundColor: color.value }}
                          title={`${color.name}: ${color.value}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="summary-card">
                  <h3>🚀 Quick Actions</h3>
                  <div className="quick-actions">
                    <button 
                      onClick={handleGenerateTheme}
                      className="btn btn-secondary"
                      disabled={uiState.isGenerating}
                    >
                      {uiState.isGenerating ? '⏳ Generating...' : '📄 Generate Theme File'}
                    </button>
                    <button 
                      onClick={handleReanalyze}
                      className="btn btn-secondary"
                      disabled={state.isLoading}
                    >
                      🔄 Reanalyze Design
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Layers Tab */}
            {uiState.activeTab === 'layers' && (
              <div className="layers-section">
                <div className="section-header">
                  <h3>📋 Screens & Components</h3>
                  {state.selectedLayer && (
                    <span className="selected-info">
                      Selected: {state.selectedLayer.name}
                    </span>
                  )}
                </div>
                
                <div className="layers-tree">
                  {state.layers.length > 0 ? (
                    renderLayerTree(state.layers)
                  ) : (
                    <div className="no-layers">
                      <p>No screen frames found.</p>
                      <p>Create frames with device dimensions to get started.</p>
                    </div>
                  )}
                </div>

                {state.selectedLayer && (
                  <div className="layer-details">
                    <h4>📝 Layer Details</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Type:</span>
                        <span className="value">{state.selectedLayer.type}</span>
                      </div>
                      {state.selectedLayer.componentPattern && (
                        <div className="detail-item">
                          <span className="label">Pattern:</span>
                          <span className="value">
                            {state.selectedLayer.componentPattern.type} 
                            ({Math.round(state.selectedLayer.componentPattern.confidence * 100)}%)
                          </span>
                        </div>
                      )}
                      {state.selectedLayer.properties?.width && (
                        <div className="detail-item">
                          <span className="label">Size:</span>
                          <span className="value">
                            {Math.round(state.selectedLayer.properties.width)}×{Math.round(state.selectedLayer.properties.height || 0)}
                          </span>
                        </div>
                      )}
                      {state.selectedLayer.children && (
                        <div className="detail-item">
                          <span className="label">Children:</span>
                          <span className="value">{state.selectedLayer.children.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Options Tab */}
            {uiState.activeTab === 'options' && (
              <div className="options-section">
                <h3>⚙️ Generation Options</h3>
                
                <div className="option-group">
                  <h4>Code Generation</h4>
                  <div className="options-grid">
                    <label className="option-item">
                      <input
                        type="checkbox"
                        checked={options.useTypeScript}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptions(prev => ({ ...prev, useTypeScript: e.target.checked }))}
                      />
                      <span>TypeScript</span>
                    </label>
                    <label className="option-item">
                      <input
                        type="checkbox"
                        checked={options.useResponsive}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptions(prev => ({ ...prev, useResponsive: e.target.checked }))}
                      />
                      <span>Responsive</span>
                    </label>
                    <label className="option-item">
                      <input
                        type="checkbox"
                        checked={options.useThemeTokens}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptions(prev => ({ ...prev, useThemeTokens: e.target.checked }))}
                      />
                      <span>Theme Tokens</span>
                    </label>
                    <label className="option-item">
                      <input
                        type="checkbox"
                        checked={options.includeNavigation}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptions(prev => ({ ...prev, includeNavigation: e.target.checked }))}
                      />
                      <span>Navigation</span>
                    </label>
                  </div>
                </div>
                
                <div className="option-group">
                  <h4>Component Type</h4>
                  <select
                    value={options.componentType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOptions(prev => ({ 
                      ...prev, 
                      componentType: e.target.value as GenerationOptions['componentType']
                    }))}
                    className="select-input"
                  >
                    <option value="screen">Full Screen Component</option>
                    <option value="component">Reusable Component</option>
                    <option value="section">Section Component</option>
                  </select>
                </div>

                <div className="option-group">
                  <h4>Output Format</h4>
                  <select
                    value={options.outputFormat}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOptions(prev => ({ 
                      ...prev, 
                      outputFormat: e.target.value as GenerationOptions['outputFormat']
                    }))}
                    className="select-input"
                  >
                    <option value="single-file">Single File</option>
                    <option value="separate-styles">Separate Styles</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="actions">
            <button 
              onClick={handleGenerateTheme}
              className="btn btn-secondary"
              disabled={uiState.isGenerating}
              title="Generate theme file with extracted design tokens"
            >
              {uiState.isGenerating ? '⏳' : '📄'} Generate Theme
            </button>
            <button 
              onClick={handleGenerateReactNative}
              className="btn btn-primary"
              disabled={!state.selectedLayer || uiState.isGenerating}
              title="Generate React Native component from selected layer"
            >
              {uiState.isGenerating ? '⏳ Generating...' : '🚀 Generate Component'}
            </button>
          </div>
        </div>
      ) : (
        // Code Panel
        <div className="code-panel">
          <div className="code-header">
            <h2>Generated Code</h2>
            <div className="code-actions">
              <button onClick={copyToClipboard} className="btn btn-primary">
                📋 Copy
              </button>
              <button onClick={downloadCode} className="btn btn-secondary">
                💾 Download
              </button>
              <button onClick={() => setUIState(prev => ({ ...prev, showCodePanel: false }))} className="btn btn-secondary">
                ← Back
              </button>
            </div>
          </div>
          <div className="code-container">
            <pre className="code-output">
              <code>{uiState.generatedCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};