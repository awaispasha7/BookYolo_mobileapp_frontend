// API Client for BookYolo Backend Integration
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend API Configuration
const API_BASE_URL = 'https://bookyolo-backend.vercel.app'; // Update with your actual backend URL
// const API_BASE_URL = '192.168.100.12:8000'; // Update with your actual backend URL
// const API_BASE_URL = 'http://192.168.100.12:8000'; // Update with your actual backend URL

const API_TIMEOUT = 30000; // 30 seconds

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = API_TIMEOUT;
  }

  // Get stored auth token
  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      return null;
    }
  }

  // Store auth token
  async setAuthToken(token) {
    try {
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      // Silent error handling
    }
  }

  // Store user info temporarily for email verification
  async setUserInfo(userInfo) {
    try {
      await AsyncStorage.setItem('pending_user_info', JSON.stringify(userInfo));
    } catch (error) {
      // Silent error handling
    }
  }

  // Get stored user info
  async getUserInfo() {
    try {
      const userInfo = await AsyncStorage.getItem('pending_user_info');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      return null;
    }
  }

  // Clear stored user info
  async clearUserInfo() {
    try {
      await AsyncStorage.removeItem('pending_user_info');
    } catch (error) {
      // Silent error handling
    }
  }

  // Remove auth token
  async removeAuthToken() {
    try {
      await AsyncStorage.removeItem('auth_token');
    } catch (error) {
      // Silent error handling
    }
  }

  // Make HTTP request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      timeout: this.timeout,
      ...options,
    };


    try {
      const response = await fetch(url, config);
      

      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }


      if (!response.ok) {
        // console.log('Backend error response:', {
        //   status: response.status,
        //   statusText: response.statusText,
        //   data: data,
        //   dataType: typeof data
        // });
        
        // Better error handling for different response types
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        
        if (data) {
          if (typeof data === 'string') {
            errorMsg = data;
          } else if (data.detail) {
            // Handle validation errors from backend
            if (Array.isArray(data.detail)) {
              // Extract the first validation error message
              const firstError = data.detail[0];
              if (firstError && firstError.msg) {
                errorMsg = firstError.msg;
              } else {
                errorMsg = JSON.stringify(data.detail);
              }
            } else {
              errorMsg = data.detail;
            }
          } else if (data.message) {
            errorMsg = data.message;
          } else if (data.error) {
            errorMsg = data.error;
          } else {
            // If data is an object but doesn't have expected fields, stringify it
            errorMsg = JSON.stringify(data);
          }
        }
        
        // console.log('Final error message from backend:', errorMsg);
        throw new Error(errorMsg);
      }

      return { data, error: null };
    } catch (error) {
      // console.log('API Client catch error:', error);
      // console.log('Error type:', typeof error);
      // console.log('Error message:', error.message);
      // console.log('Error toString:', error.toString());
      
      // Handle different error types - return as string, not object
      let errorMessage = 'Network error occurred';
      if (error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && error.toString) {
        errorMessage = error.toString();
      }
      
      // console.log('API Client returning error as string:', errorMessage);
      return { data: null, error: errorMessage };
    }
  }

  // Health check method
  async healthCheck() {
    return this.request('/health');
  }

  // Authentication Methods - Matching Web Frontend
  async signup(firstName, email, password, confirmPassword, referralCode = null) {
    // Web frontend sends: { firstName, email, password, confirmPassword }
    // Referral code is tracked separately via /referral/track-signup after signup
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        firstName, // Web frontend uses firstName
        email,
        password,
        confirmPassword,
      }),
    });
  }

  // Track referral signup (matching web frontend)
  async trackReferralSignup(referralCode, userEmail, userId) {
    return this.request('/referral/track-signup', {
      method: 'POST',
      body: JSON.stringify({
        referral_code: referralCode,
        user_email: userEmail,
        user_id: userId,
      }),
    });
  }

  async login(email, password) {
    const { data, error } = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data && data.token) {
      await this.setAuthToken(data.token);
    }

    return { data, error };
  }

  async verifyEmail(token) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Mobile-specific email verification (uses same endpoint as web)
  async verifyEmailMobile(token) {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Resend verification email (placeholder - would need backend support)
  async resendVerificationEmail(email) {
    // For now, just show a message that user should check their email
    return { data: { message: 'Please check your email for the verification link' }, error: null };
  }

  async requestPasswordReset(email) {
    return this.request('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Confirm password reset (matching web frontend)
  async confirmPasswordReset(token, newPassword) {
    return this.request('/auth/password-reset-confirm', {
      method: 'POST',
      body: JSON.stringify({ 
        token,
        new_password: newPassword 
      }),
    });
  }


  async logout() {
    await this.removeAuthToken();
    return { data: { success: true }, error: null };
  }

  // User Profile Methods
  async getCurrentUser() {
    return this.request('/me');
  }

  async updateProfile(fullName, email, newPassword, confirmPassword) {
    const body = {};
    if (fullName !== undefined && fullName !== null) {
      body.full_name = fullName;
    }
    if (email !== undefined && email !== null) {
      body.email = email;
    }
    if (newPassword !== undefined && newPassword !== null && newPassword !== '') {
      body.new_password = newPassword;
      body.confirm_password = confirmPassword;
    }
    return this.request('/update-profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteAccount(confirmText) {
    return this.request('/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ confirm_text: confirmText }),
    });
  }

  // Get referral stats - matching web frontend (with user ID in path)
  async getReferralStats(userId = null) {
    // Web frontend uses: /referral/stats/${user.user.id}
    if (userId) {
      return this.request(`/referral/stats/${userId}`);
    }
    // Fallback to base endpoint if no user ID provided
    return this.request('/referral/stats');
  }

  async getReferralLink() {
    return this.request('/referral/link');
  }

  // Scanning Methods
  async scanListing(listingUrl) {
    return this.request('/chat/new-scan', {
      method: 'POST',
      body: JSON.stringify({ listing_url: listingUrl }),
    });
  }

  async askQuestion(questionOrPayload) {
    // Handle both old format (just question string) and new format (payload object)
    const payload = typeof questionOrPayload === 'string' 
      ? { question: questionOrPayload }
      : questionOrPayload;
      
    return this.request('/question', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Comparison Methods
  async compareListings(scanAUrl, scanBUrl, question = null) {
    return this.request('/compare', {
      method: 'POST',
      body: JSON.stringify({
        scan_a_url: scanAUrl,
        scan_b_url: scanBUrl,
        question,
      }),
    });
  }

  // History Methods
  async getMyScans() {
    return this.request('/my-scans');
  }

  // Get scan details by ID (matching web frontend)
  async getScanById(scanId) {
    return this.request(`/scan/${scanId}`);
  }

  // Get scan result by URL (this will re-scan if needed)
  async getScanResultByUrl(listingUrl) {
    return this.request('/chat/new-scan', {
      method: 'POST',
      body: JSON.stringify({ listing_url: listingUrl }),
    });
  }

  async getChats() {
    return this.request('/chats');
  }

  async getChat(chatId) {
    return this.request(`/chat/${chatId}`);
  }

  async createNewScan(listingUrl) {
    return this.request('/chat/new-scan', {
      method: 'POST',
      body: JSON.stringify({ listing_url: listingUrl }),
    });
  }

  async askChatQuestion(chatId, question) {
    return this.request(`/chat/${chatId}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // Pre-scan ask (for questions before scanning a listing)
  async preScanAsk(question) {
    return this.request('/chat/pre-scan/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // Save compare result to database (matching web frontend)
  async saveCompare(scanAUrl, scanBUrl, answer, question = null) {
    return this.request('/save-compare', {
      method: 'POST',
      body: JSON.stringify({
        scan_a_url: scanAUrl,
        scan_b_url: scanBUrl,
        answer,
        question,
      }),
    });
  }

  async createNewCompare(scanAUrl, scanBUrl, question = null) {
    // This method is kept for backward compatibility
    // Web frontend uses /compare endpoint directly
    return this.compareListings(scanAUrl, scanBUrl, question);
  }

  // Payment Methods - Matching Web Frontend
  async createCheckoutSession(priceId = 'premium_yearly') {
    // Web frontend doesn't send price_id, just POST to /stripe/create-checkout
    return this.request('/stripe/create-checkout', {
      method: 'POST',
      body: JSON.stringify({ price_id: priceId }),
    });
  }

  async verifyPayment(sessionId) {
    return this.request('/stripe/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }

  // Cancel subscription (matching web frontend)
  async cancelSubscription() {
    return this.request('/stripe/cancel-subscription', {
      method: 'POST',
    });
  }

  // Temporary method to reset user to free plan for testing
  async resetToFreePlan() {
    return this.request('/stripe/reset-to-free', {
      method: 'POST',
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  // Scan Balance
  async getScanBalanceHistory() {
    return this.request('/scan-balance/history');
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();
export default apiClient;
