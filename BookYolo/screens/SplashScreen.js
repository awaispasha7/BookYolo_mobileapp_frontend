// screens/SplashScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence,
  withTiming,
  Easing,
  withSpring
} from 'react-native-reanimated';
import { BOOK1_LOGO } from '../constants/images';

const SplashScreen = ({ navigation }) => {
  const scale = useSharedValue(1);
  const buttonOpacity = useSharedValue(1); // Start visible instead of 0
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeoutRef = useRef(null);

  // Animation config
  useEffect(() => {
    // Create pulsing animation for the logo
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.ease }),
        withTiming(1, { duration: 1000, easing: Easing.ease })
      ),
      -1, // infinite repeats
      true
    );


    // Buttons are immediately visible - no delay needed
    buttonOpacity.value = withTiming(1, { duration: 500, easing: Easing.ease });

    // Cleanup timeout on unmount
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });


  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
    };
  });

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
      
      <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
        {/* BookYolo Logo with Image */}
        <View style={styles.logoPlaceholder}>
          <Image 
            source={BOOK1_LOGO} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        
        {/* Version Number */}
        <Text style={styles.versionText}>Version 17.7.9.9b</Text>
      </Animated.View>

      {/* Buttons Container */}
      <Animated.View style={[styles.buttonContainer, animatedButtonStyle]}>
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
      </Animated.View>
      
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
  versionText: {
    fontSize: 16,
    color: '#070707',
    marginTop: 10,
    fontWeight: '500',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
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