// Enhanced Figma Plugin - Layers to CSS Generator with Layer Selection
// This plugin displays all layers and allows selection for JSON/CSS export

/// <reference types="@figma/plugin-typings" />

interface LayerData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  children?: LayerData[];
  css?: CSSProperties;
  properties?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    text?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

interface CSSProperties {
  position?: string;
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  backgroundColor?: string;
  borderRadius?: string | 'mixed';
  opacity?: string;
  fontSize?: string | 'mixed';
  fontFamily?: string | 'mixed';
  fontWeight?: string | 'mixed';
  color?: string;
  textAlign?: string | 'mixed';
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  padding?: string;
  margin?: string;
  border?: string | 'mixed';
  boxShadow?: string;
  transform?: string;
}

// Type guard for checking if a value is not mixed
function isNotMixed<T>(value: T | typeof figma.mixed): value is T {
  return value !== figma.mixed;
}

// Helper function to safely get text content
function getTextContent(textNode: TextNode): string {
  try {
    if (typeof textNode.characters === 'string') {
      return textNode.characters;
    }
    return '';
  } catch (error) {
    // Sometimes characters might not be accessible
    console.warn('Could not access text characters:', error);
    return '[Text content not accessible]';
  }
}
figma.showUI(__html__, { 
  width: 400, 
  height: 600,
  themeColors: true 
});

// Function to extract CSS properties from a node
function extractCSSProperties(node: SceneNode): CSSProperties {
  const css: CSSProperties = {};

  // Position and dimensions
  if ('x' in node && 'y' in node) {
    css.position = 'absolute';
    css.left = `${Math.round(node.x)}px`;
    css.top = `${Math.round(node.y)}px`;
  }
  
  if ('width' in node && 'height' in node) {
    css.width = `${Math.round(node.width)}px`;
    css.height = `${Math.round(node.height)}px`;
  }

  // Opacity
  if ('opacity' in node && node.opacity < 1) {
    css.opacity = node.opacity.toString();
  }

  // Background and fills
  if ('fills' in node) {
    const fills = node.fills;
    if (isNotMixed(fills) && Array.isArray(fills)) {
      const fill = fills.find(f => f.visible !== false);
      if (fill && fill.type === 'SOLID') {
        const color = fill.color;
        const opacity = fill.opacity || 1;
        css.backgroundColor = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity})`;
      }
    }
  }

  // Border radius
  if ('cornerRadius' in node) {
    const cornerRadius = node.cornerRadius;
    if (typeof cornerRadius === 'number') {
      css.borderRadius = `${cornerRadius}px`;
    } else if (cornerRadius === figma.mixed) {
      css.borderRadius = 'mixed';
    }
  }

  // Text properties
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    
    // Font size
    const fontSize = textNode.fontSize;
    if (typeof fontSize === 'number') {
      css.fontSize = `${fontSize}px`;
    } else if (fontSize === figma.mixed) {
      css.fontSize = 'mixed';
    }
    
    // Font family and weight
    const fontName = textNode.fontName;
    if (isNotMixed(fontName)) {
      // Font family
      if (fontName.family) {
        css.fontFamily = `"${fontName.family}"`;
      }
      
      // Font weight
      if (fontName.style) {
        const style = fontName.style.toLowerCase();
        css.fontWeight = style.includes('bold') ? 'bold' : 
                        style.includes('light') ? '300' :
                        style.includes('medium') ? '500' :
                        style.includes('semibold') ? '600' :
                        style.includes('heavy') || style.includes('black') ? '900' : 'normal';
      }
    } else {
      css.fontFamily = 'mixed';
      css.fontWeight = 'mixed';
    }
    
    // Text align
    const textAlign = textNode.textAlignHorizontal;
    if (isNotMixed(textAlign)) {
      css.textAlign = textAlign.toLowerCase() as 'left' | 'center' | 'right' | 'justify';
    } else {
      css.textAlign = 'mixed';
    }
    
    // Text color
    const fills = textNode.fills;
    if (isNotMixed(fills) && Array.isArray(fills)) {
      const fill = fills.find(f => f.visible !== false);
      if (fill && fill.type === 'SOLID') {
        const color = fill.color;
        const opacity = fill.opacity || 1;
        css.color = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity})`;
      }
    }
  }

  // Frame/Container properties
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frameNode = node as FrameNode;
    
    // Layout properties
    if (frameNode.layoutMode !== 'NONE') {
      css.display = 'flex';
      css.flexDirection = frameNode.layoutMode === 'VERTICAL' ? 'column' : 'row';
      
      // Alignment
      const primaryAlignment = frameNode.primaryAxisAlignItems;
      if (isNotMixed(primaryAlignment)) {
        css.justifyContent = primaryAlignment === 'CENTER' ? 'center' :
                           primaryAlignment === 'MAX' ? 'flex-end' : 
                           primaryAlignment === 'SPACE_BETWEEN' ? 'space-between' : 'flex-start';
      }
      
      const counterAlignment = frameNode.counterAxisAlignItems;
      if (isNotMixed(counterAlignment)) {
        css.alignItems = counterAlignment === 'CENTER' ? 'center' :
                        counterAlignment === 'MAX' ? 'flex-end' : 'flex-start';
      }
    }
    
    // Padding
    const padTop = frameNode.paddingTop || 0;
    const padRight = frameNode.paddingRight || 0;
    const padBottom = frameNode.paddingBottom || 0;
    const padLeft = frameNode.paddingLeft || 0;
    
    if (padTop || padRight || padBottom || padLeft) {
      if (padTop === padRight && padRight === padBottom && padBottom === padLeft) {
        css.padding = `${padTop}px`;
      } else {
        css.padding = `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`;
      }
    }
  }

  // Strokes/Borders
  if ('strokes' in node) {
    const strokes = node.strokes;
    if (isNotMixed(strokes) && Array.isArray(strokes)) {
      const stroke = strokes.find(s => s.visible !== false);
      if (stroke && stroke.type === 'SOLID' && 'strokeWeight' in node) {
        const strokeWeight = node.strokeWeight;
        if (typeof strokeWeight === 'number') {
          const color = stroke.color;
          const opacity = stroke.opacity || 1;
          css.border = `${strokeWeight}px solid rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${opacity})`;
        } else if (strokeWeight === figma.mixed) {
          css.border = 'mixed';
        }
      }
    }
  }

  // Effects (shadows, etc.)
  if ('effects' in node && node.effects && Array.isArray(node.effects)) {
    const shadow = node.effects.find(e => e.visible !== false && e.type === 'DROP_SHADOW');
    if (shadow && shadow.type === 'DROP_SHADOW') {
      const color = shadow.color;
      css.boxShadow = `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${shadow.color.a || 1})`;
    }
  }

  return css;
}

