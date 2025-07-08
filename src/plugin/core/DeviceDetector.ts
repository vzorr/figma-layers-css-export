// src/plugin/core/DeviceDetector.ts - Fixed with Proper Types

// Import Figma types first
/// <reference types="@figma/plugin-typings" />


import { DeviceInfo, ResponsiveBreakpoints } from '../../shared/types';

export class DeviceDetector {
  private static readonly DEVICE_PATTERNS = {
    // Common mobile device patterns
    mobile: [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 8', width: 375, height: 667 },
      { name: 'iPhone X/11/12/13 Mini', width: 375, height: 812 },
      { name: 'iPhone 14/15', width: 393, height: 852 },
      { name: 'iPhone Pro', width: 414, height: 896 },
      { name: 'iPhone Pro Max', width: 428, height: 926 },
      { name: 'Android Small', width: 360, height: 640 },
      { name: 'Android Medium', width: 412, height: 892 },
      { name: 'Pixel', width: 411, height: 731 },
    ],
    tablet: [
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro 11"', width: 834, height: 1194 },
      { name: 'iPad Pro 12.9"', width: 1024, height: 1366 },
      { name: 'Android Tablet', width: 800, height: 1280 },
    ],
    desktop: [
      { name: 'Desktop Small', width: 1024, height: 768 },
      { name: 'Desktop Medium', width: 1440, height: 900 },
      { name: 'Desktop Large', width: 1920, height: 1080 },
    ]
  };

  /**
   * Scan all pages in the document to detect device types
   */
  static scanDocument(): DeviceInfo[] {
    const devices: DeviceInfo[] = [];
    const seenDimensions = new Set<string>();

    try {
      // Scan all pages
      for (const page of figma.root.children) {
        if (page.type === 'PAGE') {
          // Look for top-level frames that represent screens
          for (const child of page.children) {
            if (child.type === 'FRAME' && this.isScreenFrame(child as FrameNode)) {
              const deviceInfo = this.detectDeviceFromFrame(child as FrameNode);
              const dimensionKey = `${deviceInfo.width}x${deviceInfo.height}`;
              
              // Avoid duplicates
              if (!seenDimensions.has(dimensionKey)) {
                devices.push(deviceInfo);
                seenDimensions.add(dimensionKey);
              }
            }
          }
        }
      }

      return this.categorizeAndSortDevices(devices);
    } catch (error) {
      console.error('Error scanning document for devices:', error);
      return [];
    }
  }

  /**
   * Detect device type from a single frame
   */
  static detectDeviceFromFrame(frame: FrameNode): DeviceInfo {
    const width = Math.round(frame.width);
    const height = Math.round(frame.height);
    const aspectRatio = width / height;
    const orientation = width > height ? 'landscape' : 'portrait';

    // Try to match against known patterns
    const matchedDevice = this.matchKnownDevice(width, height);
    
    const deviceInfo: DeviceInfo = {
      id: frame.id,
      name: matchedDevice?.name || frame.name,
      width,
      height,
      aspectRatio,
      orientation,
      type: this.determineDeviceType(width, height),
      category: this.determineDeviceCategory(width, height),
      isBaseDevice: false
    };

    return deviceInfo;
  }

  /**
   * Generate responsive breakpoints based on detected devices
   */
  static generateBreakpoints(devices: DeviceInfo[]): ResponsiveBreakpoints {
    const mobileDevices = devices.filter(d => d.type === 'mobile');
    const tabletDevices = devices.filter(d => d.type === 'tablet');
    const desktopDevices = devices.filter(d => d.type === 'desktop');

    const mobileSizes = mobileDevices.map(d => d.width).sort((a, b) => a - b);
    const tabletSizes = tabletDevices.map(d => d.width).sort((a, b) => a - b);
    const desktopSizes = desktopDevices.map(d => d.width).sort((a, b) => a - b);

    return {
      mobile: {
        small: mobileSizes[0] || 360,
        normal: mobileSizes[Math.floor(mobileSizes.length / 2)] || 375,
        large: mobileSizes[mobileSizes.length - 1] || 428
      },
      tablet: tabletSizes[0] || 768,
      desktop: desktopSizes[0] || 1024
    };
  }

  /**
   * Select base device for responsive calculations
   */
  static selectBaseDevice(devices: DeviceInfo[]): DeviceInfo {
    // Prefer iPhone 8 size (375x667) or closest mobile device
    const preferredBase = devices.find(d => 
      d.width === 375 && d.height === 667 && d.type === 'mobile'
    );

    if (preferredBase) {
      preferredBase.isBaseDevice = true;
      return preferredBase;
    }

    // Fallback to most common mobile size
    const mobileDevices = devices.filter(d => d.type === 'mobile');
    if (mobileDevices.length > 0) {
      const baseDevice = mobileDevices.sort((a, b) => 
        Math.abs(a.width - 375) - Math.abs(b.width - 375)
      )[0];
      baseDevice.isBaseDevice = true;
      return baseDevice;
    }

    // Last resort - use first device
    if (devices.length > 0) {
      devices[0].isBaseDevice = true;
      return devices[0];
    }

    // Default fallback
    return {
      id: 'default',
      name: 'iPhone 8 (Default)',
      width: 375,
      height: 667,
      aspectRatio: 375/667,
      orientation: 'portrait',
      type: 'mobile',
      category: 'normal_phone',
      isBaseDevice: true
    };
  }

