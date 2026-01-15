/**
 * index.js - Application Entry Point
 * 
 * This file is the entry point for the Expo/React Native application.
 * It registers the root App component with Expo's AppRegistry.
 * 
 * registerRootComponent:
 * - Calls AppRegistry.registerComponent('main', () => App)
 * - Ensures proper environment setup for both Expo Go and native builds
 * - Handles platform-specific initialization automatically
 */

import { registerRootComponent } from 'expo';

import App from './App';

// Register the root component with Expo
// This makes the app available to the native app container
registerRootComponent(App);
