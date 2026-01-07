# Universal Links Setup Guide for Email Verification

This guide explains how to set up Universal Links so that email verification links open in the iPhone app when installed.

## What We've Done

✅ Updated `app.json` to add `associatedDomains` for iOS Universal Links

## What You Need to Do

### Step 1: Get Your Apple Developer Team ID

1. Go to https://developer.apple.com/account
2. Sign in with your Apple Developer account
3. Your Team ID is displayed at the top right (10 characters, e.g., `ABC123DEF4`)
4. **Write down your Team ID - you'll need it for Step 2**

### Step 2: Create apple-app-site-association File

Create a file named `apple-app-site-association` (no file extension) on your web server.

**File Location:**
```
https://bookyolo.com/.well-known/apple-app-site-association
```

**File Content:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "YOUR_TEAM_ID.com.bookyolo.app",
        "paths": [
          "/verify-email*",
          "/reset-password*"
        ]
      }
    ]
  }
}
```

**Important Instructions:**
1. Replace `YOUR_TEAM_ID` with your actual Apple Developer Team ID (10 characters)
2. The file must be named exactly `apple-app-site-association` (no .json extension)
3. Must be served with `Content-Type: application/json` header
4. Must be accessible via HTTPS
5. Must return HTTP 200 status code
6. Must be placed in the `.well-known` directory on your web server

### Step 3: Configure Web Server

#### For Vercel (if using Vercel):

Create a file in your frontend project: `public/.well-known/apple-app-site-association`

Or add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ]
    }
  ]
}
```

#### For Other Servers:

1. Create the `.well-known` directory in your web root
2. Upload the `apple-app-site-association` file
3. Configure server to serve it with `Content-Type: application/json`
4. Ensure it's accessible via HTTPS

### Step 4: Test the File

1. Visit: `https://bookyolo.com/.well-known/apple-app-site-association`
2. Verify it returns JSON content (not HTML error page)
3. Check browser DevTools Network tab - Content-Type should be `application/json`
4. Verify the file content matches your Team ID

### Step 5: Rebuild the App

After updating `app.json`, you need to rebuild your app:

```bash
# For development
npx expo prebuild --platform ios
npx expo run:ios

# For production (EAS Build)
eas build --platform ios
```

### Step 6: Test Universal Links

1. Build and install the app on a physical iOS device (Universal Links don't work reliably in simulator)
2. Send a test verification email
3. Click the verification link in the email app
4. The app should open instead of Safari

## How It Works

1. User receives email with link: `https://bookyolo.com/verify-email?token=abc123`
2. User clicks link on iPhone
3. iOS checks for `apple-app-site-association` file on bookyolo.com
4. iOS verifies the app is installed and matches the Team ID
5. If app is installed: Opens the app with the URL
6. If app is not installed: Opens in Safari (web app)
7. Your app's deep link handler processes the URL

## Troubleshooting

### Universal Links not working?

1. **Verify file is accessible:**
   - Visit `https://bookyolo.com/.well-known/apple-app-site-association`
   - Must return JSON (not 404 or HTML)

2. **Check Content-Type header:**
   - Must be `application/json`
   - Check in browser DevTools Network tab

3. **Verify Team ID:**
   - Must match your Apple Developer Team ID exactly
   - Format: `TEAM_ID.com.bookyolo.app`

4. **Test on physical device:**
   - Universal Links don't work reliably in iOS Simulator
   - Must test on real iPhone

5. **Rebuild app after changes:**
   - Changes to `app.json` require rebuilding
   - Old builds won't have Universal Links support

6. **Check associatedDomains in app.json:**
   - Must include: `applinks:bookyolo.com` and `applinks:www.bookyolo.com`

### Still not working?

1. Delete and reinstall the app (Universal Links are cached)
2. Long-press the link - should show "Open in BookYolo" option
3. Check Apple's validator: https://search.developer.apple.com/appsearch-validation-tool/

## Notes

- Universal Links only work on physical devices (not reliably in simulator)
- The file must be served over HTTPS
- Changes may take a few minutes to propagate
- Users may need to delete and reinstall the app after first setup

## References

- [Apple Universal Links Documentation](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
- [Expo Universal Links Guide](https://docs.expo.dev/guides/linking/#universal-links)




