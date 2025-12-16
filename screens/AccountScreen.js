import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, ActivityIndicator, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthProvider";

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

  // Refresh scan balance when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
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
  }, [navigation]); // refreshUser and refreshScanBalance are stable functions from context

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
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.name || user?.full_name || userProfile?.full_name || user?.email || 'U')?.[0]?.toUpperCase() || 'U'}
              </Text>
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
        <View style={styles.planContainer}>
          <View style={styles.planHeader}>
            <View style={styles.planIconContainer}>
              <Ionicons name="card-outline" size={24} color="#1F2937" />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>Current Plan & Usage</Text>
              <Text style={styles.planText}>
                {(scanBalance?.plan || 'free') === 'premium' ? 'BookYolo Premium' : 'BookYolo Free'}
              </Text>
            </View>
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
          
          {/* Expires On / Renews On */}
          {((scanBalance?.plan || 'free') === 'premium' && user?.subscription_expires) ? (
            <View style={styles.planDateRow}>
              <Text style={styles.planDateLabel}>Expires On</Text>
              <Text style={styles.planDateValue}>
                {new Date(user.subscription_expires).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ) : (scanBalance?.plan || 'free') === 'free' ? (
            <View style={styles.planDateRow}>
              <Text style={styles.planDateLabel}>Renews On</Text>
              <Text style={styles.planDateValue}>
                {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Settings Options */}
        <View style={styles.optionsContainer}>
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
            onPress={() => Linking.openURL('https://bookyolo.com')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconContainer}>
                <Ionicons name="people-outline" size={20} color="#374151" />
              </View>
              <Text style={styles.optionText}>Invite Friends to Unlock Premium</Text>
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
              onPress={() => Linking.openURL('https://bookyolo.com/cookie-policy')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLinkText}>Cookies</Text>
            </TouchableOpacity>
          </View>
          
          {/* Disclaimer Text */}
          <Text style={styles.disclaimerText}>
            BookYolo is an Independent AI Engine that analyzes public vacation rental, hotel and hospitality listing information. We are not affiliated with, endorsed by or sponsored by any online travel agency. All trademarks remain the property of their respective owners. BookYolo does not guarantee booking outcomes. Always double-check before booking.
          </Text>
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
    backgroundColor: '#1e162a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
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
  planDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  planDateLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  planDateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
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
  disclaimerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 8,
  },
});