// Function to traverse and extract layer data
function extractLayerData(node: SceneNode): LayerData {
  const layerData: LayerData = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    css: extractCSSProperties(node),
    properties: {
      x: 'x' in node ? node.x : undefined,
      y: 'y' in node ? node.y : undefined,
      width: 'width' in node ? node.width : undefined,
      height: 'height' in node ? node.height : undefined,
      rotation: 'rotation' in node ? node.rotation : undefined,
    }
  };

  // Add text content for text nodes
  if (node.type === 'TEXT') {
    layerData.properties!.text = getTextContent(node as TextNode);
  }

  // Add children if the node has them
  if ('children' in node && node.children && node.children.length > 0) {
    layerData.children = node.children.map(child => extractLayerData(child));
  }

  return layerData;
}

// Function to get all pages and their layers
function getAllLayers() {
  const pages = figma.root.children.map(page => ({
    id: page.id,
    name: page.name,
    type: 'PAGE',
    visible: true,
    locked: false,
    children: page.children.map(child => extractLayerData(child))
  }));
  
  return pages;
}

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-layers') {
    const layers = getAllLayers();
    figma.ui.postMessage({
      type: 'layers-data',
      data: layers
    });
  }
  
  if (msg.type === 'export-layer') {
    const { layerId } = msg;
    try {
      const node = await findNodeById(layerId);
      
      if (node) {
        const layerData = extractLayerData(node);
        figma.ui.postMessage({
          type: 'export-data',
          data: layerData
        });
      } else {
        figma.ui.postMessage({
          type: 'error',
          message: 'Layer not found or no longer accessible'
        });
      }
    } catch (error) {
      figma.ui.postMessage({
        type: 'error',
        message: `Error accessing layer: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  if (msg.type === 'select-layer') {
    const { layerId } = msg;
    try {
      const node = await findNodeById(layerId);
      
      if (node) {
        // Select the node in Figma
        figma.currentPage.selection = [node];
        // Zoom to the selected node
        figma.viewport.scrollAndZoomIntoView([node]);
        
        figma.ui.postMessage({
          type: 'layer-selected',
          data: { success: true, layerId }
        });
      } else {
        figma.ui.postMessage({
          type: 'error',
          message: 'Layer not found or no longer accessible'
        });
      }
    } catch (error) {
      figma.ui.postMessage({
        type: 'error',
        message: `Error selecting layer: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// Initialize by sending current layers
const initialLayers = getAllLayers();
figma.ui.postMessage({
  type: 'layers-data',
  data: initialLayers
});

// Function to safely find a node by ID
async function findNodeById(nodeId: string): Promise<SceneNode | null> {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    return node as SceneNode;
  } catch (error) {
    console.warn(`Node with ID ${nodeId} not found:`, error);
    return null;
  }
}

// Listen for selection changes
figma.on('selectionchange', async () => {
  if (figma.currentPage.selection.length > 0) {
    const selectedNode = figma.currentPage.selection[0];
    const layerData = extractLayerData(selectedNode);
    figma.ui.postMessage({
      type: 'selection-changed',
      data: layerData
    });
  }
});