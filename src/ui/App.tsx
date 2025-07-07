// src/ui/App.tsx - UI entry point
import React, { useState, useEffect, useCallback } from 'react';
import './styles/global.css';

interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  category: 'small_phone' | 'normal_phone' | 'large_phone' | 'tablet' | 'desktop';
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape';
  isBaseDevice: boolean;
}

interface ThemeTokens {
  colors: Array<{ name: string; value: string; usage: string }>;
  typography: Array<{ name: string; fontFamily: string; fontSize: number; fontWeight: string; usage: string }>;
  spacing: Array<{ name: string; value: number; usage: string }>;
  shadows: any[];
  borderRadius: any[];
}

const App: React.FC = () => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [baseDevice, setBaseDevice] = useState<DeviceInfo | null>(null);
  const [themeTokens, setThemeTokens] = useState<ThemeTokens | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'theme' | 'code'>('devices');

  // Handle messages from plugin
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data.pluginMessage || {};
      
      console.log(`📨 [App.tsx:34] Received: ${type}`, payload);
      
      switch (type) {
        case 'INITIALIZATION_COMPLETE':
          setDevices(payload.devices);
          setBaseDevice(payload.baseDevice);
          setThemeTokens(payload.themeTokens);
          setIsLoading(false);
          break;
          
        case 'THEME_GENERATED':
          setGeneratedCode(payload.code);
          setActiveTab('code');
          break;
          
        case 'DEVICES_UPDATED':
          setDevices(payload.devices);
          setBaseDevice(payload.baseDevice);
          break;
          
        case 'BASE_DEVICE_UPDATED':
          setBaseDevice(payload.baseDevice);
          break;
          
        case 'EXPORT_READY':
          copyToClipboard(payload.code);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendMessage = useCallback((type: string, payload?: any) => {
    parent.postMessage({
      pluginMessage: { type, payload }
    }, '*');
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('✅ Code copied to clipboard');
    } catch (err) {
      console.error('❌ Failed to copy:', err);
    }
  };

  const handleGenerateTheme = () => {
    sendMessage('GENERATE_THEME');
  };

  const handleRescanDevices = () => {
    sendMessage('RESCAN_DEVICES');
  };

  const handleSelectBaseDevice = (deviceId: string) => {
    sendMessage('SELECT_BASE_DEVICE', { deviceId });
  };

  const handleExportTheme = () => {
    sendMessage('EXPORT_THEME', { format: 'javascript' });
  };

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Analyzing your Figma design...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1>📱 Figma → React Native</h1>
        <button 
          className="btn-primary" 
          onClick={handleGenerateTheme}
        >
          Generate Theme
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          Devices ({devices.length})
        </button>
        <button 
          className={`tab ${activeTab === 'theme' ? 'active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          Theme
        </button>
        <button 
          className={`tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
      </div>

      <div className="content">
        {activeTab === 'devices' && (
          <div className="devices-section">
            <div className="section-header">
              <h3>🔍 Detected Devices</h3>
              <button className="btn-secondary" onClick={handleRescanDevices}>
                Rescan
              </button>
            </div>
            
            <div className="devices-grid">
              {devices.map(device => (
                <div 
                  key={device.id} 
                  className={`device-card ${device.isBaseDevice ? 'base-device' : ''}`}
                  onClick={() => handleSelectBaseDevice(device.id)}
                >
                  <div className="device-info">
                    <h4>{device.name}</h4>
                    <p className="device-dimensions">{device.width} × {device.height}</p>
                    <span className={`device-type ${device.type}`}>
                      {device.category.replace('_', ' ')}
                    </span>
                  </div>
                  {device.isBaseDevice && (
                    <div className="base-badge">Base Device</div>
                  )}
                </div>
              ))}
            </div>
            
            {devices.length === 0 && (
              <div className="empty-state">
                <p>No devices detected in your Figma file.</p>
                <p>Create frames with common device dimensions to get started.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'theme' && themeTokens && (
          <div className="theme-section">
            <h3>🎨 Design System Tokens</h3>
            
            <div className="token-section">
              <h4>Colors ({themeTokens.colors.length})</h4>
              <div className="color-grid">
                {themeTokens.colors.map(color => (
                  <div key={color.name} className="color-item">
                    <div 
                      className="color-swatch" 
                      style={{ backgroundColor: color.value }}
                    />
                    <div className="color-info">
                      <span className="color-name">{color.name}</span>
                      <span className="color-value">{color.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="token-section">
              <h4>Typography ({themeTokens.typography.length})</h4>
              <div className="typography-list">
                {themeTokens.typography.map(typo => (
                  <div key={typo.name} className="typography-item">
                    <span className="typo-name">{typo.name}</span>
                    <span className="typo-details">
                      {typo.fontSize}px · {typo.fontWeight} · {typo.fontFamily}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="token-section">
              <h4>Spacing ({themeTokens.spacing.length})</h4>
              <div className="spacing-list">
                {themeTokens.spacing.map(spacing => (
                  <div key={spacing.name} className="spacing-item">
                    <span className="spacing-name">{spacing.name}</span>
                    <span className="spacing-value">{spacing.value}px</span>
                    <div 
                      className="spacing-visual" 
                      style={{ width: `${Math.min(spacing.value, 100)}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="code-section">
            <div className="section-header">
              <h3>📋 Generated Theme Code</h3>
              <div className="code-actions">
                <button className="btn-secondary" onClick={() => copyToClipboard(generatedCode)}>
                  Copy
                </button>
                <button className="btn-primary" onClick={handleExportTheme}>
                  Export
                </button>
              </div>
            </div>
            
            {generatedCode ? (
              <div className="code-editor">
                <pre>
                  <code>{generatedCode}</code>
                </pre>
              </div>
            ) : (
              <div className="empty-state">
                <p>Click "Generate Theme" to create your React Native theme code.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {baseDevice && (
        <div className="footer">
          <small>Base Device: {baseDevice.name} ({baseDevice.width}×{baseDevice.height})</small>
        </div>
      )}
    </div>
  );
};

export default App;