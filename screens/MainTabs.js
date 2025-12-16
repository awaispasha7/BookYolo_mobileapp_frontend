import React, { useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Platform, TouchableOpacity, Dimensions, Text } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// DISABLED: automaticNotificationService disabled to prevent duplicate notifications
// import automaticNotificationService from '../lib/automaticNotificationService';

import ScanScreen from "./ScanScreen";
import CompareScreen from "./CompareScreen";
import HistoryScreen from "./HistoryScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  
  // DISABLED: Automatic notifications completely disabled to prevent duplicates
  useEffect(() => {
    // No automatic notifications will be sent from MainTabs
  }, []);
  
  // Calculate proper bottom padding for Android with safety checks
  const getBottomPadding = () => {
    try {
      const bottomInset = insets?.bottom ?? 0;
      if (Platform.OS === 'ios') {
        return Math.max(bottomInset, 20);
      } else {
        // For Android, add extra padding to avoid system navigation bar
        return Math.max(bottomInset + 10, 20);
      }
    } catch (error) {
      console.error('Error calculating bottom padding:', error);
      return 20; // Fallback value
    }
  };

  return (
    <Tab.Navigator
      initialRouteName="Scan"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#1e162a",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 80 + (insets?.bottom ?? 0) : 65 + (insets?.bottom ?? 0),
          paddingBottom: getBottomPadding(),
          backgroundColor: "#ffffff",
          borderTopColor: "#e9e8ea",
          borderTopWidth: 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarAllowFontScaling: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = "scan-outline";
          if (route.name === "Compare") iconName = "git-compare-outline";
          if (route.name === "History") iconName = "star-outline";
          
          // Use filled icons for active tabs
          if (focused) {
            if (route.name === "Scan") iconName = "scan";
            if (route.name === "Compare") iconName = "git-compare";
            if (route.name === "History") iconName = "star";
          }
          
          return <Ionicons name={iconName} size={focused ? 26 : 24} color={color} />;
        },
        tabBarButton: (props) => {
          const { children, onPress, accessibilityState } = props;
          const isFocused = accessibilityState?.selected;
          
          return (
            <TouchableOpacity
              {...props}
              onPress={onPress}
              activeOpacity={0.7}
              delayPressIn={0}
              delayPressOut={0}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 6,
                backgroundColor: isFocused ? '#f8f9fa' : 'transparent',
                borderRadius: 12,
                marginHorizontal: 4,
                marginVertical: 2,
              }}
            >
              {children}
            </TouchableOpacity>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={({ navigation, route: screenRoute }) => ({
          tabBarLabel: "New Scan",
          tabBarButton: (props) => {
            const { children, onPress, accessibilityState } = props;
            const isFocused = accessibilityState?.selected;
            
            // Custom handler for Scan tab - always trigger reset when pressed
            const handlePress = () => {
              // Always set reset parameter when Scan tab is pressed (whether focused or not)
              const timestamp = Date.now();
              navigation.setParams({ reset: true, timestamp });
              // Navigate to Scan screen with reset parameter
              navigation.navigate('Scan', { reset: true, timestamp });
              // Also call onPress for normal tab navigation behavior
              if (!isFocused) {
                onPress();
              }
            };
            
            return (
              <TouchableOpacity
                {...props}
                onPress={handlePress}
                activeOpacity={0.7}
                delayPressIn={0}
                delayPressOut={0}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 6,
                  backgroundColor: isFocused ? '#f8f9fa' : 'transparent',
                  borderRadius: 12,
                  marginHorizontal: 4,
                  marginVertical: 2,
                }}
              >
                {children}
              </TouchableOpacity>
            );
          },
        })}
      />
      <Tab.Screen 
        name="Compare" 
        component={CompareScreen}
        options={({ navigation, route: screenRoute }) => ({
          tabBarLabel: "New Compare",
          tabBarButton: (props) => {
            const { children, onPress, accessibilityState } = props;
            const isFocused = accessibilityState?.selected;
            
            // Custom handler for Compare tab - always trigger reset when pressed
            const handlePress = () => {
              // Always set reset parameter when Compare tab is pressed (whether focused or not)
              const timestamp = Date.now();
              navigation.setParams({ reset: true, timestamp });
              // Navigate to Compare screen with reset parameter
              navigation.navigate('Compare', { reset: true, timestamp });
              // Also call onPress for normal tab navigation behavior
              if (!isFocused) {
                onPress();
              }
            };
            
            return (
              <TouchableOpacity
                {...props}
                onPress={handlePress}
                activeOpacity={0.7}
                delayPressIn={0}
                delayPressOut={0}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 6,
                  backgroundColor: isFocused ? '#f8f9fa' : 'transparent',
                  borderRadius: 12,
                  marginHorizontal: 4,
                  marginVertical: 2,
                }}
              >
                {children}
              </TouchableOpacity>
            );
          },
        })}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ tabBarLabel: "Scan History" }}
      />
    </Tab.Navigator>
  );
}
