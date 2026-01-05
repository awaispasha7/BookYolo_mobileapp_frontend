# 📱 BookYolo iOS App Store Deployment Guide
## Complete Step-by-Step Instructions for MacBook

---

**Project:** BookYolo Mobile App  
**Platform:** iOS / App Store  
**Date:** December 2025  

---

## 🚀 Quick Start

**New to this project or just want to get started quickly?**

👉 **See `QUICK_START_MACBOOK.md`** for a simple setup guide that includes Share Extension setup.

**Need Share Extension setup?** See `SHARE_EXTENSION_SETUP.md` for detailed instructions.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] MacBook with macOS installed
- [ ] Terminal application (built-in)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Internet connection
- [ ] Expo account credentials
- [ ] Apple Developer Account access
- [ ] App Store Connect access

---

## PART 1: Fix pngjs Module Error

### Step 1: Open Terminal

1. Press `Command + Space` to open Spotlight
2. Type `Terminal` and press `Enter`

---

### Step 2: Navigate to Project Directory

```bash
cd /Users/asadiqbal/Downloads/BookYolo_mobileapp_frontend
```

**Verify you're in the correct directory:**
```bash
pwd
```

You should see: `/Users/asadiqbal/Downloads/BookYolo_mobileapp_frontend`

---

### Step 3: Pull Latest Code from Repository

```bash
git pull origin main
```

**Expected Output:**
```
Updating bd60ac3..a78b7f5
Fast-forward
 package.json              | 12 ++++++++++++
 eas.json                  | 24 ++++++++++++++++++++----
 .gitignore                |  8 ++++++++++
 DEPLOYMENT_SETUP.md       | 197 ++++++++++++++++++++++++++++++++++++++++
 deploy.sh                 |  39 +++++++++++++++++
 5 files changed, 264 insertions(+), 5 deletions(-)
```

**If you see "already up to date":** That's okay, skip to Step 4.

---

### Step 4: Remove Old Dependencies

```bash
rm -rf node_modules package-lock.json
```

---

### Step 5: Clear npm Cache

```bash
npm cache clean --force
```

---

### Step 6: Install Dependencies (This will install pngjs)

```bash
npm install
```

**This will take 2-5 minutes. Wait for it to complete.**

**Look for this in the output:**
```
+ pngjs@7.0.0
```

---

### Step 7: Verify the Fix

```bash
npx eas-cli --version
```

**Expected Output:**
```
eas-cli/16.18.0
```

✅ **If you see this, the error is fixed!**

---

### Step 8: Double-Check pngjs Installation

```bash
npm list pngjs
```

**Expected Output:**
```
BookYolo@1.0.0 /Users/asadiqbal/Downloads/BookYolo_mobileapp_frontend
└── eas-cli@16.18.0
    └── pngjs@7.0.0
```

---

## PART 2: Configure Apple Developer Credentials

