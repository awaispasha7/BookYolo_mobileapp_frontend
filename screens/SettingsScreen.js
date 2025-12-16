// screens/SettingsScreen.js (Updated without Notifications)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthProvider';
import { useNotifications } from '../context/NotificationProvider';
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

const SettingsScreen = ({ navigation }) => {
  const { signOut } = useAuth();
  const { isInitialized } = useNotifications();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notificationTypes, setNotificationTypes] = useState({
    scanLimits: true,
    referralRewards: true,
    upgradeReminders: true,
  });

  useEffect(() => {
    const loadNotificationSettings = async () => {
      const typeSettings = await notificationService.getNotificationTypeSettings();
      setNotificationTypes(typeSettings);
    };
    loadNotificationSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const loadNotificationSettings = async () => {
        const typeSettings = await notificationService.getNotificationTypeSettings();
        setNotificationTypes(typeSettings);
      };
      loadNotificationSettings();
    });
    return unsubscribe;
  }, [navigation]);

  const handleNotificationTypeToggle = async (type, value) => {
    await notificationService.setNotificationTypeEnabled(type, value);
    setNotificationTypes(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setDeleteError("Please type 'DELETE' to confirm");
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const { data, error } = await apiClient.deleteAccount(deleteConfirmText);

      if (error) {
        setDeleteError(error);
        return;
      }

      // Account deleted successfully, sign out and navigate to splash
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Splash' }],
      });
    } catch (error) {
      setDeleteError(error.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  };

  const showDeleteConfirmation = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => setShowDeleteModal(true)
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button, Logo and Version */}
      <View style={styles.header}>
        <View style={styles.backButtonContainer}>
          <BackButton 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
          />
        </View>
        
      </View>
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Account Management</Text>
      </View>
      
      {/* Notification Settings - Inline */}
      <View style={styles.notificationSection}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        
        <View style={styles.notificationToggleContainer}>
          <View style={styles.notificationToggleInfo}>
            <Text style={styles.notificationToggleLabel}>Referral Rewards</Text>
            <Text style={styles.notificationToggleDesc}>When you earn referral bonuses</Text>
          </View>
          <Switch
            value={notificationTypes.referralRewards || false}
            onValueChange={(value) => handleNotificationTypeToggle('referralRewards', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={notificationTypes.referralRewards ? '#ffffff' : '#9CA3AF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        <View style={styles.notificationToggleContainer}>
          <View style={styles.notificationToggleInfo}>
            <Text style={styles.notificationToggleLabel}>Upgrade to Premium</Text>
            <Text style={styles.notificationToggleDesc}>When upgrade opportunities are available</Text>
          </View>
          <Switch
            value={notificationTypes.upgradeReminders || false}
            onValueChange={(value) => handleNotificationTypeToggle('upgradeReminders', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={notificationTypes.upgradeReminders ? '#ffffff' : '#9CA3AF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        <View style={styles.notificationToggleContainer}>
          <View style={styles.notificationToggleInfo}>
            <Text style={styles.notificationToggleLabel}>Scan Limit</Text>
            <Text style={styles.notificationToggleDesc}>When 5 scans are left</Text>
          </View>
          <Switch
            value={notificationTypes.scanLimits || false}
            onValueChange={(value) => handleNotificationTypeToggle('scanLimits', value)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={notificationTypes.scanLimits ? '#ffffff' : '#9CA3AF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.option, styles.deleteOption]}
        onPress={showDeleteConfirmation}
        activeOpacity={0.7}
      >
        <Text style={styles.deleteOptionText}>Delete Account</Text>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalSubtitle}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            <Text style={styles.modalInstruction}>
              Type <Text style={styles.modalBold}>DELETE</Text> to confirm:
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={(text) => {
                setDeleteConfirmText(text);
                setDeleteError('');
              }}
              placeholder="Type DELETE here"
              autoCapitalize="characters"
            />
            
            {deleteError ? (
              <Text style={styles.modalError}>{deleteError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError('');
                }}
                disabled={deleteLoading}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#ffffff',
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    marginTop: 45,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e162a',
    marginRight: 12,
    letterSpacing: -0.5,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 17,
    color: "#1e162a",
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  optionValue: {
    fontSize: 16,
    color: "#070707",
  },
  deleteOption: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
    marginTop: 20,
  },
  deleteOptionText: {
    fontSize: 17,
    color: "#EF4444",
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  notificationSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e162a',
    marginBottom: 16,
  },
  notificationToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationToggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationToggleLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationToggleDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  modalInstruction: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  modalBold: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  modalError: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonDelete: {
    backgroundColor: '#EF4444',
  },
  modalButtonDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default SettingsScreen;
