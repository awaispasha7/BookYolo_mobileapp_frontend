# 🔍 API Integration Debug Guide

## Overview
This guide helps you troubleshoot API integration issues between the React Native frontend and FastAPI backend.

## 🚀 Backend API Endpoints

### Base URL
```
https://bookyolo-backend.vercel.app
```

### Key Endpoints
- **Health Check**: `GET /health`
- **Authentication**: `POST /auth/login`, `POST /auth/signup`
- **User Profile**: `GET /me`
- **Scanning**: `POST /scan`
- **Comparison**: `POST /compare`
- **History**: `GET /my-scans`
- **Referrals**: `GET /referral/stats`, `GET /referral/link`
- **Payments**: `POST /stripe/create-checkout`

## 🔍 Debug Statement Categories

### 1. API Client Debug (`apiClient.js`)
- **🚀 API REQUEST**: Request details (method, URL, headers, body)
- **📡 API RESPONSE**: Response status and headers
- **📊 API DATA**: Response data content
- **✅ API SUCCESS**: Successful API calls
- **❌ API ERROR**: API errors with details
- **❌ API FETCH ERROR**: Network/fetch errors

### 2. Authentication Debug (`AuthProvider.js`)
- **🔐 AUTH**: Authentication flow (login, signup, token management)
- **🏥 HEALTH**: Backend connectivity checks

### 3. Screen-Specific Debug

#### Scan Screen (`ScanScreen.js`)
- **🔍 SCAN**: Scan process (validation, API calls, results)

#### Compare Screen (`CompareScreen.js`)
- **🔄 COMPARE**: Comparison process (loading scans, comparing, results)

#### History Screen (`HistoryScreen.js`)
- **📚 HISTORY**: Scan history loading and display

#### Upgrade Screen (`UpgradeScreen.js`)
- **💳 UPGRADE**: Payment process (checkout creation, URL handling)

#### Referral Screen (`ReferralScreen.js`)
- **👥 REFERRAL**: Referral data loading and management

## 🐛 Common Issues & Solutions

### 1. Authentication Issues

#### Problem: "Missing Authorization" or 401 errors
**Debug Steps:**
1. Check console for `🔐 AUTH: Retrieved token from storage`
2. Verify token exists: `hasToken: true`
3. Check token format: `tokenPreview: "eyJhbGciOiJIUzI1NiIs..."`
4. Verify backend health: `🔐 AUTH: Backend health check`

**Solutions:**
- Ensure user is logged in
- Check if token is expired
- Verify backend is running
- Check CORS settings

#### Problem: Login fails with "Invalid credentials"
**Debug Steps:**
1. Check `🔐 AUTH: Login API response`
2. Verify email/password format
3. Check backend response structure

**Solutions:**
- Verify email format (lowercase)
- Check password requirements (8+ characters)
- Ensure user exists in database

### 2. Scanning Issues

#### Problem: Scan fails with "Limit reached"
**Debug Steps:**
1. Check `🔍 SCAN: API response received`
2. Look for `status: 402` in response
3. Check user plan and limits

**Solutions:**
- Upgrade to Premium plan
- Check scan balance
- Verify user limits

#### Problem: Scan fails with "Invalid URL"
**Debug Steps:**
1. Check `🔍 SCAN: Link validation passed`
2. Verify Airbnb URL format
3. Check URL validation regex

**Solutions:**
- Ensure URL is valid Airbnb link
- Check URL format: `https://airbnb.com/rooms/...`
- Verify URL is not malformed

### 3. Comparison Issues

#### Problem: "Please scan both listings first"
**Debug Steps:**
1. Check `🔄 COMPARE: Load scans response`
2. Verify scans exist in history
3. Check scan URLs match

**Solutions:**
- Scan both listings first
- Ensure scans are in user's history
- Check URL matching logic

### 4. History Issues

#### Problem: No scans showing in history
**Debug Steps:**
1. Check `📚 HISTORY: API response received`
2. Verify `dataLength: 0` or empty array
3. Check user authentication