  /**
   * Check if frame represents a screen (not a component)
   */
  private static isScreenFrame(frame: FrameNode): boolean {
    try {
      const width = frame.width;
      const height = frame.height;
      const name = frame.name.toLowerCase();

      // Check if dimensions match common device sizes
      const hasDeviceDimensions = this.matchKnownDevice(width, height) !== null;

      // Check if it's reasonably sized for a screen
      const minDimension = Math.min(width, height);
      const maxDimension = Math.max(width, height);
      const isReasonableSize = minDimension >= 300 && maxDimension >= 600 && maxDimension <= 2000;

      // Check if name suggests it's a screen
      const hasScreenName = /screen|page|view|layout|mobile|tablet|desktop|iphone|ipad|android/.test(name);

      // Check if it has multiple children (complex layout)
      const hasComplexLayout = frame.children.length >= 2;

      return (hasDeviceDimensions || isReasonableSize) && (hasScreenName || hasComplexLayout);
    } catch (error) {
      console.warn('Error checking if frame is screen:', error);
      return false;
    }
  }

  /**
   * Match frame dimensions against known device patterns
   */
  private static matchKnownDevice(width: number, height: number): {name: string} | null {
    const tolerance = 5; // Allow 5px tolerance

    for (const deviceType of Object.values(this.DEVICE_PATTERNS)) {
      for (const device of deviceType) {
        // Check both orientations
        if ((Math.abs(device.width - width) <= tolerance && Math.abs(device.height - height) <= tolerance) ||
            (Math.abs(device.height - width) <= tolerance && Math.abs(device.width - height) <= tolerance)) {
          return device;
        }
      }
    }

    return null;
  }

  /**
   * Determine device type based on dimensions
   */
  private static determineDeviceType(width: number, height: number): DeviceInfo['type'] {
    const minDimension = Math.min(width, height);
    
    if (minDimension >= 1024) {
      return 'desktop';
    } else if (minDimension >= 768) {
      return 'tablet';
    } else {
      return 'mobile';
    }
  }

  /**
   * Determine specific device category
   */
  private static determineDeviceCategory(width: number, height: number): DeviceInfo['category'] {
    const minDimension = Math.min(width, height);
    
    if (minDimension >= 768) {
      return 'tablet';
    } else if (minDimension >= 414) {
      return 'large_phone'; // Pro Max, foldables
    } else if (minDimension >= 375) {
      return 'normal_phone'; // Standard iPhones
    } else if (minDimension >= 350) {
      return 'small_phone'; // SE, compact Android
    } else {
      return 'small_phone';
    }
  }

  /**
   * Categorize and sort devices for better organization
   */
  private static categorizeAndSortDevices(devices: DeviceInfo[]): DeviceInfo[] {
    return devices.sort((a, b) => {
      // Sort by type first
      const typeOrder = { mobile: 0, tablet: 1, desktop: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      
      // Then by width
      return a.width - b.width;
    });
  }

  /**
   * Get scaling factor for responsive design
   */
  static getScalingFactor(currentDevice: DeviceInfo, baseDevice: DeviceInfo): {
    width: number;
    height: number;
    font: number;
  } {
    const widthScale = currentDevice.width / baseDevice.width;
    const heightScale = currentDevice.height / baseDevice.height;
    
    // Font scaling uses smaller factor to avoid oversized text
    const fontScale = Math.min(widthScale, heightScale);
    
    return {
      width: widthScale,
      height: heightScale,
      font: fontScale
    };
  }

  /**
   * Generate responsive utility code
   */
  static generateResponsiveUtilities(baseDevice: DeviceInfo): string {
    return `
// Auto-generated responsive utilities
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (design reference: ${baseDevice.name})
const BASE_WIDTH = ${baseDevice.width};
const BASE_HEIGHT = ${baseDevice.height};

// Responsive scaling functions
export const scale = (size: number): number => (SCREEN_WIDTH / BASE_WIDTH) * size;
export const verticalScale = (size: number): number => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
export const moderateScale = (size: number, factor: number = 0.5): number => 
  size + (scale(size) - size) * factor;

// Percentage-based dimensions
export const wp = (percentage: number): number => (SCREEN_WIDTH * percentage) / 100;
export const hp = (percentage: number): number => (SCREEN_HEIGHT * percentage) / 100;

// Device type detection
export const getDeviceType = (): 'small_phone' | 'normal_phone' | 'large_phone' | 'tablet' => {
  const minDimension = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
  
  if (minDimension >= 768) return 'tablet';
  if (minDimension >= 414) return 'large_phone';
  if (minDimension >= 375) return 'normal_phone';
  return 'small_phone';
};

// Pixel ratio normalization
export const normalize = (size: number): number => {
  return Math.round(PixelRatio.roundToNearestPixel(moderateScale(size)));
};
`;
  }
}