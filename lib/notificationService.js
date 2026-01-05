// Import warning suppression first
import './suppressWarnings';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
// DISABLED: All notification services disabled to prevent duplicates
// import backgroundNotificationService from './backgroundNotificationService';
// import lockScreenNotificationService from './lockScreenNotificationService';
// import automaticNotificationService from './automaticNotificationService';

// Configure notification behavior - Fixed deprecation warnings
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
} catch (error) {
  console.error('Error setting notification handler:', error);
}

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.navigationRef = null;
    this.notificationsEnabled = true; // Default to enabled
    this.pushNotificationsEnabled = true; // Default to enabled
  }

  // Set navigation reference
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
    // DISABLED: All notification services disabled to prevent duplicates
    // backgroundNotificationService.setNavigationRef(navigationRef);
    // lockScreenNotificationService.setNavigationRef(navigationRef);
    // automaticNotificationService.setNavigationRef(navigationRef);
  }

  // Enable/disable notifications
  async setNotificationsEnabled(enabled) {
    this.notificationsEnabled = enabled;
    try {
      await AsyncStorage.setItem('notifications_enabled', enabled.toString());
      
      // If disabling, cancel all scheduled notifications
      if (!enabled) {
        await this.cancelAllScheduledNotifications();
      }
    } catch (error) {
      // console.error('Error saving notification preference:', error);
    }
  }

  // Check if notifications are enabled
  async areNotificationsEnabled() {
    try {
      const stored = await AsyncStorage.getItem('notifications_enabled');
      if (stored !== null) {
        this.notificationsEnabled = stored === 'true';
      }
      return this.notificationsEnabled;
    } catch (error) {
      // console.error('Error checking notification preference:', error);
      return this.notificationsEnabled;
    }
  }

  // Set individual notification type settings
  async setNotificationTypeEnabled(type, enabled) {
    try {
      await AsyncStorage.setItem(`notification_${type}`, enabled.toString());
    } catch (error) {
      // console.error(`Error saving ${type} notification preference:`, error);
    }
  }

  // Check if specific notification type is enabled
  async isNotificationTypeEnabled(type) {
    try {
      const stored = await AsyncStorage.getItem(`notification_${type}`);
      if (stored !== null) {
        return stored === 'true';
      }
      return true; // Default to enabled
    } catch (error) {
      // console.error(`Error checking ${type} notification preference:`, error);
      return true; // Default to enabled
    }
  }

  // Get all notification type settings
  async getNotificationTypeSettings() {
    try {
      const settings = {};
      const types = ['scanResults', 'scanLimits', 'referralRewards', 'upgradeReminders', 'welcomeMessages'];
      
      for (const type of types) {
        settings[type] = await this.isNotificationTypeEnabled(type);
      }
      
      return settings;
    } catch (error) {
      // console.error('Error getting notification type settings:', error);
      return {
        scanResults: true,
        scanLimits: true,
        referralRewards: true,
        upgradeReminders: true,
        welcomeMessages: true,
      };
    }
  }

  // Initialize notification service
  async initialize() {
    try {
      // Load notification preference first
      await this.areNotificationsEnabled();
      
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        // console.log('Failed to get notification permissions!');
        return false;
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      // DISABLED: Multiple notification services causing duplicate notifications
      // await backgroundNotificationService.initialize();
      // backgroundNotificationService.setupBackgroundNotificationListeners();

      // await lockScreenNotificationService.initialize();
      // lockScreenNotificationService.setupLockScreenNotificationListeners();

      // await automaticNotificationService.initialize();
      // automaticNotificationService.setupAutomaticNotificationListeners();

      return true;
    } catch (error) {
      // console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Listen for incoming notifications
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  // Handle received notifications
  handleNotificationReceived(notification) {
    const { title, body, data } = notification.request.content;
    
    // Handle different notification types based on data
    switch (data?.type) {
      case 'scan_limit_warning':
        // Handle scan limit warning
        break;
      case 'referral_reward':
        // Handle referral reward
        break;
      case 'upgrade_reminder':
        // Handle upgrade reminder
        break;
      default:
        // Handle general notifications
        break;
    }
  }

  // Handle notification responses (when user taps notification)
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (!this.navigationRef?.current) {
      // console.log('Navigation not available');
      return;
    }
    
    // Navigate based on notification type
    switch (data?.type) {
      case 'scan_limit_warning':
        // Navigate to upgrade screen
        this.navigationRef.current.navigate('Upgrade');
        break;
      case 'referral_reward':
        // Navigate to referral screen
        this.navigationRef.current.navigate('Referral');
        break;
      case 'upgrade_reminder':
        // Navigate to upgrade screen
        this.navigationRef.current.navigate('Upgrade');
        break;
      case 'welcome':
        // Navigate to main tabs (scan screen)
        this.navigationRef.current.navigate('MainTabs');
        break;
      case 'scan_complete':
        // Navigate to scan result screen if we have the data
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
      case 'daily_reminder':
        // Navigate to main tabs (scan screen)
        this.navigationRef.current.navigate('MainTabs');
        break;
      case 'weekly_summary':
        // Navigate to main tabs
        this.navigationRef.current.navigate('MainTabs');
        break;
      default:
        // Navigate to main tabs for general notifications
        this.navigationRef.current.navigate('MainTabs');
        break;
    }
  }

  // Send local notification
  async sendLocalNotification(title, body, data = {}) {
    
    // COMPLETELY DISABLED: This was causing duplicate notifications
    // Only direct notifications from ScanScreen should work
    return;
  }

  // Send direct notification (bypasses any caching)
  async sendDirectNotification(title, body, data = {}) {
    
    try {
      // Create a completely unique identifier
      const uniqueId = `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await Notifications.scheduleNotificationAsync({
        identifier: uniqueId,
        content: {
          title,
          body,
          data: {
            ...data,
            uniqueId,
            timestamp: Date.now(),
            direct: true
          },
          sound: true,
        },
        trigger: null,
      });
      
      // console.log('✅ Direct notification sent with ID:', uniqueId);
    } catch (error) {
      // console.error('Error sending direct notification:', error);
    }
  }

  // Send forced notification (bypasses ALL checks and limitations)
  async sendForcedNotification(title, body, data = {}) {
    
    try {
      // Create a completely unique identifier with more randomness
      const uniqueId = `forced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Force send notification without any checks
      await Notifications.scheduleNotificationAsync({
        identifier: uniqueId,
        content: {
          title,
          body,
          data: {
            ...data,
            uniqueId,
            timestamp: Date.now(),
            forced: true,
            visitId: Math.random().toString(36).substr(2, 9)
          },
          sound: true,
        },
        trigger: null,
      });
      
      // console.log('✅ Forced notification sent with ID:', uniqueId);
    } catch (error) {
      // console.error('Error sending forced notification:', error);
    }
  }

  // Send test notification (completely bypasses everything)
  async sendTestNotification(title, body, data = {}) {
    
    try {
      // Create super unique identifier
      const uniqueId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send notification directly
      await Notifications.scheduleNotificationAsync({
        identifier: uniqueId,
        content: {
          title,
          body,
          data: {
            ...data,
            uniqueId,
            timestamp: Date.now(),
            test: true,
            randomId: Math.random().toString(36).substr(2, 9)
          },
          sound: true,
        },
        trigger: null,
      });
      
      // console.log('✅ Test notification sent with ID:', uniqueId);
    } catch (error) {
      // console.error('Error sending test notification:', error);
    }
  }

  // Send scan limit warning notification
  async sendScanLimitWarning(userName, remainingScans) {
    
    // COMPLETELY DISABLED: This was causing duplicate notifications
    // Scan limit warnings are handled directly in ScanScreen when needed
    return;
  }

  // Send referral reward notification
  async sendReferralReward(userName, rewardType) {
    
    // COMPLETELY DISABLED: This was causing duplicate notifications
    // Referral notifications should only be sent when user actually earns rewards from backend
    return;
  }

  // Send upgrade reminder notification
  async sendUpgradeReminder(userName) {
    
    // COMPLETELY DISABLED: This was causing duplicate notifications
    // Upgrade notifications should only be sent from ScanScreen on first login
    return;
  }

  // Send welcome notification
  async sendWelcomeNotification(userName) {
    
    // COMPLETELY DISABLED: This was causing duplicate notifications
    // Welcome notifications should only be sent from ScanScreen on first login
    return;
  }

  // Send scan completion notification
  async sendScanCompletionNotification(listingTitle, score, listingUrl = '') {
    
    // COMPLETELY DISABLED: This was causing duplicate notifications
    // Scan completion notifications should only be sent when explicitly needed
    return;
  }

  // Schedule notification for later
  async scheduleNotification(title, body, trigger, data = {}) {
    
    // COMPLETELY DISABLED: This was causing duplicate notifications
    // Only direct notifications from ScanScreen should work
    return;
  }

  // Schedule daily reminder
  async scheduleDailyReminder() {
    return;
  }

  // Schedule weekly summary
  async scheduleWeeklySummary() {
    return;
  }

  // Cancel all scheduled notifications
  async cancelAllScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
