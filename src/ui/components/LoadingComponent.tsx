// src/ui/components/LoadingComponent.tsx
import React from 'react';

export const LoadingComponent: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Analyzing design system...</p>
      <small>Detecting devices, extracting colors, and analyzing components...</small>
    </div>
  );
};