import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { YOLO_LOGO } from '../constants/images';

const { width, height } = Dimensions.get('window');

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

const LoginScreen = ({ navigation }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const passwordInputRef = useRef(null);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    // Clear error while typing - validation happens on blur
    if (emailError) {
      setEmailError('');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        Alert.alert('Login Failed', error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Navigate to MainTabs on successful login
        // Add a small delay to ensure state is updated
        setTimeout(() => {
          try {
            navigation.navigate('MainTabs');
          } catch (navError) {
            console.error('Navigation error:', navError);
            Alert.alert('Error', 'Navigation failed. Please try again.');
          }
        }, 100);
      } else {
        Alert.alert('Login Failed', 'No user data received');
        setLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
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

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>

            {/* Email Input */}
            <View style={[styles.inputContainer, styles.firstInputContainer]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={emailFocused ? '#1e162a' : emailError ? '#ff4444' : '#999'}
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
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                autoCorrect={false}
                autoComplete="email"
                onFocus={() => {
                  setEmailFocused(true);
                  setEmailError('');
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
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={passwordFocused ? '#1e162a' : '#999'}
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordInputRef}
                style={[styles.input, passwordFocused && styles.inputFocused]}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                autoCorrect={false}
                autoComplete="current-password"
                spellCheck={false}
                textContentType="password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.8}
            >
              <Text style={styles.forgotPasswordButtonText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign Up */}
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
              activeOpacity={0.8}
              style={styles.signUpButton}
            >
              <Text style={styles.signUpButtonText}>
                Don&apos;t have an account? Sign up
              </Text>
            </TouchableOpacity>
          </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 0,
  },
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
  logo: {
    width: 40,
    height: 40,
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
  header: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
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
    marginBottom: 16,
    paddingHorizontal: 15,
  },
  firstInputContainer: {
    marginTop: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1e162a',
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
  loginButton: {
    backgroundColor: '#1e162a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  forgotPasswordButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e9e8ea',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  forgotPasswordButtonText: {
    color: '#1e162a',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e9e8ea',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  signUpButtonText: {
    color: '#1e162a',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
