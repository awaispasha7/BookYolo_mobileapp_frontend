# iOS Share Extension Setup Guide

This guide explains how to add the "Scan with BookYolo" Share Extension to your iOS app.

## Overview

The Share Extension allows users to share Airbnb listings from Safari or any app directly to BookYolo for scanning. When users tap "Scan with BookYolo" in the iOS share sheet, it opens the BookYolo app with the URL pre-filled in the scan screen.

## Prerequisites

1. **Expo Development Build** - Since Share Extensions require native code, you need to use Expo's development build workflow with `expo-dev-client`.

2. **Xcode** - You'll need Xcode installed on a Mac to add the Share Extension target.

3. **Apple Developer Account** - Required for building and testing on devices.

## Setup Steps

### Step 1: Install Dependencies

The required dependency (`@expo/config-plugins`) has been added to `package.json`. Install it:

```bash
npm install
```

### Step 2: Prebuild iOS Project

Generate the native iOS project:

```bash
npx expo prebuild --platform ios
```

This creates the `ios/` directory with the Xcode project.

### Step 3: Add Share Extension in Xcode

1. **Open the project in Xcode:**
   ```bash
   open ios/BookYolo.xcworkspace
   ```
   (Note: Open `.xcworkspace`, not `.xcodeproj`)

2. **Create Share Extension Target:**
   - In Xcode, go to **File** → **New** → **Target**
   - Select **iOS** → **Share Extension**
   - Click **Next**
   - Product Name: `BookYoloShareExtension`
   - Bundle Identifier: `com.bookyolo.app.ShareExtension` (must match parent app's bundle ID + `.ShareExtension`)
   - Language: **Swift**
   - Click **Finish**
   - When prompted, click **Activate** to activate the scheme

3. **Replace Share Extension Files:**
   - Delete the default `ShareViewController.swift` that Xcode created
   - Copy the `ShareViewController.swift` from `ios/ShareExtension/` to your Share Extension target
   - Update the `Info.plist` in the Share Extension target with the one from `ios/ShareExtension/Info.plist`

4. **Configure Share Extension Target:**
   - Select the Share Extension target in Xcode
   - Go to **General** tab
   - Set **Display Name** to: `Scan with BookYolo`
   - Ensure **Deployment Target** matches your main app (iOS 13.0 or higher)
   - Under **Embedded Binaries**, ensure the Share Extension is embedded in the main app

5. **Update Info.plist:**
   - The Share Extension's `Info.plist` should include the activation rules (already provided in `ios/ShareExtension/Info.plist`)
   - This allows the extension to activate for URLs and web pages

### Step 4: Configure App Groups (Optional but Recommended)

For better data sharing between the app and extension:

1. In Xcode, select the **BookYolo** target
2. Go to **Signing & Capabilities**
3. Click **+ Capability** → **App Groups**
4. Add a group: `group.com.bookyolo.app`
5. Repeat for the Share Extension target with the same group name

### Step 5: Update Deep Link Handler

The deep link handler (`lib/deepLinkHandler.js`) already supports share extension URLs. It will:
- Detect URLs with `bookyolo://scan?url=...` format
- Navigate to the Scan screen with the URL pre-filled
- Automatically trigger the scan

### Step 6: Test the Share Extension

1. **Build and run on device:**
   ```bash
   npx expo run:ios
   ```
   Or use Xcode to build and run on a physical device (Share Extensions don't work in the Simulator for all apps)

2. **Test the extension:**
   - Open Safari on your iOS device
   - Navigate to an Airbnb listing
   - Tap the Share button (square with arrow)
   - Scroll through the share options
   - You should see **"Scan with BookYolo"** in the list
   - Tap it to open BookYolo with the URL

### Step 7: Build for Production

When building with EAS Build, the Share Extension will be included automatically:

```bash
npm run build:ios
```

## How It Works

1. **User shares URL:** User taps share in Safari/other app and selects "Scan with BookYolo"
2. **Share Extension receives URL:** The Share Extension (`ShareViewController.swift`) receives the shared URL
3. **Opens main app:** The extension opens the main app using the `bookyolo://scan?url=...` deep link
4. **Deep link handler processes:** The `deepLinkHandler.js` detects the deep link and extracts the URL
5. **Navigates to Scan screen:** The app navigates to the Scan screen with the URL pre-filled
6. **Auto-scans:** The `ScanScreen.js` automatically triggers the scan (already implemented)

## Troubleshooting

### Share Extension doesn't appear in share sheet

- Ensure the Share Extension target is properly embedded in the main app
- Check that the bundle identifier follows the pattern: `[MainAppBundleID].ShareExtension`
- Verify `Info.plist` has correct `NSExtension` configuration
- Make sure you're testing on a physical device (not all apps show extensions in Simulator)

### App doesn't open when tapping share extension

- Verify the URL scheme `bookyolo://` is registered in the main app's `Info.plist`
- Check that `deepLinkHandler.js` is properly initialized in `App.js`
- Ensure the deep link format matches: `bookyolo://scan?url=...`

### Share Extension crashes

- Check Xcode console for error messages
- Verify all required imports in `ShareViewController.swift`
- Ensure the deployment target matches the main app

## Files Added/Modified

- `plugins/withShareExtension.js` - Expo config plugin for Share Extension
- `ios/ShareExtension/ShareViewController.swift` - Native Swift code for Share Extension
- `ios/ShareExtension/Info.plist` - Share Extension configuration
- `app.json` - Updated with Share Extension plugin
- `package.json` - Added `@expo/config-plugins` dependency

## Notes

- The Share Extension requires native iOS code, so you must use Expo's development build workflow
- Share Extensions work best when tested on physical devices
- The extension is automatically included in production builds when using EAS Build
- The current implementation opens the app with the URL; you can enhance it to show a preview or loading state if needed

## References

- [Apple Share Extension Documentation](https://developer.apple.com/documentation/social/slcomposeserviceviewcontroller)
- [Expo Config Plugins](https://docs.expo.dev/config-plugins/introduction/)
- [Expo Development Build](https://docs.expo.dev/development/introduction/)










