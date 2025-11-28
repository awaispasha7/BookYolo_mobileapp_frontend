# BookYolo Frontend-Backend Integration Guide

## Overview
This document outlines the complete integration between the React Native frontend and FastAPI backend for the BookYolo application.

## Backend API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-email` - Email verification
- `POST /auth/password-reset` - Request password reset
- `POST /auth/password-reset-confirm` - Confirm password reset

### User Management
- `GET /me` - Get current user profile
- `GET /referral/stats` - Get referral statistics
- `GET /referral/link` - Get referral link

### Scanning & Analysis
- `POST /scan` - Scan Airbnb listing
- `POST /question` - Ask follow-up questions about scans
- `POST /compare` - Compare two listings

### History & Data
- `GET /my-scans` - Get user's scan history
- `GET /chats` - Get chat history
- `GET /chat/{chat_id}` - Get specific chat

### Payment
- `POST /stripe/create-checkout` - Create Stripe checkout session
- `POST /stripe/verify-payment` - Verify payment completion

## Frontend Integration

### API Client (`lib/apiClient.js`)
Centralized API client that handles:
- Authentication token management
- Request/response formatting
- Error handling
- Timeout management

### Authentication Context (`context/AuthProvider.js`)
Updated to use real API calls:
- `signIn()` - Login with email/password
- `signUp()` - Register new user
- `verifyEmail()` - Verify email with token
- `requestPasswordReset()` - Request password reset
- `confirmPasswordReset()` - Confirm password reset
- `signOut()` - Logout user
- `refreshUser()` - Refresh user data

### Screen Integrations

#### 1. LoginScreen (`screens/LoginScreen.js`)
- Integrated with `signIn()` API call
- Real-time validation
- Error handling with user-friendly messages

#### 2. SignUpScreen (`screens/SignUpScreen.js`)
- Integrated with `signUp()` API call
- Email validation
- Terms acceptance
- Referral code support

#### 3. ForgotPasswordScreen (`screens/ForgotPasswordScreen.js`)
- Integrated with `requestPasswordReset()` API call
- Email validation
- Success/error feedback

#### 4. ScanScreen (`screens/ScanScreen.js`)
- Integrated with `scanListing()` API call
- Real-time scanning with loading states
- Error handling for limits and invalid URLs
- Navigation to results with real data

#### 5. ScanResultScreen (`screens/ScanResultScreen.js`)
- Displays real scan analysis data
- Integrated with `askQuestion()` API call
- Real-time Q&A functionality
- Loading states and error handling

#### 6. CompareScreen (`screens/CompareScreen.js`)
- Loads real scan history via `getMyScans()`
- Integrated with `compareListings()` API call
- Real-time comparison results
- Loading states and empty states

#### 7. HistoryScreen (`screens/HistoryScreen.js`)
- Loads real scan history via `getMyScans()`
- Displays formatted scan data
- Navigation to scan results
- Loading and empty states

#### 8. UpgradeScreen (`screens/UpgradeScreen.js`)
- Integrated with `createCheckoutSession()` API call
- Stripe payment integration
- User plan status display
- Restore purchase functionality

#### 9. ReferralScreen (`screens/ReferralScreen.js`)
- Loads real referral data via `getReferralStats()` and `getReferralLink()`
- Displays referral statistics
- Recent referrals list
- Progress tracking

#### 10. AccountScreen (`screens/AccountScreen.js`)
- Displays real user data
- Plan and usage information
- Navigation to other screens

## Key Features Implemented

### 1. Authentication Flow
- Complete signup/login flow
- Email verification
- Password reset functionality
- Token-based authentication
- Automatic token refresh

### 2. Scanning System
- Real Airbnb listing scanning
- AI-powered analysis display
- Follow-up question system
- Scan history management
- Usage limits and upgrade prompts

### 3. Comparison System
- Load user's scan history
- Select listings for comparison
- Real-time comparison analysis
- Results display

### 4. Payment Integration
- Stripe checkout integration
- Premium upgrade flow
- Payment verification
- Plan status management

### 5. Referral System
- Referral code generation
- Statistics tracking
- Recent referrals display
- Progress milestones

### 6. Error Handling
- Network error handling
- API error responses
- User-friendly error messages
- Loading states
- Empty states

### 7. Data Management
- AsyncStorage for token persistence
- Real-time data updates
- Cache management
- State synchronization

## Configuration

### Backend URL
Update the API base URL in `lib/apiClient.js`:
```javascript
const API_BASE_URL = 'https://your-backend-url.vercel.app';
```

### Environment Variables
Ensure your backend has the following environment variables:
- Database connection strings
- OpenAI API key
- Stripe keys
- Email service configuration

## Testing

### 1. Authentication
- Test signup with valid/invalid data
- Test login with correct/incorrect credentials
- Test email verification flow
- Test password reset flow

### 2. Scanning
- Test with valid Airbnb URLs
- Test with invalid URLs
- Test scan limits
- Test follow-up questions

### 3. Comparison
- Test with multiple scans
- Test comparison functionality
- Test empty states

### 4. Payment
- Test upgrade flow
- Test Stripe integration
- Test plan status updates

### 5. Referrals
- Test referral data loading
- Test referral code generation
- Test statistics display

## Error Scenarios Handled

1. **Network Errors**: Connection timeouts, network unavailable
2. **API Errors**: Invalid responses, server errors
3. **Authentication Errors**: Invalid tokens, expired sessions
4. **Validation Errors**: Invalid input data
5. **Limit Errors**: Usage limits reached
6. **Payment Errors**: Stripe integration issues

## Performance Optimizations

1. **Lazy Loading**: Data loaded only when needed
2. **Caching**: Token and user data cached locally
3. **Error Boundaries**: Graceful error handling
4. **Loading States**: User feedback during operations
5. **Optimistic Updates**: Immediate UI updates where possible

## Security Considerations

1. **Token Management**: Secure token storage and refresh
2. **Input Validation**: Client and server-side validation
3. **Error Messages**: No sensitive information in error messages
4. **HTTPS**: All API calls over secure connections
5. **Data Sanitization**: Proper data handling and display

## Future Enhancements

1. **Offline Support**: Cache data for offline usage
2. **Push Notifications**: Real-time updates
3. **Analytics**: User behavior tracking
4. **A/B Testing**: Feature experimentation
5. **Performance Monitoring**: Real-time performance metrics

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check backend URL configuration
   - Verify network connectivity
   - Check backend server status

2. **Authentication Errors**
   - Verify token storage
   - Check token expiration
   - Re-login if necessary

3. **Scan Failures**
   - Verify URL format
   - Check usage limits
   - Verify backend API key

4. **Payment Issues**
   - Check Stripe configuration
   - Verify webhook setup
   - Check payment status

### Debug Mode
Enable debug logging by setting:
```javascript
const DEBUG = true; // In apiClient.js
```

This will log all API requests and responses to the console.

## Support

For technical support or questions about the integration:
1. Check the console logs for error details
2. Verify API endpoint responses
3. Test with different data inputs
4. Check network connectivity
5. Verify backend configuration

## Conclusion

The integration provides a complete, production-ready connection between the React Native frontend and FastAPI backend, with comprehensive error handling, user experience optimizations, and security considerations.






