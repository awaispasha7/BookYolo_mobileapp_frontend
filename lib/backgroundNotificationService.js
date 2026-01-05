// Import warning suppression first
import './suppressWarnings';

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class BackgroundNotificationService {
  constructor() {
    this.navigationRef = null;
  }

  // Set navigation reference
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  // Send background notification (appears on iPhone lock screen like WhatsApp)
  async sendBackgroundNotification(title, body, data = {}, delaySeconds = 5) {
    try {
      // Always schedule with a 5-second delay to ensure it appears on lock screen
      const trigger = { seconds: delaySeconds };
      
      // Safely get Android notification priority
      let priority = Notifications.AndroidNotificationPriority?.HIGH;
      if (!priority && Notifications.AndroidNotificationPriority) {
        // Fallback to available priority
        priority = Notifications.AndroidNotificationPriority.DEFAULT || 
                   Notifications.AndroidNotificationPriority.MAX;
      }
      
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
        badge: 1,
        categoryIdentifier: 'BOOKYOLO_NOTIFICATION',
      };
      
      // Only add priority if it exists and is valid
      if (priority !== undefined && priority !== null) {
        notificationContent.priority = priority;
      }
      
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger,
      });
      
      // console.log('Background notification scheduled (will appear on lock screen in 5 seconds):', title);
      return true;
    } catch (error) {
      // console.error('Error sending background notification:', error);
      return false;
    }
  }

  // Send scan limit warning background notification
  async sendScanLimitWarningBackground(userName, remainingScans) {
    const title = 'Scan Limit Warning';
    const body = `Hi ${userName}, you have ${remainingScans} scans remaining. Consider upgrading to BookYolo Premium for unlimited scans!`;
    
    await this.sendBackgroundNotification(title, body, {
      type: 'scan_limit_warning',
      remainingScans
    });
  }

  // Send referral reward background notification
  async sendReferralRewardBackground(userName, rewardType) {
    const title = 'Referral Reward! 🎉';
    const body = `Hi ${userName}, you've earned ${rewardType}! Check your scan balance.`;
    
    await this.sendBackgroundNotification(title, body, {
      type: 'referral_reward',
      rewardType
    });
  }

  // Send upgrade reminder background notification
  async sendUpgradeReminderBackground(userName) {
    const title = 'Upgrade to Premium';
    const body = `Hi ${userName}, unlock unlimited scans and advanced features with BookYolo Premium!`;
    
    await this.sendBackgroundNotification(title, body, {
      type: 'upgrade_reminder'
    });
  }

  // Send scan completion background notification
  async sendScanCompletionBackground(listingTitle, score, listingUrl = '') {
    const title = 'Scan Complete! 📊';
    const body = `Your scan of "${listingTitle}" is ready. Score: ${score}`;
    
    await this.sendBackgroundNotification(title, body, {
      type: 'scan_complete',
      listingTitle,
      score,
      listingUrl
    });
  }

  // Send welcome background notification
  async sendWelcomeBackground(userName) {
    const title = 'Welcome to BookYolo! 🏠';
    const body = `Hi ${userName}, start scanning Airbnb listings to get detailed insights and avoid booking regrets!`;
    
    await this.sendBackgroundNotification(title, body, {
      type: 'welcome'
    });
  }

  // Initialize background notifications
  async initialize() {
    try {
      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        // Safely get Android importance
        let importance = Notifications.AndroidImportance?.HIGH;
        if (!importance && Notifications.AndroidImportance) {
          // Fallback to available importance
          importance = Notifications.AndroidImportance.DEFAULT || 
                       Notifications.AndroidImportance.MAX;
        }
        
        const channelConfig = {
          name: 'Background Notifications',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        };
        
        // Only add importance if it exists and is valid
        if (importance !== undefined && importance !== null) {
          channelConfig.importance = importance;
        }
        
        await Notifications.setNotificationChannelAsync('background-notifications', channelConfig);
      }

      // console.log('Background notification service initialized');
      return true;
    } catch (error) {
      // console.error('Error initializing background notification service:', error);
      return false;
    }
  }

  // Set up background notification listeners
  setupBackgroundNotificationListeners() {
    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // console.log('Background notification response:', response);
      this.handleBackgroundNotificationResponse(response);
    });
  }

  // Handle background notification responses
  handleBackgroundNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (!this.navigationRef?.current) {
      // console.log('Navigation not available for background notification response');
      return;
    }
    
    // Navigate based on notification type
    switch (data?.type) {
      case 'scan_limit_warning':
        this.navigationRef.current.navigate('Upgrade');
        break;
      case 'referral_reward':
        this.navigationRef.current.navigate('Referral');
        break;
      case 'upgrade_reminder':
        this.navigationRef.current.navigate('Upgrade');
        break;
      case 'scan_complete':
        if (data.listingTitle) {
          this.navigationRef.current.navigate('ScanResult', { 
            scanData: { 
              link: data.listingUrl || '',
              status: "Success", 
              analysis: { title: data.listingTitle, score: data.score },
              timestamp: new Date().toISOString()
            } 
          });
        } else {
          this.navigationRef.current.navigate('MainTabs');
        }
        break;
      case 'welcome':
        this.navigationRef.current.navigate('MainTabs');
        break;
      default:
        this.navigationRef.current.navigate('MainTabs');
        break;
    }
  }

  // Clean up listeners
  cleanup() {
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Create singleton instance
const backgroundNotificationService = new BackgroundNotificationService();
export default backgroundNotificationService;
