# 🚀 Quick Start Guide for MacBook

## Simple Setup - Just Run These Commands

### Step 1: Install Dependencies
```bash
npm install
```

**That's it!** All dependencies including `@expo/config-plugins` will be installed automatically.

---

### Step 2: Prebuild iOS Project (Required for Share Extension)
```bash
npx expo prebuild --platform ios
```

This generates the native iOS project with all configurations. The Share Extension files are already in the repository.

---

### Step 3: Add Share Extension in Xcode

Open the project in Xcode:
```bash
open ios/BookYolo.xcworkspace
```

**Important:** Open `.xcworkspace`, not `.xcodeproj`

#### In Xcode, follow these steps:

1. **Create Share Extension Target:**
   - Go to **File** → **New** → **Target**
   - Select **iOS** → **Share Extension**
   - Click **Next**

2. **Configure the Extension:**
   - **Product Name:** `BookYoloShareExtension`
   - **Bundle Identifier:** `com.bookyolo.app.ShareExtension` (must match: `[MainAppBundleID].ShareExtension`)
   - **Language:** **Swift**
   - Click **Finish**
   - When prompted, click **Activate** to activate the scheme

3. **Replace Share Extension Files:**
   - In the Project Navigator, expand the `BookYoloShareExtension` folder
   - **Delete** the default `ShareViewController.swift` file (created by Xcode)
   - **Right-click** on the `BookYoloShareExtension` folder → **Add Files to "BookYolo"...**
   - Navigate to `ios/ShareExtension/ShareViewController.swift`
   - Select it and make sure:
     - ✅ **Add to targets:** `BookYoloShareExtension` is checked
     - ✅ **Copy items if needed** is checked
     - Click **Add**

4. **Update Info.plist:**
   - Select `Info.plist` in the Share Extension target
   - Replace its contents with the contents from `ios/ShareExtension/Info.plist`
   - Or manually update the `NSExtension` section to match

5. **Configure Share Extension Target:**
   - Select the **BookYoloShareExtension** target in Xcode
   - Go to **General** tab
   - Set **Display Name** to: `Scan with BookYolo`
   - Ensure **Deployment Target** matches your main app (iOS 13.0 or higher)

6. **Verify Embedding:**
   - Select the **BookYolo** (main app) target
   - Go to **General** tab
   - Under **Frameworks, Libraries, and Embedded Content**, verify that `BookYoloShareExtension.appex` is listed
   - If not, go to **Build Phases** → **Embed App Extensions** and add it

---

### Step 4: Build & Test

#### Option A: Development Build (Recommended for testing)
```bash
npx expo run:ios
```

#### Option B: Production Build
```bash
npm run build:ios
```

---

### Step 5: Test the Share Extension

1. **Build and run on a physical iOS device** (Share Extensions work best on real devices)

2. **Test the extension:**
   - Open **Safari** on your iOS device
   - Navigate to an Airbnb listing (e.g., `https://www.airbnb.com/rooms/...`)
   - Tap the **Share button** (square with arrow icon)
   - Scroll through the share options
   - Look for **"Scan with BookYolo"** in the list
   - Tap it to open BookYolo with the URL pre-filled
   - The app should automatically start scanning

---

## ✅ What's Already Configured

All these files are already in the repository and ready to use:

- ✅ `plugins/withShareExtension.js` - Expo config plugin
- ✅ `ios/ShareExtension/ShareViewController.swift` - Native Swift code
- ✅ `ios/ShareExtension/Info.plist` - Share Extension configuration
- ✅ `app.json` - Already configured with plugin and URL scheme
- ✅ `package.json` - Dependencies already added
- ✅ `lib/deepLinkHandler.js` - Enhanced to handle share extension URLs
- ✅ `screens/ScanScreen.js` - Already supports auto-scan from share URL

---

## 🐛 Troubleshooting

### Share Extension doesn't appear in share sheet
- Make sure the Share Extension target is properly embedded in the main app
- Verify bundle identifier follows pattern: `com.bookyolo.app.ShareExtension`
- Check that `Info.plist` has correct `NSExtension` configuration
- Try restarting your iOS device
- Test on a physical device (not Simulator for all apps)

### App doesn't open when tapping share extension
- Verify URL scheme `bookyolo://` is registered in main app's `Info.plist` (already configured)
- Check that deep link handler is initialized in `App.js` (already done)

### Build errors
- Make sure you ran `npm install` first
- Ensure Xcode is up to date
- Clean build folder in Xcode: **Product** → **Clean Build Folder** (Shift + Command + K)

---

## 📚 Additional Resources

- **Detailed Setup Guide:** See `SHARE_EXTENSION_SETUP.md` for comprehensive instructions
- **iOS Deployment Guide:** See `README.md` for App Store deployment steps

---

## 🎯 Summary

**For MacBook user, just run:**
1. `npm install` - Installs all dependencies
2. `npx expo prebuild --platform ios` - Generates native project
3. Open in Xcode and add Share Extension target (5 minutes)
4. Build and test!

Everything else is already done! 🎉










