// src/ui/components/OverviewTab.tsx
import React from 'react';
import { DeviceInfo, ThemeTokens } from '../../shared/types';

interface OverviewTabProps {
  devices: DeviceInfo[];
  themeTokens: ThemeTokens | null;
  onGenerateTheme: () => void;
  onReanalyze: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  devices,
  themeTokens,
  onGenerateTheme,
  onReanalyze
}) => {
  return (
    <div className="overview-section">
      {/* Device Summary */}
      {devices.length > 0 && (
        <div className="summary-card">
          <h3>📱 Detected Devices</h3>
          <div className="device-list">
            {devices.map(device => (
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
      {themeTokens && (
        <div className="summary-card">
          <h3>🎨 Design System</h3>
          <div className="token-stats">
            <div className="token-stat">
              <span className="count">{themeTokens.colors.length}</span>
              <span className="label">Colors</span>
            </div>
            <div className="token-stat">
              <span className="count">{themeTokens.typography.length}</span>
              <span className="label">Typography</span>
            </div>
            <div className="token-stat">
              <span className="count">{themeTokens.spacing.length}</span>
              <span className="label">Spacing</span>
            </div>
          </div>

          {/* Color Preview */}
          <div className="color-preview">
            {themeTokens.colors.slice(0, 8).map(color => (
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
            onClick={onGenerateTheme}
            className="btn btn-secondary"
          >
            📄 Generate Theme File
          </button>
          <button 
            onClick={onReanalyze}
            className="btn btn-secondary"
          >
            🔄 Reanalyze Design
          </button>
        </div>
      </div>
    </div>
  );
};