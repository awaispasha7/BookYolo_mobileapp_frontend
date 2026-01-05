// Import warning suppression first
import './suppressWarnings';

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from './notificationService';

class AutomaticNotificationService {
  constructor() {
    this.navigationRef = null;
    this.isInitialized = false;
  }

  // Set navigation reference
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  // Initialize automatic notifications
  async initialize() {
    try {
      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('automatic-notifications', {
          name: 'Automatic Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });
      }

      this.isInitialized = true;
      // console.log('Automatic notification service initialized');
      return true;
    } catch (error) {
      // console.error('Error initializing automatic notification service:', error);
      return false;
    }
  }

  // Send automatic notification that appears on lock screen
  async sendAutomaticNotification(title, body, data = {}) {
    try {
      // Check if notifications are enabled
      const notificationsEnabled = await notificationService.areNotificationsEnabled();
      if (!notificationsEnabled) {
        // console.log('Automatic notifications disabled - skipping:', title);
        return false;
      }

      // Check specific notification type if provided
      if (data.type) {
        const typeEnabled = await notificationService.isNotificationTypeEnabled(data.type);
        if (!typeEnabled) {
          // console.log(`Automatic ${data.type} notification disabled - skipping:`, title);
          return false;
        }
      }

      // Safely get Android notification priority
      let priority = Notifications.AndroidNotificationPriority?.HIGH;
      if (!priority && Notifications.AndroidNotificationPriority) {
        priority = Notifications.AndroidNotificationPriority.DEFAULT || 
                   Notifications.AndroidNotificationPriority.MAX;
      }
      
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
        badge: 1,
        categoryIdentifier: 'AUTOMATIC_NOTIFICATION',
        interruptionLevel: 'active',
      };
      
      // Only add priority if it exists and is valid
      if (priority !== undefined && priority !== null) {
        notificationContent.priority = priority;
      }
      
      // Schedule notification to appear immediately
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });
      
      // console.log('Automatic notification sent:', title);
      return true;
    } catch (error) {
      // console.error('Error sending automatic notification:', error);
      return false;
    }
  }

  // Send scan limit warning automatically
  async sendScanLimitWarningAutomatic(userName, remainingScans) {
    const title = '⚠️ Scan Limit Warning';
    const body = `Hi ${userName}, you have ${remainingScans} scans remaining. Upgrade to Premium for unlimited scans!`;
    
    await this.sendAutomaticNotification(title, body, {
      type: 'scanLimits',
      remainingScans
    });
  }

  // Send referral reward automatically
  async sendReferralRewardAutomatic(userName, rewardType) {
    const title = '🎉 Referral Reward!';
    const body = `Hi ${userName}, you've earned ${rewardType}! Check your scan balance.`;
    
    await this.sendAutomaticNotification(title, body, {
      type: 'referralRewards',
      rewardType
    });
  }

  // Send upgrade reminder automatically
  async sendUpgradeReminderAutomatic(userName) {
    const title = '📈 Upgrade to Premium';
    const body = `Hi ${userName}, unlock unlimited scans and advanced features with BookYolo Premium!`;
    
    await this.sendAutomaticNotification(title, body, {
      type: 'upgradeReminders'
    });
  }

  // Schedule automatic notifications (for testing)
  async scheduleAutomaticNotifications() {
    try {
      // Check if notifications are enabled
      const notificationsEnabled = await notificationService.areNotificationsEnabled();
      if (!notificationsEnabled) {
        // console.log('Automatic notifications disabled - skipping scheduled notifications');
        return false;
      }

      // Schedule scan limit warning for 10 seconds from now
      const scanLimitsEnabled = await notificationService.isNotificationTypeEnabled('scanLimits');
      if (scanLimitsEnabled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Scan Limit Warning',
            body: 'Hi User, you have 5 scans remaining. Upgrade to Premium for unlimited scans!',
            data: { type: 'scanLimits', remainingScans: 5 },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            badge: 1,
            categoryIdentifier: 'AUTOMATIC_NOTIFICATION',
            interruptionLevel: 'active',
          },
          trigger: { seconds: 10 },
        });
      }

      // Schedule referral reward for 15 seconds from now
      const referralRewardsEnabled = await notificationService.isNotificationTypeEnabled('referralRewards');
      if (referralRewardsEnabled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Referral Reward!',
            body: 'Hi User, you\'ve earned 50 extra scans! Check your scan balance.',
            data: { type: 'referralRewards', rewardType: '50 extra scans' },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            badge: 1,
            categoryIdentifier: 'AUTOMATIC_NOTIFICATION',
            interruptionLevel: 'active',
          },
          trigger: { seconds: 15 },
        });
      }

      // Schedule upgrade reminder for 20 seconds from now
      const upgradeRemindersEnabled = await notificationService.isNotificationTypeEnabled('upgradeReminders');
      if (upgradeRemindersEnabled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📈 Upgrade to Premium',
            body: 'Hi User, unlock unlimited scans and advanced features with BookYolo Premium!',
            data: { type: 'upgradeReminders' },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            badge: 1,
            categoryIdentifier: 'AUTOMATIC_NOTIFICATION',
            interruptionLevel: 'active',
          },
          trigger: { seconds: 20 },
        });
      }

      // console.log('Automatic notifications scheduled for 10, 15, and 20 seconds');
      return true;
    } catch (error) {
      // console.error('Error scheduling automatic notifications:', error);
      return false;
    }
  }

  // Set up automatic notification listeners
  setupAutomaticNotificationListeners() {
    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // console.log('Automatic notification response:', response);
      this.handleAutomaticNotificationResponse(response);
    });
  }

  // Handle automatic notification responses
  handleAutomaticNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (!this.navigationRef?.current) {
      // console.log('Navigation not available for automatic notification response');
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
const automaticNotificationService = new AutomaticNotificationService();
export default automaticNotificationService;
