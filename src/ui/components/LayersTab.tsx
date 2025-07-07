// src/ui/components/LayersTab.tsx
import React from 'react';
import { LayerData } from '../../shared/types';

interface LayersTabProps {
  layers: LayerData[];
  selectedLayer: LayerData | null;
  onLayerSelect: (layer: LayerData) => void;
}

export const LayersTab: React.FC<LayersTabProps> = ({
  layers,
  selectedLayer,
  onLayerSelect
}) => {
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

  const renderLayerTree = (layers: LayerData[], depth = 0): React.ReactNode => {
    return layers.map(layer => (
      <div key={layer.id} style={{ marginLeft: depth * 16 }}>
        <div
          className={`layer-item ${selectedLayer?.id === layer.id ? 'selected' : ''}`}
          onClick={() => onLayerSelect(layer)}
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

  return (
    <div className="layers-section">
      <div className="section-header">
        <h3>📋 Screens & Components</h3>
        {selectedLayer && (
          <span className="selected-info">
            Selected: {selectedLayer.name}
          </span>
        )}
      </div>
      
      <div className="layers-tree">
        {layers.length > 0 ? (
          renderLayerTree(layers)
        ) : (
          <div className="no-layers">
            <p>No screen frames found.</p>
            <p>Create frames with device dimensions to get started.</p>
          </div>
        )}
      </div>

      {selectedLayer && (
        <div className="layer-details">
          <h4>📝 Layer Details</h4>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">Type:</span>
              <span className="value">{selectedLayer.type}</span>
            </div>
            {selectedLayer.componentPattern && (
              <div className="detail-item">
                <span className="label">Pattern:</span>
                <span className="value">
                  {selectedLayer.componentPattern.type} 
                  ({Math.round(selectedLayer.componentPattern.confidence * 100)}%)
                </span>
              </div>
            )}
            {selectedLayer.properties?.width && (
              <div className="detail-item">
                <span className="label">Size:</span>
                <span className="value">
                  {Math.round(selectedLayer.properties.width)}×{Math.round(selectedLayer.properties.height || 0)}
                </span>
              </div>
            )}
            {selectedLayer.children && (
              <div className="detail-item">
                <span className="label">Children:</span>
                <span className="value">{selectedLayer.children.length}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};