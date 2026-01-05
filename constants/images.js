// constants/images.js
// Pre-resolved image sources for better performance
import { Image } from 'react-native';

// Pre-resolve images at module load time to prevent delays
const book1Source = require('../assets/book1.jpg');
const yoloSource = require('../assets/yolo.jpg');

// Resolve asset sources once
export const BOOK1_LOGO = Image.resolveAssetSource(book1Source) || book1Source;
export const YOLO_LOGO = Image.resolveAssetSource(yoloSource) || yoloSource;

// Also export the require sources as fallback
export const BOOK1_SOURCE = book1Source;
export const YOLO_SOURCE = yoloSource;

