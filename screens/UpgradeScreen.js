// screens/UpgradeScreen.js — Frontend-only UI per MVP v17.7.9.9b
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused, useNavigationState } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthProvider';
import notificationService from '../lib/notificationService';

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

const UpgradeScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState('free');

  useEffect(() => {
    if (user) {
      setUserPlan(user.plan || 'free');
    }
  }, [user?.plan]);

  // Send upgrade notification logic
  useFocusEffect(
    React.useCallback(() => {
      const checkAndSendNotifications = async () => {
        try {
          // Check notification permissions
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') {
              return;
            }
          }

          const userName = user?.email?.split('@')[0] || 'User';

          // 1. Send one-time notification when user first visits upgrade screen in this session
          const sessionId = await AsyncStorage.getItem('current_login_session_id');
          if (sessionId) {
            const sessionVisitKey = `upgrade_screen_notification_${sessionId}`;
            const hasSessionNotification = await AsyncStorage.getItem(sessionVisitKey);
            
            if (!hasSessionNotification) {
              const upgradeId = `upgrade_screen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              await Notifications.scheduleNotificationAsync({
                identifier: upgradeId,
                content: {
                  title: 'Upgrade to Premium! ⭐',
                  body: `Hi ${userName}, unlock 300+ extra scans and advanced features with BookYolo Premium!`,
                  data: {
                    type: 'upgrade_reminder',
                    uniqueId: upgradeId,
                    timestamp: Date.now()
                  },
                  sound: true,
                },
                trigger: null,
              });
              
              await AsyncStorage.setItem(sessionVisitKey, 'true');
            }
          }

          // 2. Check if user qualifies for premium (3+ referrals) and hasn't upgraded yet
          // Only show milestone notification if user hasn't upgraded yet
          if ((userPlan !== 'premium') && (user?.id || user?.user?.id)) {
            try {
              const userId = user?.id || user?.user?.id;
              const { data: stats } = await apiClient.getReferralStats(userId);
              
              if (stats && stats.referral_count >= 3 && !stats.has_premium) {
                // User has 3+ referrals but hasn't upgraded - show notification
                const milestoneKey = `upgrade_milestone_notification_${userId}`;
                const lastMilestoneCount = await AsyncStorage.getItem(milestoneKey);
                const currentCount = stats.referral_count || 0;
                
                // Only show if we haven't shown for this milestone count yet
                if (lastMilestoneCount !== String(currentCount)) {
                  const milestoneId = `upgrade_milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  
                  await Notifications.scheduleNotificationAsync({
                    identifier: milestoneId,
                    content: {
                      title: 'You Qualify for Premium! 🎉',
                      body: `Hi ${userName}, you've earned ${currentCount} referrals! Upgrade to Premium now for unlimited scans!`,
                      data: {
                        type: 'upgrade_reminder',
                        uniqueId: milestoneId,
                        timestamp: Date.now()
                      },
                      sound: true,
                    },
                    trigger: null,
                  });
                  
                  await AsyncStorage.setItem(milestoneKey, String(currentCount));
                }
              }
            } catch (error) {
              // Silent error handling
            }
          }
          
        } catch (error) {
          // Silent error handling
        }
      };
      
      checkAndSendNotifications();
    }, [user, userPlan])
  );

  const handleUpgrade = async () => {
    if (userPlan === 'premium') {
      Alert.alert('Already Premium', 'You already have a Premium subscription!');
      return;
    }

    // console.log('💳 UPGRADE: Creating checkout session');
    setLoading(true);
    try {
      const { data, error } = await apiClient.createCheckoutSession('premium_yearly');
      
      // console.log('💳 UPGRADE: Checkout session response', { 
      //   hasData: !!data, 
      //   hasError: !!error, 
      //   data: data,
      //   error: error 
      // });
      
      if (error) {
        // console.error('💳 UPGRADE: Failed to create checkout session', { error });
        Alert.alert('Error', 'Failed to create checkout session. Please try again.');
        return;
      }

      if (data && data.checkout_url) {
        // console.log('💳 UPGRADE: Checkout URL received, opening browser', { 
        //   url: data.checkout_url,
        //   urlLength: data.checkout_url?.length 
        // });
        
        // Open Stripe checkout in browser
        const supported = await Linking.canOpenURL(data.checkout_url);
        // console.log('💳 UPGRADE: URL support check', { supported });
        
        if (supported) {
          // console.log('💳 UPGRADE: Opening checkout URL');
          await Linking.openURL(data.checkout_url);
        } else {
          // console.error('💳 UPGRADE: Cannot open checkout URL');
          Alert.alert('Error', 'Cannot open checkout URL');
        }
      } else {
        // console.error('💳 UPGRADE: Invalid checkout response', { data });
        Alert.alert('Error', 'Invalid checkout response');
      }
    } catch (error) {
      // console.error('💳 UPGRADE: Unexpected error during upgrade', { 
      //   error: error.message, 
      //   stack: error.stack 
      // });
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      // console.log('💳 UPGRADE: Upgrade process completed');
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Purchase',
      'If you have an active Premium subscription, it will be restored automatically when you log in.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Refresh', 
          onPress: async () => {
            setLoading(true);
            try {
              await refreshUser();
              Alert.alert('Success', 'User data refreshed. Your subscription status has been updated.');
            } catch (error) {
              Alert.alert('Error', 'Failed to refresh user data');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };



  return (
    <View style={styles.container}>
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
        
      </View>
      <Text style={styles.title}>Upgrade to Premium</Text>


      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Free Plan */}
        <View style={[styles.planCard, styles.card]}>
          <Text style={styles.badge}>BookYolo Free</Text>
          <Text style={styles.priceFree}>$0</Text>
          <Text style={styles.billingText}>No credit card required</Text>
          <Text style={styles.usageType}>Fair Use</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>What's included:</Text>
          <Text style={styles.planFeature}>Fair Use: 50 scans per year</Text>
          <Text style={styles.planFeature}>100-point deep inspection analysis</Text>
          <Text style={styles.planFeature}>Expectation fit & recent quality change detection</Text>
          <Text style={styles.planFeature}>Ask our AI anything about any listing</Text>
          <Text style={styles.planFeature}>Compare listings side-by-side</Text>
          <Text style={styles.planFeature}>Access on web + iPhone app</Text>
        </View>

        {/* Premium Plan */}
        <View style={[styles.planCard, styles.card, styles.premiumCard]}>
          <Text style={[styles.badge, styles.badgePremium]}>BookYolo Premium</Text>
          <Text style={styles.price}>$20/year</Text>
          <Text style={styles.billingText}>Auto-renews via Stripe</Text>
          <Text style={styles.usageType}>Power Use</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Everything in Free, plus:</Text>
          <Text style={styles.planFeature}>Power Use: +300 additional scans per year</Text>
          <Text style={styles.planFeature}>Priority support with faster responses</Text>
          <Text style={styles.planFeature}>Early access to new features & experimental AI tools</Text>

          <TouchableOpacity 
            style={[styles.ctaButton, loading && styles.disabledButton]} 
            onPress={handleUpgrade}
            disabled={loading || userPlan === 'premium'}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.ctaText}>
                {userPlan === 'premium' ? 'Already Premium' : 'Upgrade to BookYolo Premium'}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleRestore}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryText}>Have Premium? Restore</Text>
          </TouchableOpacity>
          
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e162a',
    marginBottom: 20,
    marginTop: 30,
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
  versionContainer: {
    position: 'absolute',
    right: 20,
    top: 35,
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  planCard: {},
  premiumCard: {
    borderWidth: 1,
    borderColor: '#1e162a33',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e9e8ea',
    color: '#070707',
    fontWeight: '700',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  badgePremium: {
    backgroundColor: '#e9e8ea',
    color: '#1e162a',
  },
  priceFree: {
    fontSize: 26,
    fontWeight: '800',
    color: '#070707',
    marginBottom: 2,
  },
  price: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1e162a',
    marginBottom: 2,
  },
  billingText: {
    color: '#070707',
    marginBottom: 6,
  },
  usageType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#070707',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#eef2f7',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#070707',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  planFeature: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  featureNote: {
    fontSize: 12,
    color: '#070707',
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: '#1e162a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  ctaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e9e8ea',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryText: {
    color: '#070707',
    fontSize: 14,
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: '#e9e8ea',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noteItem: {
    color: '#070707',
    marginBottom: 4,
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default UpgradeScreen;