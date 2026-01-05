// screens/SplashScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import { BOOK1_LOGO } from '../constants/images';

const SplashScreen = ({ navigation }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef(null);

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