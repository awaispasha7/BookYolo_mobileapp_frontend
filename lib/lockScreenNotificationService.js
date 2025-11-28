// Import warning suppression first
import './suppressWarnings';

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LockScreenNotificationService {
  constructor() {
    this.navigationRef = null;
  }

  // Set navigation reference
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  // Send notification that appears on lock screen
  async sendLockScreenNotification(title, body, data = {}) {
    try {
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
        categoryIdentifier: 'BOOKYOLO_LOCK_SCREEN',
        interruptionLevel: 'active',
      };
      
      // Only add priority if it exists and is valid
      if (priority !== undefined && priority !== null) {
        notificationContent.priority = priority;
      }
      
      // Schedule notification to appear immediately but with a small delay
      // This ensures it appears on lock screen even when app is closed
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: { seconds: 2 }, // 2 second delay to ensure it appears on lock screen
      });
      
      // console.log('Lock screen notification scheduled:', title);
      return true;
    } catch (error) {
      // console.error('Error sending lock screen notification:', error);
      return false;
    }
  }

  // Send scan limit warning to lock screen
  async sendScanLimitWarningToLockScreen(userName, remainingScans) {
    const title = '⚠️ Scan Limit Warning';
    const body = `Hi ${userName}, you have ${remainingScans} scans remaining. Upgrade to Premium for unlimited scans!`;
    
    await this.sendLockScreenNotification(title, body, {
      type: 'scan_limit_warning',
      remainingScans
    });
  }

  // Send referral reward to lock screen
  async sendReferralRewardToLockScreen(userName, rewardType) {
    const title = '🎉 Referral Reward!';
    const body = `Hi ${userName}, you've earned ${rewardType}! Check your scan balance.`;
    
    await this.sendLockScreenNotification(title, body, {
      type: 'referral_reward',
      rewardType
    });
  }

  // Send upgrade reminder to lock screen
  async sendUpgradeReminderToLockScreen(userName) {
    const title = '📈 Upgrade to Premium';
    const body = `Hi ${userName}, unlock unlimited scans and advanced features with BookYolo Premium!`;
    
    await this.sendLockScreenNotification(title, body, {
      type: 'upgrade_reminder'
    });
  }

  // Initialize lock screen notifications
  async initialize() {
    try {
      // Set up notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('lock-screen-notifications', {
          name: 'Lock Screen Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });
      }

      // console.log('Lock screen notification service initialized');
      return true;
    } catch (error) {
      // console.error('Error initializing lock screen notification service:', error);
      return false;
    }
  }

  // Set up lock screen notification listeners
  setupLockScreenNotificationListeners() {
    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // console.log('Lock screen notification response:', response);
      this.handleLockScreenNotificationResponse(response);
    });
  }

  // Handle lock screen notification responses
  handleLockScreenNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    if (!this.navigationRef?.current) {
      // console.log('Navigation not available for lock screen notification response');
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
const lockScreenNotificationService = new LockScreenNotificationService();
export default lockScreenNotificationService;





