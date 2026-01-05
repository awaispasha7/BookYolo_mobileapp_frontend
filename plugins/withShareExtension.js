const { withXcodeProject, withInfoPlist, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to add iOS Share Extension
 * This plugin adds the necessary configuration for the Share Extension
 */
const withShareExtension = (config) => {
  // Update Info.plist for Share Extension support
  config = withInfoPlist(config, (config) => {
    // Add URL scheme handling for share extension
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }
    
    // Ensure bookyolo scheme is present
    const existingScheme = config.modResults.CFBundleURLTypes.find(
      (type) => type.CFBundleURLSchemes && type.CFBundleURLSchemes.includes('bookyolo')
    );
    
    if (!existingScheme) {
      config.modResults.CFBundleURLTypes.push({
        CFBundleTypeRole: 'Editor',
        CFBundleURLSchemes: ['bookyolo'],
      });
    }
    
    return config;
  });

  // Modify Xcode project to add Share Extension target
  config = withXcodeProject(config, async (config) => {
    const projectPath = path.join(config.modRequest.platformProjectRoot, 'BookYolo.xcodeproj', 'project.pbxproj');
    
    // Note: Full Share Extension target creation requires more complex Xcode project manipulation
    // This plugin sets up the foundation. The actual Share Extension target and Swift code
    // should be added manually in Xcode or via a more advanced config plugin.
    
    return config;
  });

  return config;
};

module.exports = withShareExtension;










