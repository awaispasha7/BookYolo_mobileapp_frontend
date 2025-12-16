import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationProvider';
import notificationService from '../lib/notificationService';

// Inline Back Button Component - same as upgrade screen
function BackButton({ onPress, style }) {
  return (
    <TouchableOpacity
      style={[
        {
          paddingVertical: 8,
          paddingHorizontal: 8,
          marginTop: 8,
          marginBottom: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name="chevron-back" size={24} color="#1e162a" />
    </TouchableOpacity>
  );
}

const NotificationSettingsScreen = ({ navigation }) => {
  const {
    isInitialized,
    requestPermissions,
  } = useNotifications();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTypes, setNotificationTypes] = useState({
    scanLimits: true,
    referralRewards: true,
    upgradeReminders: true,
  });

  useEffect(() => {
    // Check if notifications are initialized and enabled
    const checkNotificationStatus = async () => {
      const enabled = await notificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled && isInitialized);
      
      // Load individual notification type settings
      const typeSettings = await notificationService.getNotificationTypeSettings();
      setNotificationTypes(typeSettings);
    };
    checkNotificationStatus();
  }, [isInitialized]);

  // Refresh notification status when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const checkNotificationStatus = async () => {
        const enabled = await notificationService.areNotificationsEnabled();
        setNotificationsEnabled(enabled && isInitialized);
        
        // Load individual notification type settings
        const typeSettings = await notificationService.getNotificationTypeSettings();
        setNotificationTypes(typeSettings);
      };
      checkNotificationStatus();
    });

    return unsubscribe;
  }, [navigation, isInitialized]);


  const handleNotificationToggle = async (value) => {
    if (value) {
      // Enable notifications
      const success = await requestPermissions();
      if (success) {
        await notificationService.setNotificationsEnabled(true);
        setNotificationsEnabled(true);
        // Enable all notification types when main toggle is turned on
        const allEnabled = {
          scanLimits: true,
          referralRewards: true,
          upgradeReminders: true,
        };
        setNotificationTypes(allEnabled);
        
        // Save all individual settings
        for (const [type, enabled] of Object.entries(allEnabled)) {
          await notificationService.setNotificationTypeEnabled(type, enabled);
        }
        Alert.alert('Success', 'All notifications enabled!');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
      }
    } else {
      // Disable notifications
      await notificationService.setNotificationsEnabled(false);
      setNotificationsEnabled(false);
      // Disable all notification types when main toggle is turned off
      const allDisabled = {
        scanLimits: false,
        referralRewards: false,
        upgradeReminders: false,
      };
      setNotificationTypes(allDisabled);
      
      // Save all individual settings
      for (const [type, enabled] of Object.entries(allDisabled)) {
        await notificationService.setNotificationTypeEnabled(type, enabled);
      }
      Alert.alert('Notifications Disabled', 'All notifications are now disabled.');
    }
  };

  const handleNotificationTypeToggle = async (type, value) => {
    // Update the specific notification type in notification service
    await notificationService.setNotificationTypeEnabled(type, value);
    
    // Update the specific notification type in local state
    setNotificationTypes(prev => ({
      ...prev,
      [type]: value
    }));

    // Check if any notification type is enabled
    const updatedTypes = {
      ...notificationTypes,
      [type]: value
    };
    const anyEnabled = Object.values(updatedTypes).some(enabled => enabled);

    // Update main toggle based on individual toggles
    if (anyEnabled && !notificationsEnabled) {
      // At least one type is enabled, enable main toggle
      await notificationService.setNotificationsEnabled(true);
      setNotificationsEnabled(true);
    } else if (!anyEnabled && notificationsEnabled) {
      // No types are enabled, disable main toggle
      await notificationService.setNotificationsEnabled(false);
      setNotificationsEnabled(false);
    }

    // Show feedback
    const typeNames = {
      scanLimits: 'Scan Limits',
      referralRewards: 'Referral Rewards',
      upgradeReminders: 'Upgrade to Premium'
    };
    
    Alert.alert(
      'Notification Updated',
      `${typeNames[type]} notifications are now ${value ? 'enabled' : 'disabled'}.`
    );
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      {/* Header with Back Button, Logo and Version */}
      <View style={styles.topHeader}>
        <View style={styles.backButtonContainer}>
          <BackButton 
            onPress={() => navigation.goBack()}
          />
        </View>
        
      </View>
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      {/* Main Notification Toggle */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Control how and when you receive notifications from BookYolo
        </Text>
        
        <View style={styles.toggleContainer}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Enable All Notifications</Text>
            <Text style={styles.toggleSubtext}>
              {notificationsEnabled ? 'You will receive all notifications' : 'All notifications are disabled'}
            </Text>
          </View>
          <Switch 
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={notificationsEnabled ? '#ffffff' : '#9CA3AF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>
      </View>

      {/* Notification Types */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Types of notifications you can receive
        </Text>
        
        <View style={styles.notificationTypesContainer}>
          <View style={styles.notificationTypeItem}>
            <View style={styles.notificationTypeInfo}>
              <Text style={styles.notificationTypeTitle}>Referral Rewards</Text>
              <Text style={styles.notificationTypeDesc}>When you earn referral bonuses</Text>
            </View>
            <Switch
              value={notificationTypes.referralRewards}
              onValueChange={(value) => handleNotificationTypeToggle('referralRewards', value)}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={notificationTypes.referralRewards ? '#ffffff' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          <View style={styles.notificationTypeItem}>
            <View style={styles.notificationTypeInfo}>
              <Text style={styles.notificationTypeTitle}>Upgrade to Premium</Text>
              <Text style={styles.notificationTypeDesc}>When upgrade opportunities are available</Text>
            </View>
            <Switch
              value={notificationTypes.upgradeReminders}
              onValueChange={(value) => handleNotificationTypeToggle('upgradeReminders', value)}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={notificationTypes.upgradeReminders ? '#ffffff' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          <View style={styles.notificationTypeItem}>
            <View style={styles.notificationTypeInfo}>
              <Text style={styles.notificationTypeTitle}>Scan Limit</Text>
              <Text style={styles.notificationTypeDesc}>When 5 scans are left</Text>
            </View>
            <Switch
              value={notificationTypes.scanLimits}
              onValueChange={(value) => handleNotificationTypeToggle('scanLimits', value)}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={notificationTypes.scanLimits ? '#ffffff' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>
      </View>



      </ScrollView>
    </SafeAreaView>
    );
  };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 60,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  backButtonContainer: {
    position: 'absolute',
    left: 20,
    top: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    marginTop: 22,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    marginTop: 65,
  },
  logo: {
    width: 45,
    height: 45,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#070707',
    marginBottom: 5,
    marginTop: 20,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#070707',
  },
  section: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#070707',
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleSubtext: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  notificationTypesContainer: {
    marginTop: 8,
  },
  notificationTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationTypeInfo: {
    flex: 1,
  },
  notificationTypeTitle: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationTypeDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default NotificationSettingsScreen;
