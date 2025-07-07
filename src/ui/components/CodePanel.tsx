// src/ui/components/CodePanel.tsx
import React from 'react';

interface CodePanelProps {
  code: string;
  onBack: () => void;
  onCopy: () => void;
}

export const CodePanel: React.FC<CodePanelProps> = ({
  code,
  onBack,
  onCopy
}) => {
  return (
    <div className="code-panel">
      <div className="code-header">
        <h2>Generated Code</h2>
        <div className="code-actions">
          <button onClick={onCopy} className="btn btn-primary">
            📋 Copy
          </button>
          <button onClick={onBack} className="btn btn-secondary">
            ← Back
          </button>
        </div>
      </div>
      <div className="code-container">
        <pre className="code-output">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};