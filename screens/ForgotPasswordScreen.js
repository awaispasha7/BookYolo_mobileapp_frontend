/**
 * ForgotPasswordScreen.js - Password Reset Request Screen
 * 
 * Allows users to request a password reset link via email.
 * 
 * Features:
 * - Email input for password reset
 * - Email validation
 * - Integration with backend password reset API
 * - Success/error feedback
 * - Navigation back to Login screen
 * 
 * Navigation:
 * - Back -> LoginScreen
 * - Successful reset -> LoginScreen (with confirmation message)
 */

import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import apiClient from '../lib/apiClient';
import { YOLO_LOGO } from '../constants/images';

const { width, height } = Dimensions.get('window');

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


const ForgotPasswordScreen = ({ navigation }) => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const keyboardDismissTimer = useRef(null);

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (keyboardDismissTimer.current) {
        clearTimeout(keyboardDismissTimer.current);
      }
    };
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (text) => {
    setEmail(text);
    // Clear error while typing - validation happens on blur
    if (emailError) {
      setEmailError('');
    }
    
    // Clear existing timer
    if (keyboardDismissTimer.current) {
      clearTimeout(keyboardDismissTimer.current);
    }
    
    // Set new timer to dismiss keyboard after 1.5 seconds of no typing (iPhone optimized)
    keyboardDismissTimer.current = setTimeout(() => {
      Keyboard.dismiss();
    }, 1500);
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    // Test basic API connection first
    try {
      const healthCheck = await apiClient.healthCheck();
    } catch (healthError) {
      // Silent error handling
    }
    
    try {
      const { data, error } = await requestPasswordReset(email);
      
      if (error) {
        // Temporary workaround: If it's HTTP 500, show a message to manually check email
        if (error.message.includes('HTTP 500')) {
          setEmailSent(true);
          Alert.alert(
            'Check Your Email',
            'There was a server error, but please check your email inbox for the password reset link. If you don\'t see it, try again in a few minutes.',
            [
              { 
                text: 'OK', 
                onPress: () => {
                  // Don't navigate away - stay on this screen so user can click email link
                }
              }
            ]
          );
          setLoading(false);
          return;
        }
        
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }

      setEmailSent(true);
      Alert.alert(
        'Password Reset Email Sent',
        'Please check your email and click the reset password link to open the web app and reset your password.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Don't navigate away - stay on this screen so user can click email link
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header with Back Button */}
        <View style={styles.topHeader}>
          <View style={styles.backButtonContainer}>
            <BackButton 
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Splash');
                }
              }}
            />
          </View>
          
          <View style={styles.headerLogoContainer}>
          </View>
          
          <View style={styles.versionContainer}>
          </View>
        </View>
        
        {/* Fixed Logo */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.fixedBrandingContainer}>
            <Image 
              source={YOLO_LOGO} 
              style={styles.centerLogo}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.content}>
            {/* Title */}
            <View style={styles.brandingContainer}>
              <Text style={styles.brandName}>
                {emailSent ? "Check Your Email" : "Reset Password"}
              </Text>
              <Text style={styles.welcomeText}>
                {emailSent 
                  ? `We've sent a password reset link to ${email}. Please check your email and click the link to continue.`
                  : "Enter your email address and we'll send you a link to reset your password."
                }
              </Text>
            </View>
            
            {!emailSent ? (
              <>
                {/* Email Input with Icon */}
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={emailFocused ? "#1e162a" : emailError ? "#ff4444" : "#999"} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[
                      styles.input, 
                      emailFocused && styles.inputFocused,
                      emailError && styles.inputError
                    ]}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={handleInputChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="none"
                    returnKeyType="done"
                    onFocus={() => {
                      setEmailFocused(true);
                      setEmailError('');
                      if (keyboardDismissTimer.current) {
                        clearTimeout(keyboardDismissTimer.current);
                      }
                    }}
                    onBlur={() => {
                      setEmailFocused(false);
                      // Validate email when user finishes typing
                      if (email && !validateEmail(email)) {
                        setEmailError('Please enter a valid email address');
                      } else {
                        setEmailError('');
                      }
                    }}
                    onSubmitEditing={handleResetPassword}
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                
                {/* Reset Password Button */}
                <TouchableOpacity 
                  style={[
                    styles.resetButton, 
                    loading && styles.disabledButton
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetButtonText}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Resend Email Button */}
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={() => {
                    setEmailSent(false);
                    setLoading(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resendButtonText}>
                    Resend Email
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Back to Login Button */}
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')} 
              activeOpacity={0.8}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>
                Back to Login
              </Text>
            </TouchableOpacity>
            
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 0,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 60,
    backgroundColor: 'transparent',
  },
  backButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  headerLogoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: 'transparent',
    marginHorizontal: 20,
  },
  versionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 85,
    height: 40,
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  fixedBrandingContainer: {
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  centerLogo: {
    width: 200,
    height: 200,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginBottom: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 0,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 40,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e162a',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9e8ea',
    marginBottom: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1e162a',
    paddingVertical: 0,
  },
  inputFocused: {
    borderColor: '#1e162a',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  resetButton: {
    backgroundColor: '#1e162a',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#1e162a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resendButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9e8ea',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9e8ea',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    textAlign: 'center',
    color: '#1e162a',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
