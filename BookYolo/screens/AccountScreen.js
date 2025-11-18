import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Switch, Alert, Image, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthProvider";
import { useNotifications } from "../context/NotificationProvider";
import notificationService from "../lib/notificationService";

// Inline iPhone Back Button Component
function BackButton({ onPress, style }) {
  return (
    <TouchableOpacity
      style={[
        {
          marginTop: 8,
          marginBottom: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="chevron-back" 
        size={24} 
        color="#1e162a" 
        style={{ margin: 0, padding: 0 }}
      />
    </TouchableOpacity>
  );
}

export default function AccountScreen({ navigation }) {
  const { user, userProfile, loading, signOut, scanBalance, refreshUser, refreshScanBalance } = useAuth();
  const { isInitialized, requestPermissions } = useNotifications();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Check if notifications are initialized and enabled
    const checkNotificationStatus = async () => {
      const enabled = await notificationService.areNotificationsEnabled();
      setNotificationsEnabled(enabled && isInitialized);
    };
    checkNotificationStatus();
  }, [isInitialized]);

  // Refresh notification status and scan balance when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const checkNotificationStatus = async () => {
        const enabled = await notificationService.areNotificationsEnabled();
        setNotificationsEnabled(enabled && isInitialized);
      };
      checkNotificationStatus();
      
      // Refresh scan balance when screen comes into focus
      if (refreshUser) {
        refreshUser().catch(() => {
          // Silent error handling
        });
      }
      if (refreshScanBalance) {
        refreshScanBalance().catch(() => {
          // Silent error handling
        });
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isInitialized]); // refreshUser and refreshScanBalance are stable functions from context

  const handleNotificationToggle = async (value) => {
    if (value) {
      // Enable notifications
      const success = await requestPermissions();
      if (success) {
        await notificationService.setNotificationsEnabled(true);
        setNotificationsEnabled(true);
        
        // Enable all notification types when main toggle is turned on
        const allEnabled = {
          scanResults: true,
          scanLimits: true,
          referralRewards: true,
          upgradeReminders: true,
          welcomeMessages: true,
        };
        
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
        scanResults: false,
        scanLimits: false,
        referralRewards: false,
        upgradeReminders: false,
        welcomeMessages: false,
      };
      
      // Save all individual settings
      for (const [type, enabled] of Object.entries(allDisabled)) {
        await notificationService.setNotificationTypeEnabled(type, enabled);
      }
      
      Alert.alert('Notifications Disabled', 'All notifications are now disabled.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.navigate('Splash');
    } catch (error) {
      // console.error('Error signing out:', error);
      // Still navigate to splash even if signout fails
      navigation.navigate('Splash');
    }
  };

  const handleTermsPress = () => {
    Linking.openURL('https://bookyolo.com/terms-of-services');
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://bookyolo.com/privacy-policy');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e162a" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backButtonContainer}>
          <BackButton 
            onPress={() => navigation.goBack()}
          />
        </View>
        
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/book1.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>MVP 17.7.9.9b</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>
            {user?.email || userProfile?.email || 'user@example.com'}
          </Text>
          {(user?.name || user?.full_name || userProfile?.full_name) && (
            <Text style={styles.userName}>
              {user?.name || user?.full_name || userProfile?.full_name}
            </Text>
          )}
        </View>

        {/* Plan and Usage */}
        <TouchableOpacity 
          style={styles.planContainer}
          onPress={() => navigation.navigate('PlanStatus')}
          activeOpacity={0.7}
        >
          <View style={styles.planContent}>
            <View style={styles.planInfo}>
              <Text style={styles.planText}>
                Plan: {(scanBalance?.plan || 'free').toUpperCase()} 
                {(scanBalance?.plan || 'free') === 'free' ? ' (Fair Use)' : ' (Premium)'}
              </Text>
              <Text style={styles.scanText}>
                Scans Used: {scanBalance?.used || 0}/{scanBalance?.limits?.total_limit || 50}
              </Text>
              <Text style={[
                styles.remainingScansText,
                (user?.remaining || scanBalance?.remaining || 0) > 0 ? styles.remainingScansGreen : styles.remainingScansRed
              ]}>
                Remaining Scans: {user?.remaining || scanBalance?.remaining || 0}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* Settings Options */}
        <View style={styles.optionsContainer}>
          <View style={styles.optionRow}>
            <Text style={styles.optionText}>Notifications</Text>
            <Switch 
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#767577', true: '#34C759' }}
              thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
              ios_backgroundColor="#767577"
            />
          </View>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('Upgrade')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>Upgrade to Premium</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('Referral')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>Invite Friends and Get more Scans</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>Account Management</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>


          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('ContactSocial')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>Log Out</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Legal Links */}
        <View style={styles.legalContainer}>
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={handleTermsPress}
              activeOpacity={0.6}
            >
              <Text style={styles.legalLinkText}>Terms of Use</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={handlePrivacyPress}
              activeOpacity={0.6}
            >
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={() => navigation.navigate('PrivacyTerms')}
              activeOpacity={0.6}
            >
              <Text style={styles.legalLinkText}>Cookies</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={() => navigation.navigate('PrivacyTerms')}
              activeOpacity={0.6}
            >
              <Text style={styles.legalLinkText}>Disclaimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 65,
    position: 'relative',
  },
  backButtonContainer: {
    position: 'absolute',
    left: 20,
    top: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  logo: {
    width: 45,
    height: 45,
  },
  versionContainer: {
    position: 'absolute',
    right: 20,
    top: 25,
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  versionText: {
    fontSize: 8,
    color: "#000000",
    fontWeight: "800",
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#070707',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  userInfo: {
    marginBottom: 20,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: "700",
    color: "#070707",
    textAlign: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  planContainer: {
    backgroundColor: "#e9e8ea",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planInfo: {
    flex: 1,
  },
  planText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#070707",
    marginBottom: 4,
  },
  scanText: {
    fontSize: 14,
    color: "#070707",
    fontWeight: "700",
    marginTop: 4,
  },
  remainingScansText: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  remainingScansGreen: {
    color: "#22c55e",
  },
  remainingScansRed: {
    color: "#ef4444",
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#e9e8ea",
    borderRadius: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 16,
    color: "#070707",
    fontWeight: "700",
  },
  legalContainer: {
    paddingVertical: 20,
    paddingHorizontal: 0,
    alignItems: "stretch",
  },
  legalLinksContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 10,
  },
  legalLinkButton: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: "#e9ecef",
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  legalLinkText: {
    fontSize: 10,
    color: "#1e162a",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 12,
    numberOfLines: 1,
    includeFontPadding: false,
  },
});
