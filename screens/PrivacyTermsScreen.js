// screens/PrivacyTermsScreen.js (Updated with navigation)
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BOOK1_LOGO } from '../constants/images';

// Inline iPhone Back Button Component
function BackButton({ onPress, style }) {
  return (
    <TouchableOpacity
      style={[
        {
          marginTop: 8,
          marginBottom: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="chevron-back" 
        size={24} 
        color="#1e162a" 
        style={{ margin: 0, padding: 0 }}
      />
    </TouchableOpacity>
  );
}

const PrivacyTermsScreen = ({ navigation }) => {

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerGradient}>
        {/* Header with Back Button, Logo and Version */}
        <View style={styles.topHeader}>
          <View style={styles.backButtonContainer}>
            <BackButton 
              onPress={() => navigation.goBack()}
            />
          </View>
          
          <View style={styles.logoContainer}>
            <Image 
              source={BOOK1_LOGO} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          {/* <View style={styles.versionContainer}>
            <Text style={styles.versionText}>MVP 17.7.9.9b</Text>
          </View> */}
        </View>
        
      </View>
      {/* Privacy Policy Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Privacy Policy</Text>
        </View>
        <Text style={styles.sectionDescription}>
          We are committed to protecting your privacy and ensuring transparency in how we handle your information.
        </Text>
        
        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Information We Collect</Text>
          <Text style={styles.cardContent}>
            We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>How We Use Your Information</Text>
          <Text style={styles.cardContent}>
            We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Data Security</Text>
          <Text style={styles.cardContent}>
            We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
          </Text>
        </View>
      </View>

      {/* Terms of Service Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Terms of Service</Text>
        </View>
        <Text style={styles.sectionDescription}>
          By using BookYolo, you agree to these terms and conditions that govern your use of our service.
        </Text>
        
        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Acceptance of Terms</Text>
          <Text style={styles.cardContent}>
            By accessing and using BookYolo, you accept and agree to be bound by the terms and provision of this agreement.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Use License</Text>
          <Text style={styles.cardContent}>
            Permission is granted to temporarily use BookYolo for personal, non-commercial transitory viewing only.
          </Text>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Disclaimer</Text>
          <Text style={styles.cardContent}>
            The information provided by BookYolo is for general informational purposes only and should not be considered as professional advice.
          </Text>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Questions About Privacy?</Text>
          <Text style={styles.contactText}>
            If you have any questions about our Privacy Policy or Terms of Service, please contact us at:
          </Text>
          <Text style={styles.contactEmail}>privacy@bookyolo.com</Text>
          <Text style={styles.contactText}>
            We're committed to addressing your concerns promptly and transparently.
          </Text>
        </View>
      </View>

      {/* Last Updated */}
      <View style={styles.updateSection}>
        <Text style={styles.updateText}>
          Last updated: December 2024
        </Text>
        <Text style={styles.updateText}>
          Version: 17.7.9.9b
        </Text>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 60,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 10,
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
    marginTop: 22,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    marginTop: 65,
  },
  logo: {
    width: 45,
    height: 45,
  },
  versionContainer: {
    position: 'absolute',
    right: 15,
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
  headerContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#070707',
    marginBottom: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#070707',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  section: {
    padding: 20,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#070707',
  },
  sectionDescription: {
    fontSize: 16,
    color: '#070707',
    lineHeight: 24,
    marginBottom: 25,
    textAlign: 'center',
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#070707',
    flex: 1,
  },
  cardContent: {
    fontSize: 15,
    color: '#070707',
    lineHeight: 22,
  },
  contactSection: {
    padding: 20,
    marginTop: 20,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#070707',
    marginBottom: 15,
    textAlign: 'center',

  },
  contactText: {
    fontSize: 15,
    color: '#070707',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  contactEmail: {
    fontSize: 16,
    color: '#1e162a',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  updateSection: {
    padding: 20,
    alignItems: 'center',
  },
  updateText: {
    fontSize: 14,
    color: '#070707',
    marginBottom: 5,
  },
  backButton: {
    marginTop: 5,
  },
});

export default PrivacyTermsScreen;