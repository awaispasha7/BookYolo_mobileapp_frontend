import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import octopusEmailService from '../lib/octopusEmailService';

const OctopusTestButton = ({ email = 'test@example.com', fullName = 'Test User' }) => {
  const [loading, setLoading] = useState(false);

  const handleTestOctopusIntegration = async () => {
    setLoading(true);
    
    try {
      // Test adding a user to Octopus contacts
      const result = await octopusEmailService.addUserToContacts(email, fullName, 'test-user-id');
      
      if (result.success) {
        Alert.alert(
          'Success!', 
          'User successfully added to Octopus contacts with "New User" tag.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error', 
          `Failed to add user to Octopus contacts: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error', 
        `Unexpected error: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestUserExists = async () => {
    setLoading(true);
    
    try {
      const result = await octopusEmailService.checkUserExists(email);
      
      if (result.success) {
        Alert.alert(
          'User Check Result', 
          `User ${result.exists ? 'exists' : 'does not exist'} in Octopus contacts.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error', 
          `Failed to check user existence: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error', 
        `Unexpected error: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    setLoading(true);
    
    try {
      const result = await octopusEmailService.sendTestEmail(email);
      
      if (result.success) {
        Alert.alert(
          'Success!', 
          'Test email sent successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error', 
          `Failed to send test email: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error', 
        `Unexpected error: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Octopus Email Integration Test</Text>
      <Text style={styles.subtitle}>Test the Octopus email service integration</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]} 
        onPress={handleTestOctopusIntegration}
        disabled={loading}
      >
        <Ionicons name="person-add" size={20} color="white" />
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Add User to Contacts'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]} 
        onPress={handleTestUserExists}
        disabled={loading}
      >
        <Ionicons name="search" size={20} color="#1e162a" />
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Check User Exists
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.tertiaryButton]} 
        onPress={handleSendTestEmail}
        disabled={loading}
      >
        <Ionicons name="mail" size={20} color="#1e162a" />
        <Text style={[styles.buttonText, styles.tertiaryButtonText]}>
          Send Test Email
        </Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Email: {email}{'\n'}
        Name: {fullName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 10,
    borderWidth: 1,
    borderColor: '#e9e8ea',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e162a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#1e162a',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e162a',
  },
  tertiaryButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#1e162a',
  },
  tertiaryButtonText: {
    color: '#1e162a',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
});

export default OctopusTestButton;


