/**
 * SplashScreen.js - Initial Welcome Screen
 * 
 * This is the first screen users see when opening the app.
 * It displays the BookYolo logo and provides navigation options to Login or Sign Up.
 * 
 * Features:
 * - Displays app logo/branding
 * - Navigation buttons to Login and Sign Up screens
 * - Prevents multiple simultaneous navigation attempts
 * - Clean timeout management for smooth transitions
 * 
 * Navigation:
 * - Login button -> LoginScreen
 * - Sign Up button -> SignUpScreen
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import { BOOK1_LOGO } from '../constants/images';
import { useAuth } from '../context/AuthProvider';

const SplashScreen = ({ navigation }) => {
  const { user, initializing } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef(null);
  const hasNavigatedRef = useRef(false); // Track if we've already navigated

  // Auto-navigate to MainTabs if user is authenticated
  useEffect(() => {
    // Only navigate once, and only if not initializing and user exists
    if (!initializing && user && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true; // Mark as navigated
      // User is authenticated, navigate to MainTabs
      // Use replace instead of navigate to prevent going back to splash
      navigation.replace('MainTabs');
    }
    // Remove navigation from dependencies - it's stable in React Navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initializing]);

  // Reset navigation flag when user logs out
  useEffect(() => {
    if (!user) {
      hasNavigatedRef.current = false;
    }
  }, [user]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const handleLogin = () => {
    if (isNavigating) return; // Prevent multiple taps
    
    setIsNavigating(true);
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    // Navigate with a small delay to ensure smooth transition
    navigationTimeoutRef.current = setTimeout(() => {
      navigation.navigate('Login');
      setIsNavigating(false);
    }, 100);
  };

  const handleSignUp = () => {
    if (isNavigating) return; // Prevent multiple taps
    
    setIsNavigating(true);
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    // Navigate with a small delay to ensure smooth transition
    navigationTimeoutRef.current = setTimeout(() => {
      navigation.navigate('SignUp');
      setIsNavigating(false);
    }, 100);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      <View style={styles.logoContainer}>
        {/* BookYolo Logo with Image */}
        <View style={styles.logoPlaceholder}>
          <Image 
            source={BOOK1_LOGO} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Buttons Container */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.loginButton,
            isNavigating && styles.disabledButton
          ]} 
          onPress={handleLogin}
          disabled={isNavigating}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {isNavigating ? 'Loading...' : 'Login'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.signupButton,
            isNavigating && styles.disabledButton
          ]} 
          onPress={handleSignUp}
          disabled={isNavigating}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, styles.signupButtonText]}>
            {isNavigating ? 'Loading...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 180,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  button: {
    width: '80%',
    paddingVertical: 15,
    borderRadius: 30,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    backgroundColor: '#1e162a',
  },
  signupButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#1e162a',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButtonText: {
    color: '#1e162a',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default SplashScreen;