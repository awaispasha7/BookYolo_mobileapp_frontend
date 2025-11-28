// screens/EditProfileScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthProvider';

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

export default function EditProfileScreen({ navigation, route }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.name || user?.full_name || "",
    email: user?.email || "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Set form data from user context
    if (user) {
      setFormData({
        fullName: user.name || user.full_name || "",
        email: user.email || "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user]);

  const validateForm = () => {
    let newErrors = { ...errors };

    // Validate email
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    } else {
      delete newErrors.email;
    }

    // Validate password if provided
    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = "Password must be at least 6 characters";
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      } else {
        delete newErrors.newPassword;
        delete newErrors.confirmPassword;
      }
    } else {
      delete newErrors.newPassword;
      delete newErrors.confirmPassword;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await apiClient.updateProfile(
        formData.fullName,
        formData.email,
        formData.newPassword || null,
        formData.confirmPassword || null
      );

      if (error) {
        setErrorMessage(error);
        return;
      }

      // Refresh user data to get updated info
      if (refreshUser) {
        await refreshUser();
      }

      setSuccessMessage("Profile updated successfully!");
      
      // Clear password fields after successful update
      setFormData(prev => ({
        ...prev,
        newPassword: "",
        confirmPassword: "",
      }));

      // Clear success message after 3 seconds and navigate back
      setTimeout(() => {
        setSuccessMessage("");
        navigation.goBack();
      }, 2000);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-circle-outline" size={32} color="#1F2937" />
          </View>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal information</Text>
        </View>

        {/* Success Message */}
        {successMessage ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#166534" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}
        
        {/* Error Message */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#991B1B" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.form}>
            {/* Full Name Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="person-outline" size={16} color="#6B7280" style={styles.labelIcon} />
                <Text style={styles.label}>Full Name</Text>
              </View>
              <View style={[styles.inputWrapper, errors.fullName && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(text) => {
                    setFormData({ ...formData, fullName: text });
                    if (errors.fullName) {
                      setErrors(prev => ({ ...prev, fullName: undefined }));
                    }
                    setErrorMessage("");
                  }}
                  autoCapitalize="words"
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {errors.fullName && (
                <View style={styles.errorTextContainer}>
                  <Text style={styles.fieldErrorText}>{errors.fullName}</Text>
                </View>
              )}
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="mail-outline" size={16} color="#6B7280" style={styles.labelIcon} />
                <Text style={styles.label}>Email</Text>
              </View>
              <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }
                    setErrorMessage("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {errors.email && (
                <View style={styles.errorTextContainer}>
                  <Text style={styles.fieldErrorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            {/* New Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="lock-closed-outline" size={16} color="#6B7280" style={styles.labelIcon} />
                <Text style={styles.label}>New Password</Text>
              </View>
              <View style={[styles.inputWrapper, errors.newPassword && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  value={formData.newPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, newPassword: text });
                    if (errors.newPassword) {
                      setErrors(prev => ({ ...prev, newPassword: undefined }));
                    }
                    setErrorMessage("");
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="off"
                  placeholder="Leave blank to keep current"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {errors.newPassword && (
                <View style={styles.errorTextContainer}>
                  <Text style={styles.fieldErrorText}>{errors.newPassword}</Text>
                </View>
              )}
            </View>

            {/* Confirm New Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="lock-closed-outline" size={16} color="#6B7280" style={styles.labelIcon} />
                <Text style={styles.label}>Confirm New Password</Text>
              </View>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, confirmPassword: text });
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }
                    setErrorMessage("");
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="off"
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {errors.confirmPassword && (
                <View style={styles.errorTextContainer}>
                  <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setErrorMessage("");
              setSuccessMessage("");
              navigation.goBack();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleUpdateProfile}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#ffffff" style={styles.saveButtonIcon} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: 'center',
    fontWeight: "400",
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    marginHorizontal: 20,
  },
  successText: {
    fontSize: 14,
    color: "#166534",
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    marginHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#991B1B",
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
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
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    minHeight: 52,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    paddingVertical: 14,
    fontWeight: "400",
  },
  errorTextContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldErrorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#1F2937",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonIcon: {
    marginRight: 6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
