// src/ui/components/TabNavigation.tsx
import React from 'react';

type TabType = 'overview' | 'layers' | 'options';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  layerCount: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  layerCount
}) => {
  return (
    <div className="tabs">
      <button 
        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => onTabChange('overview')}
      >
        📊 Overview
      </button>
      <button 
        className={`tab ${activeTab === 'layers' ? 'active' : ''}`}
        onClick={() => onTabChange('layers')}
      >
        📋 Screens ({layerCount})
      </button>
      <button 
        className={`tab ${activeTab === 'options' ? 'active' : ''}`}
        onClick={() => onTabChange('options')}
      >
        ⚙️ Options
      </button>
    </div>
  );
};