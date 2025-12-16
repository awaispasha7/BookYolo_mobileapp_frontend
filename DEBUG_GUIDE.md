# 🔍 Comprehensive Debug Guide for BookYolo Mobile App

## Overview
This guide provides detailed debug statements and error tracking for all major functionality in your BookYolo mobile app. Each section includes specific console.log statements that will help you identify issues and track the flow of data.

## 🚀 Debug Categories

### 1. API Client Debugging
**File:** `lib/apiClient.js`

**Debug Statements:**
- `🚀 API REQUEST:` - Shows all outgoing API requests
- `📡 API RESPONSE:` - Shows HTTP response details
- `📊 API DATA:` - Shows response data content
- `✅ API SUCCESS:` - Confirms successful API calls
- `❌ API ERROR:` - Shows API errors with details
- `❌ API FETCH ERROR:` - Shows network/fetch errors

**What to Look For:**
```javascript
// Example successful request:
🚀 API REQUEST: {
  method: "POST",
  endpoint: "/auth/login",
  url: "https://bookyolo-backend.vercel.app/auth/login",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer eyJ..." },
  body: { email: "user@example.com", password: "password123" },
  hasToken: true,
  tokenPreview: "eyJhbGciOiJIUzI1NiIs...",
  timestamp: "2024-01-15T10:30:00.000Z"
}

📡 API RESPONSE: {
  status: 200,
  statusText: "OK",
  headers: { "content-type": "application/json" },
  url: "https://bookyolo-backend.vercel.app/auth/login",
  ok: true,
  timestamp: "2024-01-15T10:30:01.000Z"
}

✅ API SUCCESS: {
  endpoint: "/auth/login",
  data: { user: { id: 1, email: "user@example.com", plan: "free" }, token: "eyJ..." },
  timestamp: "2024-01-15T10:30:01.000Z"
}
```

### 2. Authentication Debugging
**File:** `context/AuthProvider.js`

**Debug Statements:**
- `🔐 AUTH: Checking auth status on app start` - App initialization
- `🔐 AUTH: Retrieved token from storage` - Token retrieval
- `🔐 AUTH: Token found, fetching user data` - User data fetch
- `🔐 AUTH: Valid token, setting user` - Successful login
- `🔐 AUTH: Starting login process` - Login attempt
- `🔐 AUTH: Login API response` - Login response
- `🔐 AUTH: Login successful, setting user` - Login success

### 3. Login Screen Debugging
**File:** `screens/LoginScreen.js`

**Debug Statements:**
- `🔑 LOGIN: Starting login process` - Login initiation
- `🔑 LOGIN: Missing credentials` - Validation error
- `🔑 LOGIN: Invalid email format` - Email validation
- `🔑 LOGIN: Validation passed, starting login` - Validation success
- `🔑 LOGIN: Calling signIn function` - API call
- `🔑 LOGIN: SignIn response received` - API response
- `🔑 LOGIN: Login successful, navigating to MainTabs` - Success flow
- `🔑 LOGIN: Login failed with error` - Error handling

### 4. SignUp Screen Debugging
**File:** `screens/SignUpScreen.js`

**Debug Statements:**
- `📝 SIGNUP: Starting signup process` - Signup initiation
- `📝 SIGNUP: Missing required fields` - Validation error
- `📝 SIGNUP: Invalid email format` - Email validation
- `📝 SIGNUP: Passwords do not match` - Password validation
- `📝 SIGNUP: Password too short` - Password length validation
- `📝 SIGNUP: Terms not agreed to` - Terms validation
- `📝 SIGNUP: Validation passed, starting signup` - Validation success
- `📝 SIGNUP: SignUp response received` - API response
- `📝 SIGNUP: Signup successful, navigating to email verification` - Success flow

### 5. Forgot Password Debugging
**File:** `screens/ForgotPasswordScreen.js`

