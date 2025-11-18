// screens/ContactSocialScreen.js (Updated to match web app design)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Clipboard,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const ContactSocialScreen = ({ navigation }) => {
  const copyEmailToClipboard = async () => {
    Clipboard.setString('help@bookyolo.com');
    Alert.alert('Success', 'Email address copied to clipboard!');
  };

  const openGmail = () => {
    const url = 'https://mail.google.com/mail/?view=cm&fs=1&to=help@bookyolo.com&su=BookYolo Support Request&body=Hi BookYolo Team,%0D%0A%0D%0AI need help with:%0D%0A%0D%0A[Please describe your question or issue here]%0D%0A%0D%0AThank you!';
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Gmail'));
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button, Logo and Version - Matching UpgradeScreen */}
      <View style={styles.header}>
        <View style={styles.backButtonContainer}>
          <BackButton 
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Settings');
              }
            }}
          />
        </View>
        
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/book1.jpg')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>MVP 17.7.9.9b</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support Content - Matching Web App */}
        <View style={styles.contentCard}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={24} color="#1F2937" />
            </View>
          </View>
          
          <Text style={styles.title}>Contact Support</Text>
          <Text style={styles.subtitle}>Get help from our support team</Text>
          
          {/* Email Section - Matching Web App */}
          <View style={styles.emailBox}>
            <Text style={styles.emailLabel}>Email us at:</Text>
            <View style={styles.emailRow}>
              <Text style={styles.emailAddress}>help@bookyolo.com</Text>
              <TouchableOpacity onPress={copyEmailToClipboard}>
                <Text style={styles.copyButton}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action Buttons - Matching Web App */}
          <TouchableOpacity
            style={styles.gmailButton}
            onPress={openGmail}
          >
            <Text style={styles.gmailButtonText}>Open Gmail</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Settings');
              }
            }}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 60,
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
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  logo: {
    width: 45,
    height: 45,
  },
  versionContainer: {
    position: 'absolute',
    right: 20,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emailBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  emailLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  copyButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  gmailButton: {
    width: '100%',
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gmailButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    width: '100%',
    backgroundColor: '#D1D5DB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ContactSocialScreen;
