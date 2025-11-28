import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Switch, Alert, Image, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthProvider";
import { useNotifications } from "../context/NotificationProvider";
import notificationService from "../lib/notificationService";
import { BOOK1_LOGO } from "../constants/images";

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
            source={BOOK1_LOGO} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>MVP 17.7.9.9b</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={40} color="#1F2937" />
            </View>
          </View>
          {(user?.name || user?.full_name || userProfile?.full_name) && (
            <Text style={styles.userName}>
              {user?.name || user?.full_name || userProfile?.full_name}
            </Text>
          )}
          <Text style={styles.userEmail}>
            {user?.email || userProfile?.email || 'user@example.com'}
          </Text>
        </View>

        {/* Plan and Usage Card */}
        <TouchableOpacity 
          style={styles.planContainer}
          onPress={() => navigation.navigate('PlanStatus')}
          activeOpacity={0.7}
        >
          <View style={styles.planHeader}>
            <View style={styles.planIconContainer}>
              <Ionicons name="card-outline" size={24} color="#1F2937" />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>Current Plan & Usage</Text>
              <Text style={styles.planText}>
                {(scanBalance?.plan || 'free').toUpperCase()} 
                {/* {(scanBalance?.plan || 'free') === 'free' ? ' (Fair Use)' : ' (Premium)'} */}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#6B7280" />
          </View>
          
          <View style={styles.planDivider} />
          
          <View style={styles.planStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Remaining Scans</Text>
              <Text style={[
                styles.statValue,
                (user?.remaining || scanBalance?.remaining || 0) > 0 ? styles.statValueGreen : styles.statValueRed
              ]}>
                {user?.remaining || scanBalance?.remaining || 0}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Scans Used</Text>
              <Text style={styles.statValue}>
                {scanBalance?.used || 0}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Settings Options */}
        <View style={styles.optionsContainer}>
          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="notifications-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.optionText}>Notifications</Text>
            </View>
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
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, styles.optionIconPremium]}>
                <Ionicons name="star-outline" size={20} color="#1F2937" />
              </View>
              <Text style={styles.optionText}>Upgrade to Premium</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('Referral')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="people-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.optionText}>Invite Friends and Get more Scans</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="create-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.optionText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="settings-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.optionText}>Account Management</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => navigation.navigate('ContactSocial')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="help-circle-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.optionText}>Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.optionRow, styles.logoutRow]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIconContainer, styles.logoutIconContainer]}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Legal Links */}
        <View style={styles.legalContainer}>
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={handleTermsPress}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Terms of Use</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={handlePrivacyPress}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={() => navigation.navigate('PrivacyTerms')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Cookies</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.legalLinkButton}
              onPress={() => navigation.navigate('PrivacyTerms')}
              activeOpacity={0.7}
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
    paddingTop: 10,
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 10,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: "400",
    color: "#6B7280",
    textAlign: "center",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  planDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
  },
  planStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  statValueGreen: {
    color: "#22c55e",
  },
  statValueRed: {
    color: "#ef4444",
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIconPremium: {
    backgroundColor: '#FEF3C7',
  },
  optionText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.2,
  },
  logoutRow: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    marginTop: 8,
  },
  logoutIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
    flex: 1,
    letterSpacing: -0.2,
  },
  legalContainer: {
    paddingVertical: 24,
    paddingHorizontal: 0,
    alignItems: "stretch",
  },
  legalLinksContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "stretch",
    width: "100%",
    gap: 8,
  },
  legalLinkButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  legalLinkText: {
    fontSize: 9,
    color: "#1F2937",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.1,
    numberOfLines: 1,
    includeFontPadding: false,
  },
});
