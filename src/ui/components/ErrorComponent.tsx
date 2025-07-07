// src/ui/components/ErrorComponent.tsx
import React from 'react';

interface ErrorComponentProps {
  error: string;
  onRetry: () => void;
}

export const ErrorComponent: React.FC<ErrorComponentProps> = ({ error, onRetry }) => {
  return (
    <div className="error-container">
      <p className="error-message">❌ {error}</p>
      <button onClick={onRetry} className="btn btn-primary">
        Try Again
      </button>
    </div>
  );
};