// screens/PlanStatusScreen.js (Updated to match web app design and logic)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  Linking,
  Clipboard,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import apiClient from '../lib/apiClient';

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

export default function PlanStatusScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  
  // Upgrade states
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  
  // Cancel subscription states
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');
  
  // Edit Profile states
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    new_password: '',
    confirm_password: '',
  });
  
  // Delete Account states
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  
  // User data state - matching web app structure
  const [userData, setUserData] = useState(null);

  // Load user data on mount - matching web app logic
  useEffect(() => {
    const initialLoadUserData = async () => {
      setLoading(true);
      try {
        const { data, error: userError } = await apiClient.getCurrentUser();
        
        if (userError) {
          setError('Failed to load user data');
          setLoading(false);
          return;
        }

        if (data) {
          // Structure the data to match web app: { user: {...}, remaining, used, ... }
          const structuredUser = {
            user: {
              ...data.user,
              remaining: data.remaining,
              used: data.used,
              subscription_status: data.subscription_status,
              subscription_expires: data.subscription_expires
            }
          };
          setUserData(structuredUser);
          
          // The /me endpoint already auto-grants premium if user has 3+ referrals
          // Double-check by calling referral stats if plan is still free
          if (data.plan !== 'premium' && data.user?.id) {
            try {
              const { data: stats } = await apiClient.getReferralStats(data.user.id);
              
              if (stats && stats.has_premium && stats.plan === 'premium') {
                // Small delay to ensure backend has processed
                setTimeout(async () => {
                  const { data: refreshedData } = await apiClient.getCurrentUser();
                  if (refreshedData) {
                    const refreshedUser = {
                      user: {
                        ...refreshedData.user,
                        remaining: refreshedData.remaining,
                        used: refreshedData.used,
                        subscription_status: refreshedData.subscription_status,
                        subscription_expires: refreshedData.subscription_expires
                      }
                    };
                    setUserData(refreshedUser);
                    if (refreshUser) {
                      await refreshUser();
                    }
                  }
                }, 500);
              }
            } catch (err) {
              // Silent error handling
            }
          }
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    initialLoadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data, error: userError } = await apiClient.getCurrentUser();
      
      if (userError) {
        setError('Failed to load user data');
        return;
      }

      if (data) {
        const structuredUser = {
          user: {
            ...data.user,
            remaining: data.remaining,
            used: data.used,
            subscription_status: data.subscription_status,
            subscription_expires: data.subscription_expires
          }
        };
        setUserData(structuredUser);
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleReferralModalOpen = () => {
    navigation.navigate('Referral');
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    setUpgradeError('');

    try {
      const { data, error: upgradeError } = await apiClient.createCheckoutSession('premium_yearly');
      
      if (upgradeError) {
        setUpgradeError(upgradeError);
        return;
      }

      if (data && data.checkout_url) {
        const supported = await Linking.canOpenURL(data.checkout_url);
        if (supported) {
          await Linking.openURL(data.checkout_url);
        } else {
          setUpgradeError('Cannot open checkout URL');
        }
      } else {
        setUpgradeError('Invalid checkout response');
      }
    } catch (err) {
      setUpgradeError(err.message || 'Payment setup failed');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!userData) {
      setCancelError("Please log in to cancel subscription");
      return;
    }

    // Confirm cancellation
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel your subscription? Your premium access will continue until the end of your current billing period, but your subscription will not renew automatically.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            setCancelLoading(true);
            setCancelError('');
            setCancelSuccess('');

            try {
              const { data, error: cancelError } = await apiClient.cancelSubscription();
              
              if (cancelError) {
                setCancelError(cancelError);
                return;
              }

              setCancelSuccess(data?.message || "Subscription cancellation scheduled successfully");
              
              // Refresh user data to reflect the cancellation
              await loadUserData();
            } catch (err) {
              setCancelError(err.message || "Failed to cancel subscription. Please try again.");
            } finally {
              setCancelLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    setEditProfileLoading(true);
    setEditProfileError('');
    setEditProfileSuccess('');

    try {
      const { data, error: updateError } = await apiClient.updateProfile(
        editFormData.full_name,
        editFormData.email,
        editFormData.new_password || null,
        editFormData.confirm_password || null
      );

      if (updateError) {
        setEditProfileError(updateError);
        return;
      }

      // Refresh user data to get updated scan balance
      await loadUserData();
      
      setEditProfileSuccess("Profile updated successfully!");
      setShowEditProfile(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setEditProfileSuccess(''), 3000);
    } catch (err) {
      setEditProfileError(err.message || "Failed to update profile");
    } finally {
      setEditProfileLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteAccountError("Please type 'DELETE' to confirm");
      return;
    }

    setDeleteAccountLoading(true);
    setDeleteAccountError('');

    try {
      const { error: deleteError } = await apiClient.deleteAccount(deleteConfirmText);
      
      if (deleteError) {
        setDeleteAccountError(deleteError);
        return;
      }

      // Account deleted successfully, logout and navigate to login
      await apiClient.logout();
      navigation.navigate('Login');
    } catch (err) {
      setDeleteAccountError(err.message || "Failed to delete account");
    } finally {
      setDeleteAccountLoading(false);
    }
  };


  const copyEmailToClipboard = async () => {
    Clipboard.setString('help@bookyolo.com');
    Alert.alert('Success', 'Email address copied to clipboard!');
  };

  const openGmail = () => {
    const url = 'https://mail.google.com/mail/?view=cm&fs=1&to=help@bookyolo.com&su=BookYolo Support Request&body=Hi BookYolo Team,%0D%0A%0D%0AI need help with:%0D%0A%0D%0A[Please describe your question or issue here]%0D%0A%0D%0AThank you!';
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Gmail'));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1F2937" />
          <Text style={styles.loadingText}>Loading your account...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.errorButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPremium = userData?.user?.plan === 'premium';
  const currentUser = userData?.user || user;

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
        
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Header */}
        {/* <View style={styles.accountHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </View>
          {currentUser?.full_name && (
            <Text style={styles.userName}>{currentUser.full_name}</Text>
          )}
          {currentUser?.email && (
            <Text style={styles.userEmail}>{currentUser.email}</Text>
          )}
        </View> */}

        {/* Current Plan & Usage Card */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View style={styles.planCardIconContainer}>
              <Ionicons name="card-outline" size={24} color="#1F2937" />
            </View>
            <Text style={styles.planCardTitle}>Current Plan & Usage</Text>
          </View>
          
          <View style={styles.planDivider} />
          
          <View style={styles.planRow}>
            <View style={styles.planRowLeft}>
              <Ionicons name="star-outline" size={18} color="#6B7280" style={styles.planRowIcon} />
              <Text style={styles.planLabel}>Plan</Text>
            </View>
            <View style={[styles.planBadge, isPremium ? styles.premiumBadge : styles.freeBadge]}>
              <Text style={[styles.planBadgeText, isPremium ? styles.premiumBadgeText : styles.freeBadgeText]}>
                {isPremium ? 'BookYolo Premium' : 'BookYolo Free'}
              </Text>
            </View>
          </View>
          
          <View style={styles.planRow}>
            <View style={styles.planRowLeft}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#6B7280" style={styles.planRowIcon} />
              <Text style={styles.planLabel}>Remaining Scans</Text>
            </View>
            <Text style={[styles.planValue, (currentUser?.remaining || 0) > 0 ? styles.remainingGreen : styles.remainingRed]}>
              {currentUser?.remaining || 0}
            </Text>
          </View>
          
          <View style={styles.planRow}>
            <View style={styles.planRowLeft}>
              <Ionicons name="analytics-outline" size={18} color="#6B7280" style={styles.planRowIcon} />
              <Text style={styles.planLabel}>Total Scans Used</Text>
            </View>
            <Text style={styles.planValue}>{currentUser?.used || 0}</Text>
          </View>
          
          {isPremium && currentUser?.subscription_expires ? (
            <View style={styles.planRow}>
              <View style={styles.planRowLeft}>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.planRowIcon} />
                <Text style={styles.planLabel}>Expires On</Text>
              </View>
              <Text style={styles.planValue}>
                {new Date(currentUser.subscription_expires).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ) : !isPremium ? (
            <View style={styles.planRow}>
              <View style={styles.planRowLeft}>
                <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.planRowIcon} />
                <Text style={styles.planLabel}>Renews On</Text>
              </View>
              <Text style={styles.planValue}>
                {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons - Matching Web App */}
        <View style={styles.actionsContainer}>
          {/* Upgrade Error */}
          {upgradeError && (
            <View style={styles.errorMessage}>
              <Text style={styles.errorMessageText}>{upgradeError}</Text>
            </View>
          )}

          {/* Cancel Subscription Error/Success */}
          {cancelError && (
            <View style={styles.errorMessage}>
              <Text style={styles.errorMessageText}>{cancelError}</Text>
            </View>
          )}
          {cancelSuccess && (
            <View style={styles.successMessage}>
              <Text style={styles.successMessageText}>{cancelSuccess}</Text>
            </View>
          )}

          {/* Upgrade/Downgrade Button */}
          {/* {!isPremium && (
            <TouchableOpacity
              style={[styles.actionButton, styles.upgradeButton, upgradeLoading && styles.disabledButton]}
              onPress={handleUpgrade}
              disabled={upgradeLoading}
              activeOpacity={0.8}
            >
              {upgradeLoading ? (
                <View style={styles.upgradeButtonContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.upgradeButtonText}>Setting up payment...</Text>
                </View>
              ) : (
                <View style={styles.upgradeButtonContent}>
                  <Ionicons name="star" size={20} color="#ffffff" style={styles.upgradeIcon} />
                  <View style={styles.upgradeTextContainer}>
                    <Text style={styles.upgradeButtonText}>Upgrade to BookYolo Premium</Text>
                    <Text style={styles.upgradeButtonSubtext}>300 extra scans per year for $20/year</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )} */}

          {/* Cancel Subscription Button - Only show for paid premium users */}
          {/* {isPremium && currentUser?.subscription_id && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton, (cancelLoading || currentUser?.subscription_status === 'cancel_at_period_end') && styles.disabledButton]}
              onPress={handleCancelSubscription}
              disabled={cancelLoading || currentUser?.subscription_status === 'cancel_at_period_end'}
              activeOpacity={0.8}
            >
              {cancelLoading ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.cancelButtonText}>Canceling subscription...</Text>
                </>
              ) : currentUser?.subscription_status === 'cancel_at_period_end' ? (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.cancelButtonText}>Subscription Canceled (Active Until Expiry)</Text>
                </>
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#ffffff" />
                  <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                </>
              )}
            </TouchableOpacity>
          )} */}

          {/* Referral Link - Only show for non-premium users */}
          {/* {!isPremium && (
            <TouchableOpacity
              style={[styles.actionButton, styles.referralButton]}
              onPress={handleReferralModalOpen}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social" size={20} color="#ffffff" />
              <Text style={styles.referralButtonText}>Share with 3 Friends and Get BookYolo Premium for Free</Text>
            </TouchableOpacity>
          )} */}

          {/* Edit Profile */}
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <View style={styles.editIconContainer}>
              <Ionicons name="create-outline" size={20} color="#374151" />
            </View>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity> */}

          {/* Contact Support */}
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.contactButton]}
            onPress={() => navigation.navigate('ContactSocial')}
            activeOpacity={0.7}
          >
            <View style={styles.contactIconWrapper}>
              <Ionicons name="headset-outline" size={20} color="#374151" />
            </View>
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity> */}

          {/* Delete Account */}
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => {
              setDeleteConfirmText('');
              setDeleteAccountError('');
              setShowDeleteAccount(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.deleteIconContainer}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity> */}
        </View>

        {/* Legal Links */}
        <View style={styles.legalSection}>
          <View style={styles.legalLinks}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://bookyolo.com/terms-of-services')}
              style={styles.legalLinkTouchable}
            >
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://bookyolo.com/privacy-policy')}
              style={styles.legalLinkTouchable}
            >
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://bookyolo.com/cookie-policy')}
              style={styles.legalLinkTouchable}
            >
              <Text style={styles.legalLink}>Cookie Policy</Text>
            </TouchableOpacity>
          </View>

          {/* Disclaimer - Matching Web App */}
          <Text style={styles.disclaimer}>
            BookYolo is an Independent AI Engine that analyzes public vacation rental, hotel and hospitality listing information. We are not affiliated with, endorsed by or sponsored by any online travel agency. All trademarks remain the property of their respective owners. BookYolo does not guarantee booking outcomes. Always double-check before booking.
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal - Matching Web App */}
      <Modal
        visible={showEditProfile}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            {editProfileSuccess && (
              <View style={styles.modalSuccessMessage}>
                <Text style={styles.modalSuccessText}>{editProfileSuccess}</Text>
              </View>
            )}
            
            {editProfileError && (
              <View style={styles.modalErrorMessage}>
                <Text style={styles.modalErrorText}>{editProfileError}</Text>
              </View>
            )}
            
            <View style={styles.modalForm}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editFormData.full_name}
                  onChangeText={(text) => setEditFormData({ ...editFormData, full_name: text })}
                  placeholder="Enter your full name"
            />
          </View>
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Email</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editFormData.email}
                  onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter your email"
                />
              </View>
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editFormData.new_password}
                  onChangeText={(text) => setEditFormData({ ...editFormData, new_password: text })}
                  secureTextEntry
                  placeholder="Leave blank to keep current"
                />
              </View>
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editFormData.confirm_password}
                  onChangeText={(text) => setEditFormData({ ...editFormData, confirm_password: text })}
                  secureTextEntry
                  placeholder="Confirm new password"
                />
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowEditProfile(false);
                  setEditProfileError('');
                  setEditProfileSuccess('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSaveButton, editProfileLoading && styles.disabledButton]}
                onPress={handleUpdateProfile}
                disabled={editProfileLoading}
              >
                {editProfileLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal - Matching Web App */}
      <Modal
        visible={showDeleteAccount}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteAccount(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalDescription}>
              This will permanently delete your account and all associated data. This action cannot be undone.
          </Text>
            
            {deleteAccountError && (
              <View style={styles.modalErrorMessage}>
                <Text style={styles.modalErrorText}>{deleteAccountError}</Text>
              </View>
            )}
            
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Type "DELETE" to confirm:</Text>
              <TextInput
                style={styles.modalInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Type DELETE to confirm"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowDeleteAccount(false);
                  setDeleteAccountError('');
                  setDeleteConfirmText('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton, (deleteAccountLoading || deleteConfirmText !== 'DELETE') && styles.disabledButton]}
                onPress={handleDeleteAccount}
                disabled={deleteAccountLoading || deleteConfirmText !== 'DELETE'}
              >
                {deleteAccountLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#ffffff',
    fontWeight: '600',
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
    marginTop: 70,
  },
  logo: {
    width: 45,
    height: 45,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    marginTop: 30,
  },
  accountHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 10,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '400',
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  planDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  planRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planRowIcon: {
    marginRight: 10,
  },
  planLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  planValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  planBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  premiumBadge: {
    backgroundColor: '#D1FAE5',
  },
  freeBadge: {
    backgroundColor: '#F3F4F6',
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  premiumBadgeText: {
    color: '#065F46',
  },
  freeBadgeText: {
    color: '#1F2937',
  },
  remainingGreen: {
    color: '#059669',
  },
  remainingRed: {
    color: '#DC2626',
  },
  actionsContainer: {
    marginBottom: 32,
  },
  errorMessage: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorMessageText: {
    fontSize: 14,
    color: '#DC2626',
  },
  successMessage: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successMessageText: {
    fontSize: 14,
    color: '#166534',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeButton: {
    backgroundColor: '#059669',
    justifyContent: 'center',
  },
  upgradeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  upgradeIcon: {
    marginRight: 10,
  },
  upgradeTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  upgradeButtonSubtext: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.95,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '400',
  },
  cancelButton: {
    backgroundColor: '#DC2626',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  referralButton: {
    backgroundColor: '#1F2937',
    justifyContent: 'flex-start',
  },
  referralButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
    marginLeft: 12,
  },
  editButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  editButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  contactButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
  },
  contactButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
    marginLeft: 12,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  deleteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  legalSection: {
    marginTop: 32,
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  legalLinkTouchable: {
    marginHorizontal: 12,
    marginVertical: 4,
  },
  legalLink: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  modalSuccessMessage: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalSuccessText: {
    fontSize: 14,
    color: '#166534',
  },
  modalErrorMessage: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalErrorText: {
    fontSize: 14,
    color: '#991B1B',
  },
  modalForm: {
    marginBottom: 24,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#D1D5DB',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  modalSaveButton: {
    backgroundColor: '#1F2937',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  modalDeleteButton: {
    backgroundColor: '#DC2626',
  },
  modalDeleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  // Contact Modal Styles
  contactHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactEmailBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  contactEmailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  contactEmailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  contactCopyButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  contactGmailButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  contactGmailButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  contactCloseButton: {
    backgroundColor: '#D1D5DB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactCloseButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  // Referral Modal Styles
  referralHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  referralIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  referralModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  referralLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  referralLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  referralStatsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  referralStatsContent: {
    alignItems: 'center',
  },
  referralCountNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  referralCountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  referralPremiumBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  referralPremiumBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  referralNeededText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  referralProgressContainer: {
    width: '100%',
    marginTop: 12,
  },
  referralProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  referralProgressFill: {
    height: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 999,
  },
  referralProgressLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'center',
  },
  referralLinkBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  referralLinkLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  referralLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referralLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  referralCopyButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  referralShareSection: {
    marginBottom: 24,
  },
  referralShareLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  referralShareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  referralShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '48%',
    gap: 6,
  },
  referralXButton: {
    backgroundColor: '#000000',
  },
  referralFacebookButton: {
    backgroundColor: '#1877F2',
  },
  referralWhatsAppButton: {
    backgroundColor: '#25D366',
  },
  referralEmailButton: {
    backgroundColor: '#4B5563',
  },
  referralXButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  referralShareButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  referralCloseButton: {
    backgroundColor: '#D1D5DB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  referralCloseButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
});
