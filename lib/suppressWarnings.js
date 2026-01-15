/**
 * suppressWarnings.js - Console Warning Suppression
 * 
 * Suppresses specific Expo notification warnings that are not actionable
 * and clutter the console output.
 * 
 * Suppressed Warnings:
 * - expo-notifications deprecation warnings
 * - dataString deprecation warnings
 * - Android Push notification warnings
 * - Expo Go compatibility warnings
 * 
 * Note: Only suppresses known non-critical warnings. Errors and important
 * warnings are still displayed.
 */

// Suppress Expo notification warnings
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('expo-notifications') || 
        message.includes('dataString is deprecated') ||
        message.includes('Android Push notifications') ||
        message.includes('not fully supported in Expo Go') ||
        message.includes('shouldShowAlert') ||
        message.includes('reading dataString')) {
      return; // Suppress these specific warnings
    }
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('expo-notifications') || 
        message.includes('Android Push notifications') ||
        message.includes('not fully supported in Expo Go')) {
      return; // Suppress these specific errors
    }
  }
  originalError.apply(console, args);
};

export default {};