**Debug Statements:**
- `🔒 FORGOT: Starting password reset process` - Reset initiation
- `🔒 FORGOT: No email provided` - Validation error
- `🔒 FORGOT: Invalid email format` - Email validation
- `🔒 FORGOT: Validation passed, starting password reset` - Validation success
- `🔒 FORGOT: Password reset response received` - API response
- `🔒 FORGOT: Password reset successful, showing success alert` - Success flow
- `🔒 FORGOT: User confirmed, navigating to login` - Navigation

### 6. Email Verification Debugging
**File:** `screens/EmailVerificationScreen.js`

**Debug Statements:**
- `📧 VERIFY: Starting email verification process` - Verification initiation
- `📧 VERIFY: No verification token provided` - Token validation
- `📧 VERIFY: Token provided, starting verification` - Token validation success
- `📧 VERIFY: Verification response received` - API response
- `📧 VERIFY: Email verification successful, setting success status` - Success flow
- `📧 VERIFY: Auto-navigating to login after success` - Auto navigation
- `📧 VERIFY: Manual verification requested` - Manual verification
- `📧 VERIFY: Resend email requested` - Resend action
- `📧 VERIFY: Opening email app` - Email app action

**What to Look For:**
```javascript
// Successful login flow:
🔑 LOGIN: Starting login process { email: "user@example.com", passwordLength: 12, loading: false, emailError: "" }
🔑 LOGIN: Validation passed, starting login
🔑 LOGIN: Calling signIn function
🔑 LOGIN: SignIn response received { hasData: true, hasError: false, data: {...}, error: null }
🔑 LOGIN: Login successful, navigating to MainTabs { user: { id: 1, email: "user@example.com", plan: "free" } }

// Successful signup flow:
📝 SIGNUP: Starting signup process { name: "John Doe", email: "john@example.com", passwordLength: 12, agreeToTerms: true }
📝 SIGNUP: Validation passed, starting signup
📝 SIGNUP: Calling signUp function
📝 SIGNUP: SignUp response received { hasData: true, hasError: false, data: {...}, error: null }
📝 SIGNUP: Signup successful, navigating to email verification { message: "Please check your email..." }

// Successful password reset flow:
🔒 FORGOT: Starting password reset process { email: "user@example.com", loading: false }
🔒 FORGOT: Validation passed, starting password reset
🔒 FORGOT: Password reset response received { hasData: true, hasError: false, data: {...}, error: null }
🔒 FORGOT: Password reset successful, showing success alert

// Successful email verification flow:
📧 VERIFY: Starting email verification process { token: "eyJhbGciOiJIUzI1NiIs...", tokenLength: 150 }
📧 VERIFY: Token provided, starting verification
📧 VERIFY: Verification response received { hasData: true, hasError: false, data: {...}, error: null }
📧 VERIFY: Email verification successful, setting success status
📧 VERIFY: Auto-navigating to login after success
```

### 7. Scan Functionality Debugging
**File:** `screens/ScanScreen.js`

**Debug Statements:**
- `🔍 SCAN: Starting scan process` - Scan initiation
- `🔍 SCAN: Link validation passed, starting scan` - Validation success
- `🔍 SCAN: Calling API to scan listing` - API call
- `🔍 SCAN: API response received` - API response
- `🔍 SCAN: Scan successful, navigating to results` - Success flow
- `🔍 SCAN: Scan failed with error` - Error handling

**What to Look For:**
```javascript
// Successful scan flow:
🔍 SCAN: Starting scan process { link: "https://airbnb.com/rooms/123", isScanning: false, linkLength: 25 }
🔍 SCAN: Link validation passed, starting scan { link: "https://airbnb.com/rooms/123" }
🔍 SCAN: Calling API to scan listing
🔍 SCAN: API response received { hasData: true, hasError: false, data: {...}, error: null }
🔍 SCAN: Scan successful, navigating to results { analysis: {...}, link: "https://airbnb.com/rooms/123" }
```

### 8. Chat/Question Debugging
**File:** `screens/ScanResultScreen.js`