**Solutions:**
- Ensure user is logged in
- Check if scans exist in database
- Verify API endpoint response

### 5. Network Issues

#### Problem: "Network error occurred"
**Debug Steps:**
1. Check `❌ API FETCH ERROR` logs
2. Verify backend URL is correct
3. Check internet connectivity

**Solutions:**
- Verify backend is running
- Check network connection
- Test backend health endpoint

## 🔧 Debugging Steps

### 1. Check Backend Connectivity
```javascript
// Look for this in console:
🔐 AUTH: Testing backend connectivity
🔐 AUTH: Backend health check { hasData: true, data: { status: "ok" } }
```

### 2. Verify Authentication
```javascript
// Look for this sequence:
🔐 AUTH: Retrieved token from storage { hasToken: true }
🔐 AUTH: Token found, fetching user data
🔐 AUTH: User data response { hasData: true, data: { user: {...} } }
🔐 AUTH: Valid token, setting user
```

### 3. Test API Calls
```javascript
// For scanning:
🔍 SCAN: Starting scan process
🔍 SCAN: Link validation passed, starting scan
🔍 SCAN: Calling API to scan listing
🚀 API REQUEST: { method: "POST", endpoint: "/scan", ... }
📡 API RESPONSE: { status: 200, ok: true, ... }
✅ API SUCCESS: { data: {...} }
```

### 4. Check Error Responses
```javascript
// Look for error patterns:
❌ API ERROR: { status: 402, error: "Limit reached" }
❌ API FETCH ERROR: { error: "Network error occurred" }
```

## 📱 Testing Checklist

### 1. Authentication Flow
- [ ] App starts and checks auth status
- [ ] Backend health check passes
- [ ] Login with valid credentials works
- [ ] Token is stored and retrieved
- [ ] User data is loaded correctly

### 2. Scanning Flow
- [ ] URL validation works
- [ ] Scan API call succeeds
- [ ] Results are displayed correctly
- [ ] Error handling works for limits

### 3. Comparison Flow
- [ ] Scan history loads
- [ ] Listings can be selected
- [ ] Comparison API call succeeds
- [ ] Results are displayed

### 4. History Flow
- [ ] Scan history loads
- [ ] Listings are displayed
- [ ] Navigation works correctly

## 🚨 Emergency Debugging

### If Nothing Works
1. Check console for any error messages
2. Verify backend is running: `https://bookyolo-backend.vercel.app/health`
3. Check network connectivity
4. Verify API base URL in `apiClient.js`
5. Check CORS settings in backend

### Quick Health Check
```javascript
// Add this to any screen for testing:
const testAPI = async () => {
  const { data, error } = await apiClient.healthCheck();
  console.log('Health check:', { data, error });
};
```

## 📊 Debug Data Structure

### API Request Log
```javascript
{
  method: "POST",
  endpoint: "/scan",
  url: "https://bookyolo-backend.vercel.app/scan",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer ..." },
  body: { listing_url: "https://airbnb.com/rooms/123" },
  hasToken: true,
  tokenPreview: "eyJhbGciOiJIUzI1NiIs...",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### API Response Log
```javascript
{
  status: 200,
  statusText: "OK",
  headers: { "content-type": "application/json" },
  url: "https://bookyolo-backend.vercel.app/scan",
  ok: true,
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### API Data Log
```javascript
{
  endpoint: "/scan",
  data: { analysis: {...}, label: "Excellent Stay" },
  success: true,
  contentType: "application/json",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

## 🎯 Success Indicators

### ✅ Everything Working
- All API calls return `success: true`
- No error messages in console
- Data loads correctly in all screens
- User can scan, compare, and view history

### ❌ Issues Detected
- Error messages in console
- API calls returning `success: false`
- Empty data in screens
- Authentication failures

---

**Remember**: Always check the console logs first - they contain detailed information about what's happening at each step of the API integration process.






