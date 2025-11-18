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
  Image,
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Modal-style Card Container - Matching Web App */}
        <View style={styles.card}>
          <Text style={styles.title}>Edit Profile</Text>
          
          {/* Success Message */}
          {successMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}
          
          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {/* Full Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
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
              />
              {errors.fullName && <Text style={styles.fieldErrorText}>{errors.fullName}</Text>}
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
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
              />
              {errors.email && <Text style={styles.fieldErrorText}>{errors.email}</Text>}
            </View>

            {/* New Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={[styles.input, errors.newPassword && styles.inputError]}
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
              />
              {errors.newPassword && <Text style={styles.fieldErrorText}>{errors.newPassword}</Text>}
            </View>

            {/* Confirm New Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
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
              />
              {errors.confirmPassword && <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Action Buttons - Matching Web App */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setErrorMessage("");
                  setSuccessMessage("");
                  navigation.goBack();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#1F2937", // text-gray-900
  },
  successContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F0FDF4", // bg-green-50
    borderWidth: 1,
    borderColor: "#BBF7D0", // border-green-200
    borderRadius: 8,
  },
  successText: {
    fontSize: 14,
    color: "#166534", // text-green-800
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#FEF2F2", // bg-red-50
    borderWidth: 1,
    borderColor: "#FECACA", // border-red-200
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#991B1B", // text-red-800
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    color: "#374151", // text-gray-700
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: "#D1D5DB", // border-gray-300
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#EF4444", // red-500
  },
  fieldErrorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#D1D5DB", // bg-gray-300
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  cancelButtonText: {
    color: "#374151", // text-gray-700
    fontSize: 14,
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#1F2937", // bg-gray-900
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
});
