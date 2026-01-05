# iOS App Store Deployment Setup Guide

This guide will help you deploy the BookYolo app to the App Store using EAS Build and Submit.

## Prerequisites

1. **Node.js 18+** - Check version: `node --version`
2. **npm or yarn** package manager
3. **Apple Developer Account** with:
   - App Store Connect access
   - App Store Connect App ID
   - Apple Team ID
   - App-specific password (for submission)

## Step 1: Pull Latest Code

```bash
cd /path/to/BookYolo_mobileapp_frontend
git pull origin main
```

## Step 2: Clean Install Dependencies

```bash
# Remove existing node_modules
rm -rf node_modules
rm -f package-lock.json

# Clear npm cache
npm cache clean --force

# Install dependencies
npm install
```

## Step 3: Configure Apple Developer Credentials

Update `eas.json` with your actual credentials:

1. **Get App Store Connect App ID:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Navigate to your app
   - Copy the App ID from the app information page

2. **Get Apple Team ID:**
   - Go to [Apple Developer Account](https://developer.apple.com/account)
   - Navigate to Membership section
   - Copy your Team ID

3. **Create App-Specific Password:**
   - Go to [appleid.apple.com](https://appleid.apple.com)
   - Sign in with your Apple ID (tech@bookyolo.com)
   - Go to Security → App-Specific Passwords
   - Generate a new password for "EAS Submit"
   - Save this password securely

4. **Set Environment Variable:**
   ```bash
   export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
   ```

## Step 4: Login to EAS

```bash
npx eas-cli login
```

Enter your Expo account credentials.

## Step 5: Configure EAS Project

```bash
npx eas-cli build:configure
```

This will link your project to EAS and create necessary configurations.

## Step 6: Build iOS App

### For Production Build:
```bash
npm run build:ios
```

Or manually:
```bash
npx eas-cli build --platform ios --profile production
```

### For Preview/Testing:
```bash
npm run build:ios:preview
```

## Step 7: Submit to App Store

After the build completes successfully:

```bash
npm run submit:ios
```

Or manually:
```bash
npx eas-cli submit --platform ios --profile production
```

## Step 8: Monitor Build Status

Check build status:
```bash
npx eas-cli build:list
```

## Troubleshooting

### Issue: `pngjs` module not found
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: EAS CLI version mismatch
**Solution:**
```bash
npm uninstall eas-cli
npm install eas-cli@latest --save-dev
```

### Issue: Build fails with credentials error
**Solution:**
- Verify `eas.json` has correct `ascAppId` and `appleTeamId`
- Ensure `APPLE_APP_SPECIFIC_PASSWORD` environment variable is set
- Try logging out and back in: `npx eas-cli logout && npx eas-cli login`

### Issue: Auto-increment build number fails
**Solution:**
- Manually update `buildNumber` in `app.json`
- Or ensure you have write access to the EAS project

## Quick Deploy Script

Save this as `deploy.sh` and run: `chmod +x deploy.sh && ./deploy.sh`

```bash
#!/bin/bash

echo "🚀 Starting BookYolo iOS Deployment..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Clean install
echo "🧹 Cleaning and installing dependencies..."
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Verify EAS CLI
echo "✅ Verifying EAS CLI..."
npx eas-cli --version

# Build
echo "🔨 Building iOS app..."
npx eas-cli build --platform ios --profile production

# Submit (if build succeeds)
if [ $? -eq 0 ]; then
    echo "📤 Submitting to App Store..."
    npx eas-cli submit --platform ios --profile production
    echo "✅ Deployment complete!"
else
    echo "❌ Build failed. Please check the errors above."
fi
```

## Environment Variables

For CI/CD or automated deployment, set these environment variables:

```bash
export EXPO_TOKEN="your-expo-token"
export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
```

Get your Expo token from: https://expo.dev/accounts/[your-account]/settings/access-tokens

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)












