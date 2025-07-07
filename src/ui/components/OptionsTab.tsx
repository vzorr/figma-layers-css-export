// src/ui/components/OptionsTab.tsx
import React from 'react';
import { GenerationOptions } from '../../shared/types';

interface OptionsTabProps {
  options: GenerationOptions;
  onOptionsChange: (options: GenerationOptions) => void;
}

export const OptionsTab: React.FC<OptionsTabProps> = ({
  options,
  onOptionsChange
}) => {
  const updateOption = <K extends keyof GenerationOptions>(
    key: K,
    value: GenerationOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <div className="options-section">
      <h3>⚙️ Generation Options</h3>
      
      <div className="option-group">
        <h4>Code Generation</h4>
        <div className="options-grid">
          <label className="option-item">
            <input
              type="checkbox"
              checked={options.useTypeScript}
              onChange={(e) => updateOption('useTypeScript', e.target.checked)}
            />
            <span>TypeScript</span>
          </label>
          <label className="option-item">
            <input
              type="checkbox"
              checked={options.useResponsive}
              onChange={(e) => updateOption('useResponsive', e.target.checked)}
            />
            <span>Responsive</span>
          </label>
          <label className="option-item">
            <input
              type="checkbox"
              checked={options.useThemeTokens}
              onChange={(e) => updateOption('useThemeTokens', e.target.checked)}
            />
            <span>Theme Tokens</span>
          </label>
          <label className="option-item">
            <input
              type="checkbox"
              checked={options.includeNavigation}
              onChange={(e) => updateOption('includeNavigation', e.target.checked)}
            />
            <span>Navigation</span>
          </label>
        </div>
      </div>
      
      <div className="option-group">
        <h4>Component Type</h4>
        <select
          value={options.componentType}
          onChange={(e) => updateOption('componentType', e.target.value as GenerationOptions['componentType'])}
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
          onChange={(e) => updateOption('outputFormat', e.target.value as GenerationOptions['outputFormat'])}
          className="select-input"
        >
          <option value="single-file">Single File</option>
          <option value="separate-styles">Separate Styles</option>
        </select>
      </div>
    </div>
  );
};