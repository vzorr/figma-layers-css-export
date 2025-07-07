// src/ui/components/PluginUI.tsx
import React, { useState, useEffect } from 'react';
import { DeviceInfo, ThemeTokens, LayerData } from '../../shared/types';
import { 
  PluginToUIMessage, 
  UIToPluginMessage,
  GenerationOptions 
} from '../../shared/types/Messages';

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

  // Options for code generation
  const [options, setOptions] = useState<GenerationOptions>({
    useTypeScript: true,
    useResponsive: true,
    useThemeTokens: true,
    componentType: 'screen',
    includeNavigation: false,
    outputFormat: 'single-file'
  });

  useEffect(() => {
    console.log('🎨 [PluginUI.tsx:35] UI component mounted');
    
    // Listen for messages from plugin
    window.addEventListener('message', handlePluginMessage);
    
    // Send ready signal to plugin
    sendMessage({ type: 'ui-ready' });

    return () => {
      window.removeEventListener('message', handlePluginMessage);
    };
  }, []);

  const handlePluginMessage = (event: MessageEvent) => {
    const message: PluginToUIMessage = event.data.pluginMessage;
    if (!message) return;

    console.log(`📨 [PluginUI.tsx:50] Received: ${message.type}`);

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
    parent.postMessage({ pluginMessage: message }, '*');
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
      alert('Please select a layer first');
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
      await navigator.clipboard.writeText(generatedCode);
      alert('Code copied to clipboard!');
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
              Found {state.devices.length} devices, {state.themeTokens?.colors.length || 0} colors
            </p>
          </div>

          {/* Device Summary */}
          {state.devices.length > 0 && (
            <div className="device-summary">
              <h3>📱 Detected Devices</h3>
              <div className="device-list">
                {state.devices.map(device => (
                  <div key={device.id} className={`device-item ${device.isBaseDevice ? 'base' : ''}`}>
                    <span>{device.name}</span>
                    <span>{device.width}×{device.height}</span>
                    {device.isBaseDevice && <span className="base-badge">BASE</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theme Summary */}
          {state.themeTokens && (
            <div className="theme-summary">
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
            </div>
          )}

          {/* Layer Tree */}
          <div className="layers-section">
            <h3>📋 Screens & Components</h3>
            <div className="layers-tree">
              {state.layers.length > 0 ? (
                renderLayerTree(state.layers)
              ) : (
                <p className="no-layers">No screen frames found. Create frames with device dimensions.</p>
              )}
            </div>
          </div>

          {/* Generation Options */}
          <div className="options-section">
            <h3>⚙️ Generation Options</h3>
            <div className="options-grid">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={options.useTypeScript}
                  onChange={(e) => setOptions(prev => ({ ...prev, useTypeScript: e.target.checked }))}
                />
                <span>TypeScript</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={options.useResponsive}
                  onChange={(e) => setOptions(prev => ({ ...prev, useResponsive: e.target.checked }))}
                />
                <span>Responsive</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={options.useThemeTokens}
                  onChange={(e) => setOptions(prev => ({ ...prev, useThemeTokens: e.target.checked }))}
                />
                <span>Theme Tokens</span>
              </label>
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={options.includeNavigation}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeNavigation: e.target.checked }))}
                />
                <span>Navigation</span>
              </label>
            </div>
            
            <div className="component-type">
              <label>Component Type:</label>
              <select
                value={options.componentType}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  componentType: e.target.value as GenerationOptions['componentType']
                }))}
              >
                <option value="screen">Full Screen</option>
                <option value="component">Reusable Component</option>
                <option value="section">Section Component</option>
              </select>
            </div>
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

          {/* Footer */}
          <div className="footer">
            <button onClick={handleReanalyze} className="btn btn-link">
              🔄 Reanalyze Design System
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