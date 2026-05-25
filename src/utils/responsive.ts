import { Dimensions, Platform, useWindowDimensions } from "react-native";

/**
 * Get responsive font size based on screen width
 * Scales between min and max sizes for different device sizes
 */
export const getResponsiveFontSize = (
  baseSize: number,
  minSize = baseSize * 0.9,
  maxSize = baseSize * 1.1,
) => {
  const { width } = Dimensions.get("window");

  // Reduce text size on Android
  const androidMultiplier = Platform.OS === "android" ? 0.9 : 1;

  if (width < 380) return Math.round(minSize * androidMultiplier);
  if (width > 768) return Math.round(maxSize * androidMultiplier);

  return Math.round(baseSize * androidMultiplier);
};

/**
 * Use responsive dimensions hook
 */
export const useResponsiveDimensions = () => {
  const { width, height } = useWindowDimensions();

  const isSmallScreen = width < 380;
  const isMediumScreen = width >= 380 && width < 768;
  const isLargeScreen = width >= 768;

  const isPortrait = height > width;
  const isLandscape = width > height;

  return {
    isLandscape,
    isLargeScreen,
    isMediumScreen,
    isPortrait,
    isSmallScreen,
    height,
    width,
  };
};

/**
 * Get number of columns for a grid based on screen width
 */
export const getGridColumns = (baseColumns = 2): number => {
  const { width } = Dimensions.get("window");

  if (width < 380) return 1;
  if (width >= 768) return 3;

  return baseColumns;
};

/**
 * Get button layout based on screen width
 * Returns how many buttons can fit per row
 */
export const getButtonsPerRow = (baseButtons = 2): number => {
  const { width } = Dimensions.get("window");

  if (width < 350) return 1;
  if (width < 600) return 2;

  return Math.min(baseButtons, 3);
};

/**
 * Get responsive spacing multiplier
 */
export const getSpacingMultiplier = (): number => {
  const { width } = Dimensions.get("window");

  if (width < 380) return 0.95;
  if (width > 768) return 1.05;

  return 1;
};

/**
 * Get responsive padding based on screen size
 */
export const getResponsivePadding = (basePadding = 16): number => {
  const { width } = Dimensions.get("window");

  if (width < 380) return basePadding * 0.9;
  if (width > 768) return basePadding * 1.1;

  return basePadding;
};
