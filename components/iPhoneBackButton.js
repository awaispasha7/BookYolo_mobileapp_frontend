import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const iPhoneBackButton = ({ onPress, title = "Back", style, textStyle }) => {
  return (
    <TouchableOpacity 
      style={[styles.backButton, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.backButtonContent}>
        <Ionicons 
          name="chevron-back" 
          size={20} 
          color="#007AFF" 
          style={styles.backIcon}
        />
        <Text style={[styles.backText, textStyle]}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    marginRight: 4,
  },
  backText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
});

export default iPhoneBackButton;