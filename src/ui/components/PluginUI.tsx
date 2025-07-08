// src/ui/components/PluginUI.tsx - Fixed Event Types and DOM Access
import React, { useState, useEffect } from 'react';
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
}

export const PluginUI: React.FC = () => {
  const [state, setState] = useState<PluginState>({
    devices: [],
    baseDevice: null,
    themeTokens: null,
    layers: [],
    selectedLayer: null,
    isLoading: true,
    error: null
  });

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [showCodePanel, setShowCodePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'layers' | 'options'>('overview');

  // Generation options
  const [options, setOptions] = useState<GenerationOptions>({
    useTypeScript: true,
    useResponsive: true,
    useThemeTokens: true,
    componentType: 'screen',
    includeNavigation: false,
    outputFormat: 'single-file'
  });

  useEffect(() => {
    console.log('🎨 [PluginUI] Component mounted');
    
    // Listen for messages from plugin
    const handleMessage = (event: MessageEvent) => {
      handlePluginMessage(event);
    };
    
    window.addEventListener('message', handleMessage);
    
    // Send ready signal to plugin
    sendMessage({ type: 'ui-ready' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handlePluginMessage = (event: MessageEvent) => {
    const message: PluginToUIMessage = event.data.pluginMessage;
    if (!message) return;

    console.log(`📨 [PluginUI] Received: ${message.type}`);

    switch (message.type) {
      case 'design-system-analyzed':
        setState(prev => ({
          ...prev,
          devices: message.data.devices,
          baseDevice: message.data.baseDevice,
          themeTokens: message.data.themeTokens,
          layers: message.data.layers,
          isLoading: false,
          error: null
        }));
        break;

      case 'layers-data':
        setState(prev => ({
          ...prev,
          layers: message.data,
          isLoading: false
        }));
        break;

      case 'theme-file-generated':
        setGeneratedCode(message.data);
        setShowCodePanel(true);
        break;

      case 'react-native-generated':
        setGeneratedCode(message.data);
        setShowCodePanel(true);
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          error: message.message,
          isLoading: false
        }));
        break;
    }
  };

  const sendMessage = (message: UIToPluginMessage) => {
    if (typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage({ pluginMessage: message }, '*');
    }
  };

  const handleLayerSelect = (layer: LayerData) => {
    setState(prev => ({ ...prev, selectedLayer: layer }));
    sendMessage({ type: 'select-layer', layerId: layer.id });
  };

  const handleGenerateTheme = () => {
    sendMessage({ type: 'get-theme-file' });
  };

  const handleGenerateReactNative = () => {
    if (!state.selectedLayer) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Please select a layer first');
      }
      return;
    }

    sendMessage({
      type: 'generate-react-native',
      layerId: state.selectedLayer.id,
      options
    });
  };

  const handleReanalyze = () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    sendMessage({ type: 'reanalyze-design-system' });
  };

  const copyToClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(generatedCode);
        console.log('✅ Code copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

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

  if (state.isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Analyzing design system...</p>
        <small>Detecting devices, extracting colors, and analyzing components...</small>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="error-container">
        <p className="error-message">❌ {state.error}</p>
        <button onClick={handleReanalyze} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="plugin-container">
      {!showCodePanel ? (
        // Main UI
        <div className="main-panel">
          {/* Header */}
          <div className="header">
            <h1>🎨 Figma → React Native</h1>
            <p>
              {state.devices.length} devices • {state.themeTokens?.colors.length || 0} colors • {state.layers.length} screens
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`tab ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              📋 Screens ({state.layers.length})
            </button>
            <button 
              className={`tab ${activeTab === 'options' ? 'active' : ''}`}
              onClick={() => setActiveTab('options')}
            >
              ⚙️ Options
            </button>
          </div>

          <div className="content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
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
                    >
                      📄 Generate Theme File
                    </button>
                    <button 
                      onClick={handleReanalyze}
                      className="btn btn-secondary"
                    >
                      🔄 Reanalyze Design
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Layers Tab */}
            {activeTab === 'layers' && (
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
            {activeTab === 'options' && (
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
              title="Generate theme file with extracted design tokens"
            >
              📄 Generate Theme
            </button>
            <button 
              onClick={handleGenerateReactNative}
              className="btn btn-primary"
              disabled={!state.selectedLayer}
              title="Generate React Native component from selected layer"
            >
              🚀 Generate Component
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
              <button onClick={() => setShowCodePanel(false)} className="btn btn-secondary">
                ← Back
              </button>
            </div>
          </div>
          <div className="code-container">
            <pre className="code-output">
              <code>{generatedCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};