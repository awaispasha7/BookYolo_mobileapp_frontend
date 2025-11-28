import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthProvider';
import apiClient from '../lib/apiClient';

const PaymentSuccessScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sessionId = route.params?.session_id;
    
    if (!sessionId) {
      setStatus("error");
      setMessage("No session ID provided");
      return;
    }

    // Verify payment and upgrade user
    verifyPayment(sessionId);
  }, [route.params]);

  const verifyPayment = async (sessionId) => {
    try {
      const { data, error } = await apiClient.verifyPayment(sessionId);
      
      if (error) {
        setStatus("error");
        setMessage(`Payment verification failed: ${error}`);
        return;
      }

      if (data) {
        setStatus("success");
        setMessage("Payment successful! Your premium subscription is now active.");
        
        // Refresh user data to get updated plan status
        await refreshUser();
        
        // Navigate to main tabs after successful payment
        setTimeout(() => {
          navigation.navigate('MainTabs');
        }, 2000);
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const handleGoHome = () => {
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.content}>
        {status === "loading" && (
          <>
            <ActivityIndicator size="large" color="#10B981" style={styles.loader} />
            <Text style={styles.title}>Verifying Payment</Text>
            <Text style={styles.subtitle}>Please wait while we confirm your subscription...</Text>
          </>
        )}

        {status === "success" && (
          <>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={32} color="#10B981" />
            </View>
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>{message}</Text>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What's Next?</Text>
              <Text style={styles.infoItem}>• Your premium subscription is now active</Text>
              <Text style={styles.infoItem}>• You have 300 additional scans per year</Text>
              <Text style={styles.infoItem}>• Redirecting to homepage...</Text>
            </View>
          </>
        )}

        {status === "error" && (
          <>
            <View style={styles.errorIcon}>
              <Ionicons name="close" size={32} color="#EF4444" />
            </View>
            <Text style={styles.title}>Payment Error</Text>
            <Text style={styles.subtitle}>{message}</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
                <Text style={styles.primaryButtonText}>Go to Homepage</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
                <Text style={styles.secondaryButtonText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loader: {
    marginBottom: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#D1FAE5',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#FEE2E2',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentSuccessScreen;