**Debug Statements:**
- `💬 CHAT: Starting question process` - Question initiation
- `💬 CHAT: Adding user message to chat` - Message addition
- `💬 CHAT: Calling API to ask question` - API call
- `💬 CHAT: API response received` - API response
- `💬 CHAT: Question successful, adding AI response` - Success flow
- `💬 CHAT: Question failed with error` - Error handling

**What to Look For:**
```javascript
// Successful question flow:
💬 CHAT: Starting question process { question: "Is this listing safe?", isAsking: false, questionLength: 20 }
💬 CHAT: Adding user message to chat
💬 CHAT: Calling API to ask question { question: "Is this listing safe?" }
💬 CHAT: API response received { hasData: true, hasError: false, data: {...}, error: null }
💬 CHAT: Question successful, adding AI response { answer: "Based on the analysis..." }
```

### 9. Comparison Debugging
**File:** `screens/CompareScreen.js`

**Debug Statements:**
- `🔄 COMPARE: Starting comparison process` - Comparison initiation
- `🔄 COMPARE: Starting comparison API call` - API call
- `🔄 COMPARE: API response received` - API response
- `🔄 COMPARE: Comparison successful, setting result` - Success flow
- `🔄 COMPARE: Comparison failed with error` - Error handling

**What to Look For:**
```javascript
// Successful comparison flow:
🔄 COMPARE: Starting comparison process { 
  selectedCount: 2, 
  selectedListings: [{ id: 1, url: "https://airbnb.com/rooms/123" }, { id: 2, url: "https://airbnb.com/rooms/456" }] 
}
🔄 COMPARE: Starting comparison API call
🔄 COMPARE: API response received { hasData: true, hasError: false, data: {...}, error: null }
🔄 COMPARE: Comparison successful, setting result { result: {...} }
```

### 10. History Debugging
**File:** `screens/HistoryScreen.js`

**Debug Statements:**
- `📚 HISTORY: Starting to load scan history` - History loading
- `📚 HISTORY: API response received` - API response
- `📚 HISTORY: Setting history data` - Data setting
- `📚 HISTORY: History loading completed` - Completion

**What to Look For:**
```javascript
// Successful history load:
📚 HISTORY: Starting to load scan history
📚 HISTORY: API response received { hasData: true, hasError: false, data: [...], error: null, dataLength: 5 }
📚 HISTORY: Setting history data { historyCount: 5 }
📚 HISTORY: History loading completed
```

### 11. Upgrade/Payment Debugging
**File:** `screens/UpgradeScreen.js`

**Debug Statements:**
- `💳 UPGRADE: Starting upgrade process` - Upgrade initiation
- `💳 UPGRADE: Creating checkout session` - Checkout creation
- `💳 UPGRADE: Checkout session response` - API response
- `💳 UPGRADE: Checkout URL received, opening browser` - URL handling
- `💳 UPGRADE: Opening checkout URL` - Browser opening

**What to Look For:**
```javascript
// Successful upgrade flow:
💳 UPGRADE: Starting upgrade process { userPlan: "free", loading: false }
💳 UPGRADE: Creating checkout session
💳 UPGRADE: Checkout session response { hasData: true, hasError: false, data: {...}, error: null }
💳 UPGRADE: Checkout URL received, opening browser { url: "https://checkout.stripe.com/...", urlLength: 150 }
💳 UPGRADE: URL support check { supported: true }
💳 UPGRADE: Opening checkout URL
```

### 12. Referral Debugging
**File:** `screens/ReferralScreen.js`

**Debug Statements:**
- `👥 REFERRAL: Starting to load referral data` - Data loading
- `👥 REFERRAL: Loading referral stats` - Stats loading
- `👥 REFERRAL: Referral stats response` - Stats response
- `👥 REFERRAL: Setting referral stats` - Stats setting
- `👥 REFERRAL: Loading referral link` - Link loading
- `👥 REFERRAL: Setting referral code` - Code setting

