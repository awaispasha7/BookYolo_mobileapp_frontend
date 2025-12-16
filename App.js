import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationProvider, useNotifications } from './context/NotificationProvider';
import { AuthProvider } from './context/AuthProvider';
import deepLinkHandler from './lib/deepLinkHandler';
import notificationService from './lib/notificationService';
import { preloadImages } from './lib/imagePreloader';
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import SignUpScreen from "./screens/SignUpScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import MainTabs from "./screens/MainTabs";
import ScanResultScreen from "./screens/ScanResultScreen";
import ComparisonResultScreen from "./screens/ComparisonResultScreen";
import ContactSocialScreen from "./screens/ContactSocialScreen";
import PrivacyTermsScreen from "./screens/PrivacyTermsScreen";
import ReferralScreen from "./screens/ReferralScreen";
import SettingsScreen from "./screens/SettingsScreen";
import UpgradeScreen from "./screens/UpgradeScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import NotificationSettingsScreen from "./screens/NotificationSettingsScreen";
import AccountScreen from "./screens/AccountScreen";
import PlanStatusScreen from "./screens/PlanStatusScreen";
import PaymentSuccessScreen from "./screens/PaymentSuccessScreen";
import PaymentCancelScreen from "./screens/PaymentCancelScreen";

const Stack = createStackNavigator();

// Simple Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('medium')) {
      console.error('🔴 MEDIUM ERROR IN ERROR BOUNDARY!');
      console.error('Full error:', error);
      console.error('Stack:', error?.stack);
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const errorMessage = error?.message || String(error);
    console.error('=== ERROR BOUNDARY CAUGHT ERROR ===');
    console.error('Error:', errorMessage);
    console.error('Error Info:', errorInfo);
    if (errorMessage.includes('medium')) {
      console.error('🔴 MEDIUM ERROR DETECTED IN ERROR BOUNDARY!');
      console.error('Component Stack:', errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#000' }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity 
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#1e162a', padding: 12, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const navigationRef = useRef();

  useEffect(() => {
    try {
      // Preload images at app startup to prevent loading delays
      preloadImages();
      
      // Initialize deep link handler
      deepLinkHandler.init();
      
      // Set up callback for signup with referral navigation
      deepLinkHandler.setSignupWithReferralCallback((referralCode) => {
        if (navigationRef.current) {
          navigationRef.current.navigate('SignUp', { referralCode });
        }
      });
      
      // Set up callback for scan with URL from share extension
      deepLinkHandler.setScanWithUrlCallback((url) => {
        if (navigationRef.current) {
          // Navigate to MainTabs first if not already there, then to Scan with URL
          navigationRef.current.navigate('MainTabs', {
            screen: 'Scan',
            params: { shareUrl: url }
          });
        }
      });
      
      // Email verification removed - users go directly to login after signup

      // Password reset now handled via web app

      // Set up notification service with navigation
      notificationService.setNavigationRef(navigationRef);
    } catch (error) {
      console.error('Error in AppContent useEffect:', error);
      if (String(error).includes('medium')) {
        console.error('🔴 MEDIUM ERROR IN AppContent!');
      }
    }

    return () => {
      try {
        deepLinkHandler.cleanup();
      } catch (error) {
        console.error('Error cleaning up:', error);
      }
    };
  }, []);

  return (
    <Stack.Navigator 
      ref={navigationRef}
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#F3F4F6' }
      }}
      initialRouteName="Splash"
    >
      {/* Always include MainTabs for frontend testing */}
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ gestureEnabled: false }} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ComparisonResult" component={ComparisonResultScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ContactSocial" component={ContactSocialScreen} />
      <Stack.Screen name="PrivacyTerms" component={PrivacyTermsScreen} />
      <Stack.Screen 
        name="Referral" 
        component={ReferralScreen}
        options={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#F3F4F6' }
        }} 
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Upgrade" component={UpgradeScreen} />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Account" 
        component={AccountScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="PlanStatus" 
        component={PlanStatusScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="PaymentSuccess" 
        component={PaymentSuccessScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="PaymentCancel" 
        component={PaymentCancelScreen}
        options={{ headerShown: false }} 
      />
      
      {/* Auth screens */}
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen}
        options={{ 
          gestureEnabled: false,
          animationTypeForReplace: 'push'
        }} 
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }} 
      />
      <Stack.Screen 
        name="SignUp" 
        component={SignUpScreen}
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }} 
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ 
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }} 
      />
    </Stack.Navigator>
  );
}

export default function App() {
  // Global error handler with better logging
  useEffect(() => {
    const errorHandler = (error, isFatal) => {
      const errorMessage = error?.message || String(error);
      console.error('=== GLOBAL ERROR ===');
      console.error('Message:', errorMessage);
      console.error('Type:', typeof error);
      console.error('Fatal:', isFatal);
      
      if (errorMessage.includes('medium')) {
        console.error('🔴 MEDIUM ERROR DETECTED!');
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        console.error('Stack:', error?.stack);
        console.error('Name:', error?.name);
      }
      
      // Log the component stack if available
      if (error?.componentStack) {
        console.error('Component Stack:', error.componentStack);
      }
    };

    // Set up global error handler
    if (global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        errorHandler(error, isFatal);
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Also catch unhandled promise rejections
    const rejectionHandler = (reason, promise) => {
      console.error('=== UNHANDLED PROMISE REJECTION ===');
      console.error('Reason:', reason);
      if (String(reason).includes('medium')) {
        console.error('🔴 MEDIUM ERROR IN PROMISE REJECTION!');
      }
    };
    
    if (global.addEventListener) {
      global.addEventListener('unhandledrejection', rejectionHandler);
    }

    return () => {
      if (global.removeEventListener) {
        global.removeEventListener('unhandledrejection', rejectionHandler);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          dark: false,
          colors: {
            primary: '#F3F4F6',
            background: '#F3F4F6',
            card: '#F3F4F6',
            text: '#000000',
            border: '#F3F4F6',
            notification: '#F3F4F6',
          },
          fonts: {
            regular: {
              fontFamily: 'System',
              fontWeight: '400',
            },
            medium: {
              fontFamily: 'System',
              fontWeight: '500',
            },
            bold: {
              fontFamily: 'System',
              fontWeight: '700',
            },
            heavy: {
              fontFamily: 'System',
              fontWeight: '800',
            },
          },
        }}
      >
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
