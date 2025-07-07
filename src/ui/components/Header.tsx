// src/ui/components/Header.tsx
import React from 'react';

interface HeaderProps {
  deviceCount: number;
  colorCount: number;
  screenCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  deviceCount,
  colorCount,
  screenCount
}) => {
  return (
    <div className="header">
      <h1>🎨 Figma → React Native</h1>
      <p>
        {deviceCount} devices • {colorCount} colors • {screenCount} screens
      </p>
    </div>
  );
};