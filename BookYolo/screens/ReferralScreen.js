// screens/ReferralScreen.js (Updated to match web app design)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, ActivityIndicator, Clipboard, Linking, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthProvider';
import apiClient from '../lib/apiClient';

const { width } = Dimensions.get('window');

// Inline iPhone Back Button Component
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

const ReferralScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  
  // Referral states - matching web app
  const [referralStats, setReferralStats] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  const loadReferralStats = React.useCallback(async () => {
    if (!user?.id && !user?.user?.id) return;
    
    setReferralLoading(true);
    try {
      const userId = user?.id || user?.user?.id;
      const { data: stats, error: statsError } = await apiClient.getReferralStats(userId);
      
      if (!statsError && stats) {
        setReferralStats(stats);
        
        // If premium was just granted, refresh user data
        if (stats.has_premium && stats.plan === 'premium') {
          if (refreshUser) {
            await refreshUser();
          }
        }
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setReferralLoading(false);
    }
  }, [user, refreshUser]);

  const loadReferralLink = React.useCallback(() => {
    const userId = user?.id || user?.user?.id;
    if (userId) {
      const baseUrl = 'https://bookyolo-frontend.vercel.app';
      const link = `${baseUrl}/signup?ref=${userId}`;
      setReferralLink(link);
    }
  }, [user]);

  const sendReferralNotifications = React.useCallback(async () => {
    try {
      // Check notification permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          return;
        }
      }

      // 1. Send one-time notification when user first visits referral screen in this session
      const sessionId = await AsyncStorage.getItem('current_login_session_id');
      if (sessionId) {
        const sessionVisitKey = `referral_screen_notification_${sessionId}`;
        const hasSessionNotification = await AsyncStorage.getItem(sessionVisitKey);
        
        if (!hasSessionNotification) {
          const referralId = `referral_screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await Notifications.scheduleNotificationAsync({
            identifier: referralId,
            content: {
              title: 'Referral Reward! 🎉',
              body: 'Invite friends and earn 50 extra scans for each successful referral!',
              data: {
                type: 'referral_reward',
                uniqueId: referralId,
                timestamp: Date.now()
              },
              sound: true,
            },
            trigger: null,
          });
          
          await AsyncStorage.setItem(sessionVisitKey, 'true');
        }
      }

      // 2. Check if user has reached referral milestones (every 3 referrals)
      if (referralStats && referralStats.referral_count >= 3) {
        const userId = user?.id || user?.user?.id;
        if (userId) {
          const milestoneKey = `referral_milestone_notification_${userId}`;
          const lastMilestoneCount = await AsyncStorage.getItem(milestoneKey);
          const currentCount = referralStats.referral_count || 0;
          
          // Calculate which milestone (3, 6, 9, etc.)
          const milestone = Math.floor(currentCount / 3) * 3;
          
          // Only show if we haven't shown for this milestone yet
          if (lastMilestoneCount !== String(milestone) && milestone >= 3) {
            const milestoneId = `referral_milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const userName = user?.email?.split('@')[0] || 'User';
            
            await Notifications.scheduleNotificationAsync({
              identifier: milestoneId,
              content: {
                title: 'Referral Reward Earned! 🎉',
                body: `Hi ${userName}, you've earned ${currentCount} referrals! You qualify for Premium!`,
                data: {
                  type: 'referral_reward',
                  uniqueId: milestoneId,
                  timestamp: Date.now()
                },
                sound: true,
              },
              trigger: null,
            });
            
            await AsyncStorage.setItem(milestoneKey, String(milestone));
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }, [referralStats, user]);

  // Load referral stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id || user?.user?.id) {
        loadReferralStats();
        loadReferralLink();
      }
    }, [user, loadReferralStats, loadReferralLink])
  );

  // Send notifications after referral stats are loaded
  useEffect(() => {
    if (referralStats !== null) {
      sendReferralNotifications();
    }
  }, [referralStats, sendReferralNotifications]);

  const copyReferralLink = async () => {
    const linkToCopy = referralLink || (user ? `https://bookyolo-frontend.vercel.app/signup?ref=${user?.id || user?.user?.id || ''}` : '');
    if (linkToCopy) {
      Clipboard.setString(linkToCopy);
      Alert.alert(
        "Copied!",
        "Referral link copied to clipboard!",
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Error", "Referral link not available");
    }
  };

  // Share functions - matching web app
  const shareMessage = "Hey! Just found this: BookYolo. It's an AI travel tool that uncovers all the hidden details of rentals and hotels. You get the full story before booking — no more surprises when you arrive.";

  const handleShareX = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(referralLink)}`;
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open X'));
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open Facebook'));
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${referralLink}`)}`;
    Linking.openURL(url).catch(err => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const handleShareEmail = () => {
    // Match web app: Use Gmail URL format
    const emailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=Check out BookYolo&body=${encodeURIComponent(`${shareMessage} ${referralLink}`)}`;
    Linking.openURL(emailUrl).catch(err => {
      // Fallback to mailto if Gmail URL fails
      const subject = 'Check out BookYolo';
      const body = `${shareMessage} ${referralLink}`;
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      Linking.openURL(mailtoUrl).catch(() => Alert.alert('Error', 'Could not open email'));
    });
  };

  // Calculate progress percentage (matching web app)
  const progressPercentage = referralStats 
    ? Math.min(100, (referralStats.referral_count / 3) * 100)
    : 0;

  // Early return if no user
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1F2937" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button, Logo and Version - Matching UpgradeScreen */}
      <View style={styles.header}>
        <View style={styles.backButtonContainer}>
          <BackButton 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Settings');
              }
            }}
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

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modal-style Card Container - Matching Web App */}
        <View style={styles.card}>
          {/* Header with Icon and Title */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="share-social" size={28} color="#1F2937" />
            </View>
            <Text style={styles.title}>Share BookYolo</Text>
            <Text style={styles.subtitle}>Share with 3 friends and get BookYolo Premium for free!</Text>
          </View>

          {/* Referral Stats Box - Matching Web App */}
          {referralLoading ? (
            <View style={styles.statsBox}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#1F2937" />
                <Text style={styles.loadingText}>Loading stats...</Text>
              </View>
            </View>
          ) : referralStats ? (
            <View style={styles.statsBox}>
              <View style={styles.statsContent}>
                <View style={styles.referralCountContainer}>
                  <Text style={styles.referralCountNumber}>{referralStats.referral_count || 0}</Text>
                  <Text style={styles.referralCountLabel}>Referrals</Text>
                </View>
                
                {referralStats.has_premium ? (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>🎉 You have BookYolo Premium!</Text>
                  </View>
                ) : (
                  <Text style={styles.referralsNeededText}>
                    {referralStats.referrals_needed > 0 
                      ? `${referralStats.referrals_needed} more referral${referralStats.referrals_needed > 1 ? 's' : ''} needed for Premium`
                      : 'You qualify for Premium!'
                    }
                  </Text>
                )}
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                    />
                  </View>
                  <Text style={styles.progressLabel}>Progress to Premium</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.statsBox}>
              <View style={styles.statsContent}>
                <View style={styles.referralCountContainer}>
                  <Text style={styles.referralCountNumber}>0</Text>
                  <Text style={styles.referralCountLabel}>Referrals</Text>
                </View>
                <Text style={styles.referralsNeededText}>
                  3 more referrals needed for Premium
                </Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[styles.progressBarFill, { width: '0%' }]}
                    />
                  </View>
                  <Text style={styles.progressLabel}>Progress to Premium</Text>
                </View>
              </View>
            </View>
          )}

          {/* Referral Link Section */}
          <View style={styles.linkSection}>
            <Text style={styles.linkLabel}>Your referral link:</Text>
            <View style={styles.linkContainer}>
              <View style={styles.linkTextContainer}>
                <Text style={styles.linkText} numberOfLines={2}>
                  {referralLink || (user ? `https://bookyolo-frontend.vercel.app/signup?ref=${user?.id || user?.user?.id || ''}` : 'Loading...')}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={copyReferralLink}
                activeOpacity={0.7}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Share on Section */}
          <View style={styles.shareSection}>
            <Text style={styles.shareLabel}>Share on:</Text>
            <View style={styles.shareButtonsGrid}>
              {/* X (Twitter) Button */}
              <TouchableOpacity 
                style={[styles.shareButton, styles.xButton]}
                onPress={handleShareX}
                activeOpacity={0.75}
              >
                <Text style={styles.xButtonText}>X</Text>
              </TouchableOpacity>

              {/* Facebook Button */}
              <TouchableOpacity 
                style={[styles.shareButton, styles.facebookButton]}
                onPress={handleShareFacebook}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-facebook" size={20} color="#ffffff" />
                <Text style={styles.shareButtonText}>Facebook</Text>
              </TouchableOpacity>

              {/* WhatsApp Button */}
              <TouchableOpacity 
                style={[styles.shareButton, styles.whatsappButton]}
                onPress={handleShareWhatsApp}
                activeOpacity={0.75}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
                <Text style={styles.shareButtonText}>WhatsApp</Text>
              </TouchableOpacity>

              {/* Email Button */}
              <TouchableOpacity 
                style={[styles.shareButton, styles.emailButton]}
                onPress={handleShareEmail}
                activeOpacity={0.75}
              >
                <Ionicons name="mail" size={20} color="#ffffff" />
                <Text style={styles.shareButtonText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 60,
    position: 'relative',
  },
  backButtonContainer: {
    position: 'absolute',
    left: 0,
    top: 5,
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
    top: 15,
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
  scrollView: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
    backgroundColor: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 56,
    height: 56,
    backgroundColor: "#F3F4F6",
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  statsBox: {
    marginBottom: 28,
    padding: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: "rgba(0, 0, 0, 0.05)",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  statsContent: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  referralCountContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  referralCountNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },
  referralCountLabel: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 6,
    fontWeight: "500",
  },
  premiumBadge: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 16,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumBadgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  referralsNeededText: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: "500",
  },
  progressContainer: {
    width: '100%',
    marginTop: 16,
    backgroundColor: 'transparent',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: "#111827",
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: 'center',
    fontWeight: "500",
  },
  linkSection: {
    marginBottom: 28,
    padding: 18,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  linkLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    fontWeight: "500",
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  linkTextContainer: {
    flex: 1,
    marginRight: 12,
    paddingRight: 8,
    backgroundColor: 'transparent',
  },
  linkText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 18,
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  shareSection: {
    marginBottom: 28,
  },
  shareLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  shareButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    width: '100%',
  },
  shareButton: {
    minHeight: 56,
    borderRadius: 12,
    width: '48%',
    marginBottom: 14,
    shadowColor: "rgba(0, 0, 0, 0.15)",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  xButton: {
    backgroundColor: "#000000",
  },
  facebookButton: {
    backgroundColor: "#1877F2",
  },
  whatsappButton: {
    backgroundColor: "#25D366",
  },
  emailButton: {
    backgroundColor: "#4B5563",
  },
  xButtonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 1,
  },
  shareButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  closeButton: {
    width: '100%',
    backgroundColor: "#D1D5DB",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  closeButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
});

export default ReferralScreen;
