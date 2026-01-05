import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Linking, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Pressable, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { YOLO_LOGO } from '../constants/images';

const { width, height } = Dimensions.get('window');

// Inline iPhone Back Button Component
function BackButton({ onPress, style }) {
  return (
    <TouchableOpacity 
      style={[{
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
      }, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="chevron-back" 
        size={24} 
        color="#1e162a" 
      />
    </TouchableOpacity>
  );
}

const SignUpScreen = ({ navigation, route }) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [referralCode, setReferralCode] = useState(null);
  const lastTapRef = useRef(0);
  const keyboardDismissTimer = useRef(null);
  const scrollViewRef = useRef(null);

  // Get referral code from route params (from deep link or navigation)
  React.useEffect(() => {
    if (route?.params?.referralCode) {
      setReferralCode(route.params.referralCode);
    }
  }, [route?.params?.referralCode]);

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

  const handleInputChange = (text, setter) => {
    setter(text);
    
    // Clear existing timer
    if (keyboardDismissTimer.current) {
      clearTimeout(keyboardDismissTimer.current);
    }
    
    // Set new timer to dismiss keyboard after 1.5 seconds of no typing (iPhone optimized)
    keyboardDismissTimer.current = setTimeout(() => {
      Keyboard.dismiss();
    }, 1500);
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    // Clear error while typing - validation happens on blur
    if (emailError) {
      setEmailError('');
    }
  };

  const handleSignUp = async () => {
    // Prevent double taps
    const now = Date.now();
    if (now - lastTapRef.current < 1000) {
      return;
    }
    lastTapRef.current = now;

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (!agreeToTerms) {
      Alert.alert("Error", "Please agree to the Terms and Conditions");
      return;
    }

    if (!agreeToPrivacy) {
      Alert.alert("Error", "Please agree to the Privacy Policy");
      return;
    }

    if (loading) {
      return; // Prevent multiple simultaneous requests
    }

    setLoading(true);

    try {
      // Pass referral code to signUp function (matching web frontend)
      const { data, error } = await signUp(email, password, name, referralCode);
      
      // console.log('Sign up response:', { data, error });
      
      if (error) {
        // console.log('Sign up error details:', error);
        
        // Handle the error message properly
        let errorMessage = 'Sign up failed. Please try again.';
        
        if (error && error.message) {
          // If error.message is "[object Object]", try to extract the real error
          if (error.message === '[object Object]') {
            errorMessage = 'Email already exists or invalid data. Please try again.';
          } else {
            errorMessage = error.message;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // console.log('Displaying error message:', errorMessage);
        Alert.alert('Sign Up Failed', errorMessage);
        setLoading(false);
        return;
      }

      if (data?.message) {
        // Show success confirmation and navigate directly to login
        Alert.alert(
          'Success!',
          'We confirm that you have successfully registered. Please check your inbox to verify your email.',
          [ 
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate to Login screen while preserving the navigation stack
                navigation.navigate('Login');
              } 
            } 
          ]
        );
      } else {
        Alert.alert('Sign Up Failed', 'No confirmation message received');
        setLoading(false);
      }
    } catch (error) {
      // console.error('Sign up error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTermsPress = () => {
    // Navigate to terms screen or open web link
    Linking.openURL('https://bookyolo.com/terms-of-services');
  };

  const handlePrivacyPress = () => {
    // Navigate to privacy screen or open web link
    Linking.openURL('https://bookyolo.com/privacy-policy');
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button, Logo and Version */}
      <View style={styles.topHeader}>
        <View style={styles.backButtonContainer}>
          <BackButton onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Splash');
            }
          }} />
        </View>
        
        <View style={styles.headerLogoContainer}>
        </View>
        
        <View style={styles.versionContainer}>
        </View>
      </View>
      
      {/* Fixed Logo and Title */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.fixedBrandingContainer}>
          <Image 
            source={YOLO_LOGO} 
            style={styles.centerLogo}
            resizeMode="contain"
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Referral Message - Matching Web Frontend */}
      {referralCode && (
        <View style={styles.referralMessageContainer}>
          <Ionicons name="share-social" size={20} color="#1e162a" />
          <Text style={styles.referralMessageText}>You were referred by a friend! 🎉</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.contentContainer}>
              {/* Full Name Input with Icon */}
          <View style={styles.inputContainer}>
            <Ionicons 
              name="person-outline" 
              size={20} 
              color={nameFocused ? "#1e162a" : "#999"} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, nameFocused && styles.inputFocused]}
              placeholder="First Name"
              placeholderTextColor="#999"
              autoCapitalize="words"
              autoComplete="off"
              value={name}
              onChangeText={(text) => handleInputChange(text, setName)}
              returnKeyType="next"
              onFocus={() => {
                setNameFocused(true);
                if (keyboardDismissTimer.current) {
                  clearTimeout(keyboardDismissTimer.current);
                }
              }}
              onBlur={() => setNameFocused(false)}
            />
          </View>
          
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
              placeholder="Email address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="off"
              value={email}
              onChangeText={handleEmailChange}
              returnKeyType="next"
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
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          
          {/* Password Input with Icon */}
          <View style={styles.inputContainer}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={passwordFocused ? "#1e162a" : "#999"} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, passwordFocused && styles.inputFocused]}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              autoComplete="new-password"
              autoCorrect={false}
              spellCheck={false}
              textContentType="newPassword"
              value={password}
              onChangeText={(text) => handleInputChange(text, setPassword)}
              returnKeyType="next"
              onFocus={() => {
                setPasswordFocused(true);
                if (keyboardDismissTimer.current) {
                  clearTimeout(keyboardDismissTimer.current);
                }
              }}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>
          
          {/* Confirm Password Input with Icon */}
          <View style={styles.inputContainer}>
            <Ionicons 
              name="lock-closed-outline" 
              size={20} 
              color={confirmPasswordFocused ? "#1e162a" : "#999"} 
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, confirmPasswordFocused && styles.inputFocused]}
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              secureTextEntry
              autoComplete="new-password"
              autoCorrect={false}
              spellCheck={false}
              textContentType="newPassword"
              value={confirmPassword}
              onChangeText={(text) => handleInputChange(text, setConfirmPassword)}
              returnKeyType="done"
              onFocus={() => {
                setConfirmPasswordFocused(true);
                if (keyboardDismissTimer.current) {
                  clearTimeout(keyboardDismissTimer.current);
                }
              }}
              onBlur={() => setConfirmPasswordFocused(false)}
              onSubmitEditing={handleSignUp}
            />
          </View>
          
          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.linkText} onPress={handleTermsPress}>
                  Terms of Service
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Policy */}
          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setAgreeToPrivacy(!agreeToPrivacy)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, agreeToPrivacy && styles.checkboxChecked]}>
                {agreeToPrivacy && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.linkText} onPress={handlePrivacyPress}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.disabledButton]} 
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
          
          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')} 
            activeOpacity={0.8}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 100,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 10,
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
  logo: {
    width: 120,
    height: 120,
    backgroundColor: 'transparent',
    borderRadius: 8,
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
  versionText: {
    fontSize: 8,
    color: "#000000",
    fontWeight: "800",
    textAlign: 'center',
  },
  fixedBrandingContainer: {
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 20,
  },
  centerLogo: {
    width: 200,
    height: 200,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginBottom: 2,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e162a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeText: {
    fontSize: 18,
    color: '#1e162a',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9e8ea',
    marginBottom: 10,
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
  termsContainer: {
    marginBottom: 8,
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 0,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#1e162a',
    borderColor: '#1e162a',
  },
  termsText: {
    fontSize: 14,
    color: '#1e162a',
    lineHeight: 20,
    flex: 1,
  },
  linkText: {
    fontSize: 14,
    color: '#1e162a',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  signupButton: {
    backgroundColor: '#1e162a',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    shadowColor: '#1e162a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
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
    marginTop: 6,
    marginBottom: 20,
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
  referralMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7ff',
  },
  referralMessageText: {
    fontSize: 14,
    color: '#1e162a',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SignUpScreen;