### Step 9: Get App Store Connect App ID

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Click on "My Apps"
4. Select your app (or create one if it doesn't exist)
5. Go to "App Information"
6. Copy the **App ID** (looks like: `1234567890`)
7. **Write it down** - you'll need it in Step 10

---

### Step 10: Get Apple Team ID

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Sign in with your Apple Developer account
3. Click on "Membership" in the sidebar
4. Find your **Team ID** (looks like: `ABCD123456`)
5. **Write it down** - you'll need it in Step 11

---

### Step 11: Create App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID (use: `tech@bookyolo.com` or your Apple ID)
3. Click on **Security** section
4. Scroll down to **App-Specific Passwords**
5. Click **Generate Password...**
6. Enter a label: `EAS Submit`
7. Click **Create**
8. **Copy the password immediately** - you won't be able to see it again!
9. **Save it securely** - you'll need it in Step 12

---

### Step 12: Update eas.json File

1. Open the project in a text editor (VS Code, TextEdit, etc.)
2. Navigate to the `eas.json` file
3. Find the `submit` section
4. Replace the placeholder values:

**Before:**
```json
"ascAppId": "your-app-store-connect-app-id",
"appleTeamId": "your-apple-team-id",
```

**After (use your actual values from Steps 9-10):**
```json
"ascAppId": "1234567890",
"appleTeamId": "ABCD123456",
```

5. **Save the file**

---

### Step 13: Set Environment Variable for Apple Password

Open Terminal and run:

```bash
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password-from-step-11"
```

**Replace** `your-app-specific-password-from-step-11` with the password you copied in Step 11.

**Note:** This will only work for the current terminal session. If you close Terminal, you'll need to run this command again.

**To make it permanent:**
```bash
echo 'export APPLE_APP_SPECIFIC_PASSWORD="your-password-here"' >> ~/.zshrc
source ~/.zshrc
```

---

## PART 3: Login and Configure EAS

### Step 14: Login to EAS

```bash
npx eas-cli login
```

1. Enter your **Expo account email**
2. Enter your **Expo account password**
3. Press Enter

**Expected Output:**
```
✔ Logged in as your-email@example.com
```

---

### Step 15: Verify Login

```bash
npx eas-cli whoami
```

**Expected Output:**
```
your-email@example.com
```

✅ **If you see your email, you're logged in!**

---

### Step 16: Configure EAS Project

```bash
npx eas-cli build:configure
```

**Answer the prompts:**
- **Would you like to configure your app?** → Type `y` and press Enter
- **Would you like to enable EAS Build for your project?** → Type `y` and press Enter
- **Which service would you like to use?** → Select `Expo` (usually the default)

**Expected Output:**
```
✔ Configured for EAS Build
```

---

## PART 4: Build iOS App

### Step 17: Build for Production

```bash
npm run build:ios
```

**Or manually:**
```bash
npx eas-cli build --platform ios --profile production
```

**This will:**
1. Upload your code to Expo's servers
2. Build the iOS app in the cloud
3. Take **15-30 minutes** to complete

**You'll see output like:**
```
✔ Build started
  Build ID: abc123def456
  Build details: https://expo.dev/accounts/your-account/builds/abc123def456
```

**Note:** The build runs on Expo's servers. You can close Terminal and check back later, or leave it open to see progress.

---

### Step 18: Monitor Build Progress

**Option 1: Watch in Terminal**
- Keep Terminal open - you'll see updates

**Option 2: Check Online**
- Visit the URL shown in Step 17
- Or run: `npx eas-cli build:list`
- Look for your build status

**Build Statuses:**
- 🟡 `in-progress` - Building (wait)
- 🟢 `finished` - Build complete (proceed to Step 19)
- 🔴 `errored` - Build failed (see Troubleshooting)

---

### Step 19: Wait for Build to Complete

**Check build status:**
```bash
npx eas-cli build:list
```

**Look for:**
```
✅ finished     iOS Production    abc123def456    2 minutes ago
```

✅ **When you see "finished", proceed to Step 20**

---

## PART 5: Submit to App Store

### Step 20: Submit Build to App Store

**Once the build is finished, submit it:**

```bash
npm run submit:ios
```

**Or manually:**
```bash
npx eas-cli submit --platform ios --profile production
```

**You'll be asked:**
- **Which build would you like to submit?** → Select the latest finished build (usually option 1)
- Press Enter

**Expected Output:**
```
✔ Submitted to App Store Connect
  Submission ID: xyz789abc123
```

---

### Step 21: Verify Submission in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click on "My Apps"
3. Select your app
4. Click on **"TestFlight"** tab
5. You should see your build under **"iOS Builds"**
6. The status will show: **"Processing"** → **"Ready to Submit"** (takes 10-30 minutes)

---

### Step 22: Submit for App Review (When Ready)

Once the build shows **"Ready to Submit"**:

1. In App Store Connect, click on your app
2. Click **"+ Version or Platform"** if creating a new version
3. Fill in:
   - **Version number** (e.g., 1.0.0)
   - **What's New in This Version**
   - **Screenshots** (required)
   - **App description**
   - **Keywords**
   - **Support URL**
   - **Privacy Policy URL**
4. Scroll down and click **"Add Build"**
5. Select your build
6. Click **"Submit for Review"**
7. Answer the export compliance questions
8. Click **"Submit"**

---

## 🚀 Quick All-in-One Command

If you want to fix the error and prepare everything at once:

```bash
cd /Users/asadiqbal/Downloads/BookYolo_mobileapp_frontend && git pull origin main && rm -rf node_modules package-lock.json && npm cache clean --force && npm install && npx eas-cli --version
```

---

## ❓ Troubleshooting

### Problem: "git pull" fails with "already up to date"

**Solution:** Your local code is already up to date. Skip to Step 4.

---

### Problem: "npm install" fails with network errors

**Solution:**
1. Check your internet connection
2. Try again: `npm install`
3. If still failing, try: `npm install --verbose` to see detailed error

---

### Problem: Still seeing pngjs error after following all steps

**Solution:**
1. Make sure you're in the correct directory
2. Verify `package.json` has `pngjs` in `devDependencies`
3. Try: `npm uninstall pngjs && npm install pngjs@latest --save-dev`
4. Then: `rm -rf node_modules package-lock.json && npm install`

---

### Problem: "Permission denied" errors

**Solution:**
1. Don't use `sudo` with npm commands
2. Check folder permissions: `ls -la`
3. Fix permissions if needed: `chmod -R 755 .`

---

### Problem: EAS CLI version mismatch

**Solution:**
```bash
npm uninstall eas-cli
npm install eas-cli@latest --save-dev
```

---

### Problem: Build fails with credentials error

**Solution:**
- Verify `eas.json` has correct `ascAppId` and `appleTeamId`
- Ensure `APPLE_APP_SPECIFIC_PASSWORD` environment variable is set
- Try logging out and back in: `npx eas-cli logout && npx eas-cli login`

---

### Problem: "Cannot find module 'pngjs/lib/png.js'" error persists

**Solution:**
1. Make sure you've pulled the latest code: `git pull origin main`
2. Verify `package.json` line 48 has: `"pngjs": "^7.0.0"`
3. Run: `rm -rf node_modules package-lock.json && npm cache clean --force && npm install`
4. Verify: `npm list pngjs`

---

## ✅ Verification Checklist

Before deploying, ensure:

- [ ] Latest code pulled from repository
- [ ] Dependencies installed successfully
- [ ] `npx eas-cli --version` works without errors
- [ ] `npm list pngjs` shows pngjs@7.0.0 installed
- [ ] Logged into EAS: `npx eas-cli whoami`
- [ ] Apple Developer credentials configured in `eas.json`
- [ ] App Store Connect app created and App ID obtained
- [ ] App-specific password created and environment variable set
- [ ] EAS project configured: `npx eas-cli build:configure`

---

## 📦 What Was Fixed

The following changes were made to fix the error:

### 1. Added `pngjs` Dependency
- **File:** `package.json`
- **Change:** Added `"pngjs": "^7.0.0"` to `devDependencies`
- **Reason:** EAS CLI requires this module but it wasn't explicitly listed

### 2. Updated Build Scripts
- **File:** `package.json`
- **Change:** Added convenient npm scripts for building and submitting
- **New Scripts:**
  - `npm run build:ios` - Build for production
  - `npm run submit:ios` - Submit to App Store
  - `npm run build:ios:preview` - Build for preview/testing

### 3. Improved EAS Configuration
- **File:** `eas.json`
- **Change:** Enhanced build and submit profiles
- **Improvements:** Better resource allocation and configuration options

---

## 📝 Summary

**Error:** `Cannot find module 'pngjs/lib/png.js'`

**Cause:** Missing `pngjs` dependency in project

**Fix:** Added `pngjs@^7.0.0` to `devDependencies` and reinstalled packages

**Steps:**
1. `git pull origin main`
2. `rm -rf node_modules package-lock.json`
3. `npm cache clean --force`
4. `npm install`
5. `npx eas-cli --version` (verify)

**Time Required:** 5-10 minutes for fix, 30-60 minutes for full deployment

**Difficulty:** Easy ⭐

---

## 📞 Support & Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Expo Status Page](https://status.expo.dev)

For detailed deployment information, see: `DEPLOYMENT_SETUP.md`

---

## 📄 Document Information

- **Created:** January 2025
- **Last Updated:** December 2025
- **Purpose:** Complete iOS App Store deployment guide for MacBook
- **Project:** BookYolo Mobile App
- **Repository:** https://github.com/awaispasha7/BookYolo_mobileapp_frontend
- **Status:** ✅ Package-lock.json synced with pngjs@7.0.0

---

**Good luck with your deployment! 🚀**


