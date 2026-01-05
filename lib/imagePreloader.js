// lib/imagePreloader.js
// Pre-resolves image sources at module load time to prevent loading delays
import { Image } from 'react-native';

// Pre-resolve all logo images at module load time
// This ensures images are decoded and cached before first use
const book1Image = require('../assets/book1.jpg');
const yoloImage = require('../assets/yolo.jpg');

// Resolve asset sources immediately
export const LOGO_IMAGES = {
  book1: Image.resolveAssetSource(book1Image) || book1Image,
  yolo: Image.resolveAssetSource(yoloImage) || yoloImage,
};

// Also export the require sources as fallback
export const LOGO_SOURCES = {
  book1: book1Image,
  yolo: yoloImage,
};

// Preload function (for compatibility, though local assets don't need prefetch)
export const preloadImages = async () => {
  // For local assets, just resolving them is enough
  // React Native will cache them automatically
  return true;
};

