# Octopus Email Service Integration Guide

## Overview
This integration automatically adds new users to your Octopus email contacts list with the "New User" tag when they successfully verify their email address. This enables your automation workflows to send newsletters and promotional emails to new users.

## How It Works

### 1. User Signup Process
- When a user signs up, their information (email, full name) is temporarily stored locally
- User receives email verification link

### 2. Email Verification Process
- When user clicks verification link and email is verified:
  - User is automatically added to Octopus contacts with "New User" tag
  - Stored user information is cleaned up
  - User can now receive automated emails from your workflows

### 3. Login Process (Backup)
- If a user signs up but doesn't verify immediately, and later logs in:
  - System checks if user exists in Octopus contacts
  - If not found, adds them with "New User" tag

## Files Modified/Created

### New Files:
- `lib/octopusEmailService.js` - Main Octopus integration service
- `components/OctopusTestButton.js` - Test component for debugging
- `OCTOPUS_INTEGRATION_GUIDE.md` - This documentation

### Modified Files:
- `context/AuthProvider.js` - Added Octopus integration to signup, verification, and login flows
- `lib/apiClient.js` - Added methods to store/retrieve user info temporarily

## API Endpoints Expected

The integration expects these backend endpoints to exist:

### POST /octopus/add-contact
Adds a new contact to Octopus with tags.

**Request Body:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "userId": "user123",
  "tags": ["New User"],
  "source": "mobile_app"
}
```

### GET /octopus/check-contact?email=user@example.com
Checks if a contact exists in Octopus.

**Response:**
```json
{
  "exists": true,
  "contact": { ... }
}
```

### POST /octopus/update-tags
Updates contact tags.

**Request Body:**
```json
{
  "email": "user@example.com",
  "tags": ["New User", "Premium"]
}
```

### POST /octopus/send-test-email
Sends a test email to verify integration.

**Request Body:**
```json
{
  "email": "test@example.com",
  "testType": "integration_test"
}
```

## Testing the Integration

### Using the Test Component
Add the `OctopusTestButton` component to any screen for testing:

```javascript
import OctopusTestButton from '../components/OctopusTestButton';

// In your component's render method:
<OctopusTestButton 
  email="test@example.com" 
  fullName="Test User" 
/>
```

### Manual Testing
1. Sign up with a new email address
2. Check your email and click the verification link
3. Check your Octopus contacts - the user should appear with "New User" tag
4. Your automation workflows should now include this user

## Error Handling

The integration is designed to be non-blocking:
- If Octopus integration fails, user verification still succeeds
- Errors are logged to console for debugging
- Users can still use the app even if email marketing fails

## Configuration

The Octopus service uses your backend API URL from `apiClient.js`:
```javascript
this.apiBaseUrl = 'https://bookyolo-backend.vercel.app';
```

Make sure your backend has the Octopus API configured and the endpoints are working.

## Troubleshooting

### Common Issues:

1. **User not added to Octopus contacts**
   - Check backend logs for Octopus API errors
   - Verify Octopus API credentials in backend
   - Check network connectivity

2. **Test component shows errors**
   - Verify backend endpoints are implemented
   - Check API URL configuration
   - Test with a real email address

3. **Users not receiving automated emails**
   - Verify "New User" tag is correctly applied
   - Check your Octopus automation workflows
   - Ensure workflows are targeting the "New User" tag

## Future Enhancements

- Add user plan-based tags (e.g., "Premium User", "Free User")
- Implement user preference management
- Add unsubscribe functionality
- Track email engagement metrics