**What to Look For:**
```javascript
// Successful referral data load:
👥 REFERRAL: Starting to load referral data
👥 REFERRAL: Loading referral stats
👥 REFERRAL: Referral stats response { hasData: true, hasError: false, data: {...}, error: null }
👥 REFERRAL: Setting referral stats { 
  totalReferrals: 5, 
  successfulReferrals: 3, 
  scansAvailable: 10, 
  currentRank: "Silver", 
  recentReferralsCount: 2 
}
👥 REFERRAL: Loading referral link
👥 REFERRAL: Referral link response { hasData: true, hasError: false, data: {...}, error: null }
👥 REFERRAL: Setting referral code { code: "ABC123" }
```

## 🚨 Common Error Patterns

### 1. Network Errors
```javascript
❌ API FETCH ERROR [/auth/login]: {
  error: "Network request failed",
  stack: "Error: Network request failed\n    at fetch...",
  url: "https://bookyolo-backend.vercel.app/auth/login",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```
**Solution:** Check internet connection, verify backend URL

### 2. Authentication Errors
```javascript
🔐 AUTH: Login failed { error: "Invalid credentials", email: "user@example.com" }
```
**Solution:** Check email/password, verify user exists

### 3. API Response Errors
```javascript
❌ API ERROR: {
  endpoint: "/scan",
  status: 402,
  error: "Limit reached. Consider upgrading to Premium for more scans.",
  data: {...},
  timestamp: "2024-01-15T10:30:00.000Z"
}
```
**Solution:** User hit scan limit, need to upgrade

### 4. Validation Errors
```javascript
🔍 SCAN: Invalid Airbnb link { link: "https://google.com" }
```
**Solution:** User entered non-Airbnb URL

## 🔧 Debugging Steps

### 1. Check Console Logs
Open your development console and look for the debug statements above.

### 2. Test Each Feature
1. **Login/Signup:** Check authentication flow
2. **Scan:** Test with valid Airbnb URL
3. **Chat:** Ask questions after scanning
4. **Compare:** Select two listings and compare
5. **History:** Check if scans appear
6. **Upgrade:** Test payment flow
7. **Referral:** Check referral data loading

### 3. Common Issues to Check

**Backend Connection:**
- Verify `API_BASE_URL` in `apiClient.js`
- Check if backend is running
- Test with `curl` or Postman

**Authentication:**
- Check if token is stored in AsyncStorage
- Verify token format and expiration
- Check if user data is properly set

**API Responses:**
- Look for HTTP status codes (200, 400, 401, 402, 500)
- Check response data structure
- Verify error messages

**Network Issues:**
- Check internet connection
- Verify CORS settings
- Check if backend is accessible

## 📱 Testing on Device

### 1. Enable Remote Debugging
```javascript
// In your app, add this for more detailed logging
console.log('Device Info:', {
  platform: Platform.OS,
  version: Platform.Version,
  isDevice: !__DEV__,
  timestamp: new Date().toISOString()
});
```

### 2. Check AsyncStorage
```javascript
// Add this to debug token storage
const debugToken = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  console.log('🔐 TOKEN DEBUG:', { 
    hasToken: !!token, 
    tokenLength: token?.length,
    tokenPreview: token?.substring(0, 20) + '...'
  });
};
```

### 3. Monitor API Calls
All API calls are logged with detailed information. Look for:
- Request details (method, URL, headers, body)
- Response details (status, headers, data)
- Error details (message, stack trace)

## 🎯 Quick Debug Checklist

- [ ] Check console for debug statements
- [ ] Verify API base URL is correct
- [ ] Test network connectivity
- [ ] Check authentication token
- [ ] Verify user data is loaded
- [ ] Test each screen functionality
- [ ] Check error messages and alerts
- [ ] Verify data is displayed correctly

## 📞 Troubleshooting

If you see specific error patterns, check:

1. **"Network request failed"** → Backend connectivity
2. **"Invalid credentials"** → Authentication issues
3. **"Limit reached"** → User hit usage limits
4. **"Invalid URL"** → Input validation
5. **"Unexpected error"** → Check stack trace

This debug system will help you identify exactly where issues occur in your app flow! 🚀
