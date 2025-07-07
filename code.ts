// Lightweight Figma Plugin - Layers to CSS Generator
// Fixed version with proper error handling and initialization

/// <reference types="@figma/plugin-typings" />

interface LayerData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children?: LayerData[];
  css?: any;
  properties?: any;
}

let isInitialized = false;

// Show UI
console.log("🚀 Plugin starting...");
figma.showUI(__html__, { 
  width: 400, 
  height: 600,
  themeColors: true 
});
console.log("✅ UI shown");

// Simple layer data extraction (no CSS processing to start)
function extractBasicLayerData(node: SceneNode, maxDepth: number = 3, currentDepth: number = 0): LayerData {
  try {
    const layerData: LayerData = {
      id: node.id,
      name: node.name || 'Unnamed Layer',
      type: node.type,
      visible: node.visible ?? true,
      locked: node.locked ?? false,
      properties: {
        x: 'x' in node ? node.x : undefined,
        y: 'y' in node ? node.y : undefined,
        width: 'width' in node ? node.width : undefined,
        height: 'height' in node ? node.height : undefined,
      }
    };

    // Only process children if we haven't reached max depth
    if (currentDepth < maxDepth && 'children' in node && node.children && node.children.length > 0) {
      // Limit to first 20 children to prevent freezing (reduced from 50)
      const childrenToProcess = node.children.slice(0, 20);
      layerData.children = childrenToProcess.map(child => {
        try {
          return extractBasicLayerData(child, maxDepth, currentDepth + 1);
        } catch (error) {
          console.warn("⚠️ Error processing child node:", error);
          return {
            id: child.id,
            name: child.name || 'Error Loading',
            type: child.type,
            visible: false,
            locked: false
          };
        }
      });
    }

    return layerData;
  } catch (error) {
    console.error("❌ Error extracting layer data:", error);
    throw error;
  }
}

// Get current page layers only (not all pages)
async function getCurrentPageLayers(): Promise<LayerData[]> {
  console.log("📄 Getting current page layers...");
  
  try {
    const currentPage = figma.currentPage;
    
    if (!currentPage) {
      throw new Error("No current page found");
    }
    
    console.log(`📊 Current page: "${currentPage.name}" with ${currentPage.children.length} children`);
    
    // Limit to first 50 top-level items to prevent freezing (reduced from 100)
    const childrenToProcess = currentPage.children.slice(0, 50);
    
    const pageData: LayerData = {
      id: currentPage.id,
      name: currentPage.name,
      type: 'PAGE',
      visible: true,
      locked: false,
      children: childrenToProcess.map(child => {
        try {
          return extractBasicLayerData(child, 2); // Max depth of 2
        } catch (error) {
          console.warn("⚠️ Error processing top-level child:", error);
          return {
            id: child.id,
            name: child.name || 'Error Loading',
            type: child.type,
            visible: false,
            locked: false
          };
        }
      })
    };
    
    console.log("✅ Current page layers processed");
    return [pageData]; // Return as array for consistency
  } catch (error) {
    console.error("❌ Error getting current page layers:", error);
    throw error;
  }
}

// Initialize the plugin
async function initializePlugin() {
  if (isInitialized) {
    console.log("⚠️ Plugin already initialized");
    return;
  }
  
  console.log("🚀 Initializing plugin...");
  try {
    const initialLayers = await getCurrentPageLayers();
    figma.ui.postMessage({
      type: 'layers-data',
      data: initialLayers
    });
    console.log("✅ Initial data sent successfully");
    isInitialized = true;
  } catch (error) {
    console.error("❌ Error in initialization:", error);
    figma.ui.postMessage({
      type: 'error',
      message: `Failed to load layers: ${error instanceof Error ? error.message : 'Unknown initialization error'}`
    });
  }
}

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  console.log("📨 Received message:", msg.type);
  
  try {
    if (msg.type === 'ui-ready') {
      // UI is ready, now initialize
      await initializePlugin();
      return;
    }
    
    if (msg.type === 'get-layers') {
      console.log("📋 Processing get-layers request...");
      try {
        const layers = await getCurrentPageLayers();
        console.log("📤 Sending layers data to UI");
        figma.ui.postMessage({
          type: 'layers-data',
          data: layers
        });
        console.log("✅ Layers data sent");
      } catch (error) {
        console.error("❌ Error in get-layers:", error);
        figma.ui.postMessage({
          type: 'error',
          message: `Error loading layers: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
      return;
    }
    
    if (msg.type === 'get-layer-details') {
      const { layerId } = msg;
      console.log("🔍 Getting details for layer:", layerId);
      try {
        const node = await figma.getNodeByIdAsync(layerId);
        if (node) {
          // Process CSS only when requested for specific layer
          const detailedData = extractBasicLayerData(node as SceneNode, 1);
          figma.ui.postMessage({
            type: 'layer-details',
            data: detailedData
          });
        } else {
          figma.ui.postMessage({
            type: 'error',
            message: 'Layer not found'
          });
        }
      } catch (error) {
        console.error("❌ Error getting layer details:", error);
        figma.ui.postMessage({
          type: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
      return;
    }
    
    if (msg.type === 'select-layer') {
      const { layerId } = msg;
      try {
        const node = await figma.getNodeByIdAsync(layerId);
        if (node) {
          figma.currentPage.selection = [node as SceneNode];
          figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
          figma.ui.postMessage({
            type: 'layer-selected',
            data: { success: true, layerId }
          });
        } else {
          figma.ui.postMessage({
            type: 'error',
            message: 'Layer not found for selection'
          });
        }
      } catch (error) {
        console.error("❌ Error selecting layer:", error);
        figma.ui.postMessage({
          type: 'error',
          message: 'Could not select layer'
        });
      }
      return;
    }
    
    if (msg.type === 'close') {
      figma.closePlugin();
      return;
    }
    
    console.log("⚠️ Unknown message type:", msg.type);
  } catch (error) {
    console.error("❌ Error handling message:", error);
    figma.ui.postMessage({
      type: 'error',
      message: `Message handling error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
};

console.log("🎯 Plugin setup complete - waiting for UI ready signal");