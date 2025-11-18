// Deep Link Handler for Email Verification
import { Linking } from 'react-native';

class DeepLinkHandler {
  constructor() {
    this.initialUrl = null;
    this.urlListener = null;
  }

  // Initialize deep link handling
  init() {
    // Get initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.initialUrl = url;
        this.handleDeepLink(url);
      }
    });

    // Listen for deep links while app is running
    this.urlListener = Linking.addEventListener('url', (event) => {
      this.handleDeepLink(event.url);
    });
  }

  // Handle deep link URL
  handleDeepLink(url) {
    // console.log('🔗 DEEP LINK: Received URL:', url);
    
    try {
      const urlObj = new URL(url);
      // console.log('🔗 DEEP LINK: Parsed URL:', {
      //   protocol: urlObj.protocol,
      //   hostname: urlObj.hostname,
      //   pathname: urlObj.pathname,
      //   search: urlObj.search,
      //   searchParams: Object.fromEntries(urlObj.searchParams.entries())
      // });
      
      // Check if it's a referral signup link (matching web frontend format)
      if (urlObj.pathname.includes('/signup') && urlObj.searchParams.has('ref')) {
        const referralCode = urlObj.searchParams.get('ref');
        // console.log('🔗 DEEP LINK: Referral signup detected', { 
        //   referralCode,
        //   isWebUrl: urlObj.protocol === 'http:' || urlObj.protocol === 'https:',
        //   isDeepLink: urlObj.protocol === 'bookyolo:'
        // });
        
        if (referralCode) {
          // Navigate to signup screen with referral code
          this.navigateToSignup(referralCode);
        }
      }
      // Check if it's an email verification link
      else if (urlObj.pathname.includes('/verify-email') || (urlObj.searchParams.has('token') && urlObj.pathname.includes('/verify'))) {
        const token = urlObj.searchParams.get('token');
        // console.log('🔗 DEEP LINK: Email verification detected', { 
        //   hasToken: !!token, 
        //   tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        //   isWebUrl: urlObj.protocol === 'http:' || urlObj.protocol === 'https:',
        //   isDeepLink: urlObj.protocol === 'bookyolo:'
        // });
        
        if (token) {
          // Navigate to email verification screen with token
          this.navigateToEmailVerification(token);
        } else {
          // console.error('🔗 DEEP LINK: No token found in verification URL');
        }
      } else {
        // Password reset links now handled via web app
        // console.log('🔗 DEEP LINK: Not a recognized link type');
      }
    } catch (error) {
      // console.error('🔗 DEEP LINK: Error parsing deep link:', error);
    }
  }

  // Navigate to email verification screen
  navigateToEmailVerification(token) {
    // This will be called from the main App component
    if (this.onEmailVerification) {
      this.onEmailVerification(token);
    }
  }

  // Navigate to signup screen with referral code
  navigateToSignup(referralCode) {
    // This will be called from the main App component
    if (this.onSignupWithReferral) {
      this.onSignupWithReferral(referralCode);
    }
  }

  // Set callback for email verification navigation
  setEmailVerificationCallback(callback) {
    this.onEmailVerification = callback;
  }

  // Set callback for signup with referral navigation
  setSignupWithReferralCallback(callback) {
    this.onSignupWithReferral = callback;
  }


  // Clean up listener
  cleanup() {
    if (this.urlListener) {
      this.urlListener.remove();
    }
  }
}

// Export singleton instance
export default new DeepLinkHandler();


