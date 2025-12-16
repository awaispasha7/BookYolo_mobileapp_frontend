// screens/ContactSocialScreen.js (Updated to match web app design)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
      {/* Header with Back Button */}
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
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support Content */}
        <View style={styles.contentCard}>
          {/* Icon Section */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail" size={28} color="#1F2937" />
            </View>
          </View>
          
          {/* Title Section */}
          <Text style={styles.title}>Contact Support</Text>
          <Text style={styles.subtitle}>Get help from our support team</Text>
          
          {/* Email Section */}
          <View style={styles.emailBox}>
            <Text style={styles.emailLabel}>Email us at:</Text>
            <View style={styles.emailRow}>
              <Text style={styles.emailAddress} numberOfLines={1} ellipsizeMode="tail">help@bookyolo.com</Text>
              <TouchableOpacity 
                style={styles.copyButtonContainer}
                onPress={copyEmailToClipboard}
                activeOpacity={0.7}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.gmailButton}
            onPress={openGmail}
            activeOpacity={0.8}
          >
            <Ionicons name="mail" size={18} color="#ffffff" style={styles.gmailButtonIcon} />
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
            activeOpacity={0.7}
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
    marginTop: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
    marginTop: 50,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '400',
    lineHeight: 22,
  },
  emailBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginBottom: 10,
  },
  emailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  emailAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    minWidth: 0,
  },
  copyButtonContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  gmailButton: {
    width: '100%',
    backgroundColor: '#1F2937',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  gmailButtonIcon: {
    marginRight: 8,
  },
  gmailButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  closeButton: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default ContactSocialScreen;
