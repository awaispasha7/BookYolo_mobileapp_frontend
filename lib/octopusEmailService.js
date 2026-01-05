// Octopus Email Service Integration
// This service handles adding users to Octopus contacts after email verification

class OctopusEmailService {
  constructor() {
    // These would typically come from environment variables or config
    // Since we're not touching the backend, we'll use the API endpoint directly
    this.apiBaseUrl = 'https://bookyolo-backend.vercel.app'; // Your backend URL
  }

  /**
   * Add a new user to Octopus contacts with "New User" tag
   * This should be called after successful email verification
   * @param {string} email - User's email address
   * @param {string} fullName - User's full name
   * @param {string} userId - User's ID (optional)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async addUserToContacts(email, fullName, userId = null) {
    try {
      // Call the backend endpoint that handles Octopus integration
      const response = await fetch(`${this.apiBaseUrl}/octopus/add-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          fullName: fullName,
          userId: userId,
          tags: ['New User'], // Add the "New User" tag
          source: 'mobile_app' // Track that this came from mobile app
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      // console.error('Octopus Email Service Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to add user to contacts'
      };
    }
  }

  /**
   * Update user tags in Octopus (e.g., when user upgrades plan)
   * @param {string} email - User's email address
   * @param {string[]} tags - Array of tags to add
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateUserTags(email, tags) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/octopus/update-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          tags: tags
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      // console.error('Octopus Email Service Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update user tags'
      };
    }
  }

  /**
   * Check if user exists in Octopus contacts
   * @param {string} email - User's email address
   * @returns {Promise<{success: boolean, exists: boolean, error?: string}>}
   */
  async checkUserExists(email) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/octopus/check-contact?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        exists: data.exists || false,
        data: data
      };
    } catch (error) {
      // console.error('Octopus Email Service Error:', error);
      return {
        success: false,
        exists: false,
        error: error.message || 'Failed to check user existence'
      };
    }
  }

  /**
   * Send a test email to verify Octopus integration
   * @param {string} email - Test email address
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async sendTestEmail(email) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/octopus/send-test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          testType: 'integration_test'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      // console.error('Octopus Email Service Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send test email'
      };
    }
  }
}

// Create and export a singleton instance
const octopusEmailService = new OctopusEmailService();
export default octopusEmailService;


