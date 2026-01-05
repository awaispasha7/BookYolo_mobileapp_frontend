import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import notificationService from '../lib/notificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    initializeNotifications();
    
    return () => {
      notificationService.cleanup();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const success = await notificationService.initialize();
      setIsInitialized(success);
      setPermissionStatus(success ? 'granted' : 'denied');
      
      if (success) {
        // Set up notification response handler with navigation
        setupNotificationNavigation();
      }
    } catch (error) {
      // console.error('Error initializing notifications:', error);
      setIsInitialized(false);
      setPermissionStatus('denied');
    }
  };

  const setupNotificationNavigation = () => {
    // Override the notification response handler to include navigation
    notificationService.handleNotificationResponse = (response) => {
      const { data } = response.notification.request.content;
      
      // Navigate based on notification type
      switch (data?.type) {
        case 'scan_limit_warning':
          navigation.navigate('Upgrade');
          break;
        case 'referral_reward':
          navigation.navigate('Referral');
          break;
        case 'upgrade_reminder':
          navigation.navigate('Upgrade');
          break;
        case 'scan_complete':
          // Navigate to scan result if available
          if (data.listingTitle) {
            navigation.navigate('ScanResult', { 
              listingTitle: data.listingTitle,
              score: data.score 
            });
          }
          break;
        case 'daily_reminder':
          // Navigate to main scan screen
          navigation.navigate('MainTabs');
          break;
        case 'weekly_summary':
          navigation.navigate('MainTabs');
          break;
        default:
          // Navigate to main screen for general notifications
          navigation.navigate('MainTabs');
          break;
      }
    };
  };

  const requestPermissions = async () => {
    try {
      const success = await notificationService.initialize();
      setPermissionStatus(success ? 'granted' : 'denied');
      setIsInitialized(success);
      return success;
    } catch (error) {
      // console.error('Error requesting permissions:', error);
      setPermissionStatus('denied');
      return false;
    }
  };

  const sendScanLimitWarning = async (userName, remainingScans) => {
    if (isInitialized) {
      await notificationService.sendScanLimitWarning(userName, remainingScans);
    }
  };

  const sendReferralReward = async (userName, rewardType) => {
    if (isInitialized) {
      await notificationService.sendReferralReward(userName, rewardType);
    }
  };

  const sendUpgradeReminder = async (userName) => {
    if (isInitialized) {
      await notificationService.sendUpgradeReminder(userName);
    }
  };

  const sendWelcomeNotification = async (userName) => {
    if (isInitialized) {
      await notificationService.sendWelcomeNotification(userName);
    }
  };

  const sendScanCompletionNotification = async (listingTitle, score) => {
    if (isInitialized) {
      await notificationService.sendScanCompletionNotification(listingTitle, score);
    }
  };

  const scheduleDailyReminder = async () => {
    if (isInitialized) {
      await notificationService.scheduleDailyReminder();
    }
  };

  const scheduleWeeklySummary = async () => {
    if (isInitialized) {
      await notificationService.scheduleWeeklySummary();
    }
  };

  const cancelAllScheduledNotifications = async () => {
    if (isInitialized) {
      await notificationService.cancelAllScheduledNotifications();
    }
  };

  const getScheduledNotifications = async () => {
    if (isInitialized) {
      return await notificationService.getScheduledNotifications();
    }
    return [];
  };

  const value = {
    isInitialized,
    permissionStatus,
    requestPermissions,
    sendScanLimitWarning,
    sendReferralReward,
    sendUpgradeReminder,
    sendWelcomeNotification,
    sendScanCompletionNotification,
    scheduleDailyReminder,
    scheduleWeeklySummary,
    cancelAllScheduledNotifications,
    getScheduledNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
