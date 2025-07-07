// src/ui/components/ActionButtons.tsx
import React from 'react';

interface ActionButtonsProps {
  onGenerateTheme: () => void;
  onGenerateReactNative: () => void;
  isGenerateDisabled: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onGenerateTheme,
  onGenerateReactNative,
  isGenerateDisabled
}) => {
  return (
    <div className="actions">
      <button 
        onClick={onGenerateTheme}
        className="btn btn-secondary"
        title="Generate theme file with extracted design tokens"
      >
        📄 Generate Theme
      </button>
      <button 
        onClick={onGenerateReactNative}
        className="btn btn-primary"
        disabled={isGenerateDisabled}
        title="Generate React Native component from selected layer"
      >
        🚀 Generate Component
      </button>
    </div>
  );
};