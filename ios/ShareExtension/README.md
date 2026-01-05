# BookYolo Share Extension

This directory contains the native iOS Share Extension code that enables "Scan with BookYolo" to appear in the iOS share sheet.

## Files

- **ShareViewController.swift** - Main Share Extension controller that handles shared URLs
- **Info.plist** - Share Extension configuration and activation rules

## Integration

These files need to be manually integrated into your Xcode project:

1. After running `npx expo prebuild --platform ios`, open the project in Xcode
2. Add a Share Extension target (File → New → Target → Share Extension)
3. Replace the default Share Extension files with the files from this directory
4. Configure the Share Extension target as described in `SHARE_EXTENSION_SETUP.md`

## How It Works

1. User shares a URL from Safari or any app
2. ShareViewController receives the URL
3. Opens the main app via deep link: `bookyolo://scan?url=...`
4. Main app's deep link handler processes the URL
5. App navigates to Scan screen with URL pre-filled and auto-scans

## Deep Link Format

The Share Extension uses the following deep link format:

```
bookyolo://scan?url=[ENCODED_URL]
```

Example:
```
bookyolo://scan?url=https%3A%2F%2Fwww.airbnb.com%2Frooms%2F12345
```

The deep link handler in `lib/deepLinkHandler.js` processes this and navigates to the Scan screen.










