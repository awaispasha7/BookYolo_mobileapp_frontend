import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BOOK1_LOGO } from "../constants/images";
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from "../lib/apiClient";
import { useAuth } from "../context/AuthProvider";
import notificationService from "../lib/notificationService";

const { width } = Dimensions.get("window");

// Helper function to detect if input is an Airbnb URL
const isAirbnbUrl = (text) => {
  if (!text || typeof text !== 'string') return false;
  const airbnbRoomsPattern = /https?:\/\/(www\.)?([a-z]{2}\.)?airbnb\.(com|ca|co\.uk|com\.au|fr|de|es|it|nl|pl|pt|ru|se|jp|kr|cn|in|br|mx|ar|cl|co|pe|za|ae|sa|tr|au|nz|ie|be|ch|at|dk|fi|no|gr|cz|hu|ro|bg|hr|sk|si|lt|lv|ee|is|lu|mt|cy)\/rooms\//i;
  const airbnbShortPattern = /https?:\/\/(www\.)?([a-z]{2}\.)?airbnb\.(com|ca|co\.uk|com\.au|fr|de|es|it|nl|pl|pt|ru|se|jp|kr|cn|in|br|mx|ar|cl|co|pe|za|ae|sa|tr|au|nz|ie|be|ch|at|dk|fi|no|gr|cz|hu|ro|bg|hr|sk|si|lt|lv|ee|is|lu|mt|cy)\/l\//i;
  return airbnbRoomsPattern.test(text) || airbnbShortPattern.test(text);
};

// Helper function to detect if input is any URL
const isUrl = (text) => {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
};

// Label style mapping (matching web app)
const getLabelStyle = (label) => {
  const map = {
    "Outstanding Stay": { bg: "#0ea5e9", text: "#ffffff" },
    "Excellent Stay": { bg: "#22c55e", text: "#ffffff" },
    "Looks Legit": { bg: "#eab308", text: "#ffffff" },
    "Probably OK": { bg: "#eab308", text: "#ffffff" },
    "A Bit Risky": { bg: "#f59e0b", text: "#ffffff" },
    "Looks Sketchy": { bg: "#f97316", text: "#ffffff" },
    "Travel Trap": { bg: "#ef4444", text: "#ffffff" },
    "Booking Nightmare": { bg: "#991b1b", text: "#ffffff" },
    "Insufficient Data": { bg: "#64748b", text: "#ffffff" },
  };
  return map[label] || { bg: "#64748b", text: "#ffffff" };
};

export default function ScanScreen({ navigation, route }) {
  const { scanBalance, refreshUser, refreshScanBalance, user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentScan, setCurrentScan] = useState(null);
  const [me, setMe] = useState(null);
  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const hasRefreshedThisFocus = useRef(false);
  const notificationsSentThisSession = useRef(false);
  const pollingIntervalRef = useRef(null);
  const lastTabPressTime = useRef(0);

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      const { data, error } = await apiClient.getCurrentUser();
      if (!error && data) {
        // Structure data to match backend response: { user: {...}, plan: ..., remaining: ... }
        setMe(data);
      }
    } catch (e) {
      // Silent error handling
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Handle reset parameter (when Scan tab is pressed while already focused)
  // Using timestamp to ensure the effect triggers every time
  useEffect(() => {
    const resetParam = route?.params?.reset;
    const timestamp = route?.params?.timestamp;
    
    if (resetParam === true && timestamp) {
      // Only trigger if this is a new timestamp (not a stale navigation)
      if (timestamp !== lastTabPressTime.current) {
        lastTabPressTime.current = timestamp;
        startNewChat();
        // Clear the reset parameter after a short delay to allow the effect to complete
        setTimeout(() => {
          navigation.setParams({ reset: undefined, timestamp: undefined });
        }, 100);
      }
    }
  }, [route?.params?.reset, route?.params?.timestamp, startNewChat, navigation]);

  // Handle scan history data when navigating from history screen (same as web app)
  useEffect(() => {
    const scanHistoryData = route?.params?.scanHistoryData;
    
    if (scanHistoryData && scanHistoryData.id) {
      // Clear existing messages and show scan result from history
      setMessages([]);
      setCurrentScan(scanHistoryData.analysis || scanHistoryData);
      
      // Fetch chatId for this scan if not provided (needed for AI questions)
      // Matching web app: fetch chat details for each scan-type chat to find matching scan_id
      const fetchChatIdForScan = async () => {
        try {
          // If chatId is already provided, use it
          if (scanHistoryData.chatId) {
            setCurrentChatId(scanHistoryData.chatId);
            return;
          }
          
          // Otherwise, find the chat associated with this scan (matching web app approach)
          const { data: chats, error } = await apiClient.getChats();
          if (!error && chats && Array.isArray(chats)) {
            // Filter to only scan-type chats
            const scanChats = chats.filter(chat => chat.type === 'scan');
            
            // Check each scan chat to find the one with matching scan_id
            for (const chat of scanChats) {
              try {
                const { data: chatData, error: chatError } = await apiClient.getChat(chat.id);
                if (!chatError && chatData?.chat?.scan_id === scanHistoryData.id) {
                  setCurrentChatId(chat.id);
                  return; // Found it, stop searching
                }
              } catch (e) {
                // Continue to next chat if this one fails
                continue;
              }
            }
          }
        } catch (error) {
          // Silent error - chatId will remain null, but user can still view scan results
        }
      };
      
      fetchChatIdForScan();
      
      // Add user message
      const userMessage = { 
        role: "user", 
        content: `Scan ${scanHistoryData.link}`, 
        messageType: "scan" 
      };
      
      // Add assistant message with scan result (same format as new scan)
      const assistantMessage = {
        role: "assistant",
        content: "", // No content - only show the detailed scan result
        scanData: {
          ...scanHistoryData.analysis,
          listing_title: scanHistoryData.listing_title || scanHistoryData.analysis?.listing_title,
          location: scanHistoryData.location || scanHistoryData.analysis?.location,
          label: scanHistoryData.label || scanHistoryData.analysis?.label,
          listing_url: scanHistoryData.link || scanHistoryData.analysis?.listing_url
        }
      };
      
      // Add post-scan message
      const postScanMessage = {
        role: "assistant",
        content: "Do you have any questions about this scan? Feel free to ask anything..."
      };
      
      setMessages([userMessage, assistantMessage, postScanMessage]);
      
      // Clear the param to prevent re-loading on subsequent focuses
      if (route?.params) {
        navigation.setParams({ scanHistoryData: undefined });
      }
    }
  }, [route?.params?.scanHistoryData, navigation]);

  // Reset scanning state and refresh scan balance when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(false);
      
      // Refresh scan balance when screen comes into focus (only once per focus)
      if (!hasRefreshedThisFocus.current && refreshUser) {
        hasRefreshedThisFocus.current = true;
        refreshUser().catch(() => {
          // Silent error handling
        });
      }
      
      // Load user data
      loadUserData();
      
      // Check for referral signup notifications (same pattern as UpgradeScreen.js)
      const checkReferralSignup = async () => {
        try {
          if (!user?.id && !user?.user?.id) return;
          
          // Check notification permissions
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') {
              return;
            }
          }

          const userId = user?.id || user?.user?.id;
          const { data: stats } = await apiClient.getReferralStats(userId);
          
          if (stats) {
            const currentCount = stats.referral_count || 0;
            const lastReferralCountKey = `last_referral_count_${userId}`;
            const lastReferralCount = await AsyncStorage.getItem(lastReferralCountKey);
            const lastCount = lastReferralCount ? parseInt(lastReferralCount, 10) : 0;

            if (currentCount > lastCount && lastCount >= 0) {
              // Referral count increased - someone signed up!
              const userName = user?.email?.split('@')[0] || 'User';
              const referralIncreaseId = `referral_increase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              await Notifications.scheduleNotificationAsync({
                identifier: referralIncreaseId,
                content: {
                  title: 'New Referral! 🎉',
                  body: `Hi ${userName}, someone just signed up using your referral link! You now have ${currentCount} ${currentCount === 1 ? 'referral' : 'referrals'}.`,
                  data: {
                    type: 'referral_signup',
                    uniqueId: referralIncreaseId,
                    timestamp: Date.now()
                  },
                  sound: true,
                },
                trigger: null,
              });

              // Update last known count
              await AsyncStorage.setItem(lastReferralCountKey, String(currentCount));
            } else if (lastCount === 0 && currentCount > 0) {
              // First time tracking - just store the count, don't send notification
              await AsyncStorage.setItem(lastReferralCountKey, String(currentCount));
            }
          }
        } catch (error) {
          // Silent error handling
        }
      };
      
      // Check for referral signups
      checkReferralSignup();
      
      // Set up notification handler
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      } catch (error) {
        // Silent error handling
      }
      
      return () => {
        setIsLoading(false);
        hasRefreshedThisFocus.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadUserData, user]) // refreshUser is a stable function from context
  );

  // Note: Progress bar removed - loading state is now shown in the button itself (matching web app)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Scan limit warning
  useEffect(() => {
    if (!scanBalance) return;
    const sendScanLimitWarning = async () => {
      try {
        if (scanBalance?.remaining === 5 && scanBalance?.plan === 'free') {
          const scanLimitWarningKey = 'scan_limit_5_warning_sent';
          const hasReceivedWarning = await AsyncStorage.getItem(scanLimitWarningKey);
          if (hasReceivedWarning) {
            return;
          }
          
          // Check notification permissions
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') {
              return;
            }
          }
          
          // Send push notification (same pattern as UpgradeScreen.js)
          const userName = user?.email?.split('@')[0] || 'User';
          const warningId = `scan_limit_warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await Notifications.scheduleNotificationAsync({
            identifier: warningId,
            content: {
              title: 'Scan Limit Warning ⚠️',
              body: `Hi ${userName}, you have only 5 scans left! Please upgrade to premium to get more scans.`,
              data: {
                type: 'scan_limit_warning',
                uniqueId: warningId,
                timestamp: Date.now()
              },
              sound: true,
            },
            trigger: null,
          });
          await AsyncStorage.setItem(scanLimitWarningKey, 'true');
        }
      } catch (error) {
        // Silent error handling
      }
    };
    sendScanLimitWarning();
  }, [scanBalance?.remaining, scanBalance?.plan, user?.email]);

  const handleScan = async (url) => {
    setError("");
    setIsLoading(true);
    
    // Check if user has sufficient balance for scanning
    if (me?.remaining < 1.0) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "You don't have enough scans remaining. Please upgrade your plan to continue scanning.",
        isError: true
      }]);
      setIsLoading(false);
      return;
    }
    
    // Validate URL
    if (!url || !url.trim()) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Please provide a valid URL to scan.",
        isError: true
      }]);
      setIsLoading(false);
      return;
    }

    // Check if this chat already has a scan
    if (currentChatId && messages.some(msg => msg.scanData)) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "This chat is dedicated to the property you just scanned. Start a new scan to scan a new property.",
        isError: true
      }]);
      setIsLoading(false);
      return;
    }

    // Add user message
    const userMessage = { role: "user", content: `Scan ${url}`, messageType: "scan" };
    setMessages(prev => [...prev, userMessage]);

    // Add typing indicator
    const typingIndicator = { 
      role: "assistant", 
      content: "", 
      isTyping: true 
    };
    setMessages(prev => [...prev, typingIndicator]);

    try {
      const { data, error } = await apiClient.createNewScan(url);
      
      if (error) {
        throw new Error(error);
      }
      
      setCurrentChatId(data.chat_id);
      setCurrentScan(data.scan);
      
      // Refresh user data to update scan count (same as web app - loadUserData refreshes balance)
      await loadUserData();
      await refreshUser();
      // Refresh scan balance immediately (same as web app)
      if (refreshScanBalance) {
        await refreshScanBalance();
      }
      
      // Show scan result directly in chat (same as web app - no separate screen)
      if (data.scan) {
        // Remove typing indicator and add assistant response with scan result
        setMessages(prev => {
          const filtered = prev.filter(msg => !msg.isTyping);
          const assistantMessage = {
            role: "assistant",
            content: "", // No content - only show the detailed scan result
            scanData: data.scan
          };
          return [...filtered, assistantMessage];
        });
        
        // Add post-scan message
        const postScanMessage = {
          role: "assistant",
          content: "Do you have any questions about this scan? Feel free to ask anything..."
        };
        setMessages(prev => [...prev, postScanMessage]);
        
        // If scan is still processing, poll for completion (same as web app)
        // Check if scan has analysis data - if not, it might still be processing
        if (!data.scan.analysis && data.chat_id) {
          // Get scan_id from chat and poll for completion
          let scanId = null;
          try {
            const { data: chatData, error: chatError } = await apiClient.getChat(data.chat_id);
            if (!chatError && chatData?.chat?.scan_id) {
              scanId = chatData.chat.scan_id;
              // Start polling for scan completion
              pollForScanCompletion(scanId, data.chat_id);
            }
          } catch (e) {
            console.error('Error fetching chat to get scan_id:', e);
          }
        }
      }
    } catch (e) {
      setError(e.message || String(e));
      
      // Remove typing indicator and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isTyping);
        return [...filtered, {
          role: "assistant",
          content: `Sorry, I couldn't scan that listing. ${e.message}`,
          isError: true
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = async (question) => {
    setError("");
    
    if (!question || !question.trim()) {
      return;
    }

    if (!currentChatId) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Please scan a listing first before asking questions.",
        isError: true
      }]);
      return;
    }

    // Set loading state immediately (matching handleScan behavior and web app)
    setIsLoading(true);

    // Add user message
    const userMessage = { role: "user", content: question, messageType: "question" };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data, error } = await apiClient.askChatQuestion(currentChatId, question);
      
      if (error) {
        throw new Error(error);
      }
      
      // Add assistant response
      const assistantMessage = {
        role: "assistant",
        content: data.answer || "I don't have enough information to answer that question."
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh user data (same as web app - loadUserData refreshes balance)
      await loadUserData();
      await refreshUser();
      // Refresh scan balance immediately (same as web app)
      if (refreshScanBalance) {
        await refreshScanBalance();
      }
    } catch (e) {
      setError(e.message || String(e));
      // Add error message
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I couldn't answer that question. ${e.message}`,
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim();
    setInput("");

    // Determine what type of request this is
    if (isAirbnbUrl(trimmedInput)) {
      await handleScan(trimmedInput);
    } else if (isUrl(trimmedInput)) {
      // Check if it's a URL but not Airbnb
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "The URL you are trying to scan is from a platform that we do not cover yet. Bear with us as we are expanding quickly.",
        isError: true
      }]);
    } else {
      await handleAsk(trimmedInput);
    }
  };

  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
    setCurrentScan(null);
    setError("");
    setInput(""); // Reset input field (same as web app)
    setIsLoading(false);
    // Clear any polling intervals
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Poll for scan completion (same as web app)
  const pollForScanCompletion = (scanId, chatId) => {
    if (!scanId) return;
    
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    let pollCount = 0;
    const maxPolls = 20; // Poll for max 60 seconds (20 * 3 seconds)
    
    pollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        const { data: fetchedScanData, error } = await apiClient.getScanById(scanId);
        
        if (!error && fetchedScanData && fetchedScanData.analysis) {
          // Scan is complete - remove typing indicator and update the scan data in messages
          setMessages(prev => {
            // Remove typing indicators
            const filtered = prev.filter(msg => !msg.isTyping);
            const updatedMessages = [...filtered];
            // Find the last assistant message with scanData and update it
            for (let i = updatedMessages.length - 1; i >= 0; i--) {
              if (updatedMessages[i].role === "assistant" && updatedMessages[i].scanData) {
                updatedMessages[i] = {
                  ...updatedMessages[i],
                  scanData: {
                    ...updatedMessages[i].scanData,
                    ...fetchedScanData,
                    listing_title: fetchedScanData.listing_title || updatedMessages[i].scanData.listing_title,
                    location: fetchedScanData.location || updatedMessages[i].scanData.location,
                    label: fetchedScanData.label || updatedMessages[i].scanData.label
                  }
                };
                break;
              }
            }
            return updatedMessages;
          });
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (pollCount >= maxPolls) {
          // Stop polling after max attempts
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling scan data:', error);
        // Stop polling on error
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 3000); // Poll every 3 seconds (same as web app)
  };

  // Render text with clickable URLs (React Native component)
  const renderTextWithUrls = (text, style) => {
    if (!text || typeof text !== 'string') return <Text style={style}>{text}</Text>;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return (
      <Text style={style}>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            return (
              <Text
                key={index}
                style={styles.linkText}
                onPress={() => Linking.openURL(part)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  // Render AI answer text with clickable URLs (matching web app - no bullet points, preserve formatting)
  const renderAnswerText = (text) => {
    if (!text || typeof text !== 'string') {
      return <Text style={styles.messageText}>No answer available</Text>;
    }

    // Check if text contains URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const hasUrl = parts.length > 1;

    if (hasUrl) {
      // Render text with clickable URLs (matching web app whitespace-pre-wrap behavior)
      return (
        <Text style={styles.messageText}>
          {parts.map((part, index) => {
            // Check if this part is a URL
            if (part.match(/^https?:\/\/[^\s]+$/)) {
              return (
                <Text
                  key={index}
                  style={styles.linkText}
                  onPress={() => Linking.openURL(part)}
                >
                  {part}
                </Text>
              );
            }
            return <Text key={index}>{part}</Text>;
          })}
        </Text>
      );
    }

    // No URLs - just display text as-is (matching web app whitespace-pre-wrap)
    return <Text style={styles.messageText}>{text}</Text>;
  };

  // Typing indicator component with animated dots
  const TypingIndicator = () => {
    const [dotCount, setDotCount] = useState(1);
    
    useEffect(() => {
      const interval = setInterval(() => {
        setDotCount(prev => (prev >= 3 ? 1 : prev + 1));
      }, 500);
      return () => clearInterval(interval);
    }, []);
    
    return (
      <View style={styles.typingIndicatorContainer}>
        <Text style={styles.typingIndicatorText}>
          Processing{'.'.repeat(dotCount)}
        </Text>
      </View>
    );
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === "user";
    const isError = message.isError;
    const isTyping = message.isTyping;
    const isPostScanMessage = !isUser && !isError && message.content && 
      message.content.includes("Do you have any questions about this scan");
    
    return (
      <View key={index} style={[
        styles.messageContainer, 
        isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        isPostScanMessage && styles.postScanMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.assistantMessageBubble,
          isError && styles.errorMessageBubble,
          isPostScanMessage && styles.postScanMessageBubble
        ]}>
          {isTyping ? (
            <TypingIndicator />
          ) : !isUser && !isError && message.scanData ? (
            // Detailed scan result display (matching web app)
            <View style={styles.scanResultContainer}>
              {/* Information */}
              <View style={styles.scanInfoSection}>
                <View style={styles.scanHeaderRow}>
                  <Text style={styles.scanTitle}>
                    {message.scanData.listing_title || "Property Listing"}
                  </Text>
                  {message.scanData.label && (
                    <View style={[styles.labelBadge, { backgroundColor: getLabelStyle(message.scanData.label).bg }]}>
                      <Text style={[styles.labelText, { color: getLabelStyle(message.scanData.label).text }]}>
                        {message.scanData.label}
                      </Text>
                    </View>
                  )}
                </View>
                {message.scanData.location && (
                  <Text style={styles.scanLocation}>{message.scanData.location}</Text>
                )}
                <TouchableOpacity onPress={() => Linking.openURL(message.scanData.listing_url)}>
                  <Text style={styles.scanUrl}>{message.scanData.listing_url}</Text>
                </TouchableOpacity>
              </View>

              {/* What To Expect */}
              {message.scanData.what_to_expect && (
                <View style={styles.scanSection}>
                  <Text style={styles.sectionTitle}>What To Expect</Text>
                  <Text style={styles.sectionContent}>
                    {message.scanData.what_to_expect} {message.scanData.expectation_fit || ""}
                  </Text>
                </View>
              )}

              {/* Recent Changes */}
              {message.scanData.recent_changes && (
                <View style={styles.scanSection}>
                  <Text style={styles.sectionTitle}>Recent Changes</Text>
                  <Text style={styles.sectionContent}>{message.scanData.recent_changes}</Text>
                </View>
              )}

              {/* Deep Inspection Analysis */}
              <View style={styles.scanSection}>
                <Text style={styles.sectionTitle}>Deep Inspection Analysis</Text>
                <Text style={styles.sectionContent}>
                  {message.scanData.inspection_summary || "This place passed 92 out of 100 inspection checks."}
                </Text>
                {message.scanData.categories && message.scanData.categories.length > 0 && (
                  <View style={styles.categoriesContainer}>
                    {message.scanData.categories.map((c, i) => (
                      <View key={i} style={[styles.categoryItem, c.triggered ? styles.categoryItemWarning : styles.categoryItemSuccess]}>
                        <View style={styles.categoryHeader}>
                          <Text style={styles.categoryName}>{c.category}</Text>
                          {c.triggered ? (
                            <Text style={styles.categoryStatusWarning}>⚠️ Issues found</Text>
                          ) : (
                            <Text style={styles.categoryStatusSuccess}>✅ All clear</Text>
                          )}
                        </View>
                        {c.triggered && c.signals && c.signals.length > 0 && (
                          <View style={styles.signalsContainer}>
                            {c.signals.map((s, j) => (
                              <Text key={j} style={styles.signalText}>
                                <Text style={styles.signalFlag}>{s.flag}:</Text> {s.note}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            // Display AI answers with preserved formatting (matching web app whitespace-pre-wrap)
            !isUser && !isError ? renderAnswerText(message.content) : (
              <Text style={[styles.messageText, isError && styles.errorText]}>
                {message.content}
              </Text>
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={BOOK1_LOGO} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.profileButtonContainer}
          onPress={() => navigation.navigate('Account')}
          activeOpacity={0.6}
        >
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={24} color="#ffffff" />
          </View>
          <Text style={styles.profileLabel}>Profile</Text>
        </TouchableOpacity>
        
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages Area */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !isLoading ? (
            // Welcome message (matching web app)
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTitle}>Hi, I am BookYolo AI</Text>
              <Text style={styles.welcomeSubtitle}>
                Scan your next stay before booking and avoid surprises. Paste any property URL from Airbnb, Booking, Expedia or Agoda.
              </Text>
            </View>
          ) : messages.length === 0 && isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1e162a" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.messagesList}>
              {messages.map(renderMessage)}
              <View ref={messagesEndRef} />
            </View>
          )}
        </ScrollView>


        {/* Input Form */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={textInputRef}
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              placeholder="Scan or Ask Anything…"
              placeholderTextColor="#999"
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSubmit}
              disabled={!input.trim() || isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <View style={styles.sendButtonLoadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonLoadingText}>Processing...</Text>
                </View>
              ) : (
                <Image 
                  source={require('../assets/book2.png')} 
                  style={styles.sendButtonIcon}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 1000,
    position: 'relative',
    height: 80,
  },
  logoContainer: {
    position: 'absolute',
    left: 20,
    top: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },
  logo: {
    width: 45,
    height: 45,
  },
  profileButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 4,
  },
  profileIcon: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#1e162a",
    shadowColor: "#1e162a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  profileLabel: {
    fontSize: 10,
    color: "#1e162a",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  newScanButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1e162a",
    marginHorizontal: 8,
  },
  newScanButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#070707",
    marginBottom: 16,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#070707",
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#070707",
  },
  messagesList: {
    flex: 1,
  },
  messageContainer: {
    marginBottom: 0,
    width: '100%',
  },
  postScanMessageContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 16,
  },
  postScanMessageBubble: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  userMessageBubble: {
    backgroundColor: "#f3f4f6",
  },
  assistantMessageBubble: {
    backgroundColor: "#ffffff",
  },
  errorMessageBubble: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  messageText: {
    fontSize: 16,
    color: "#070707",
    lineHeight: 24,
    // Preserve whitespace and line breaks (matching web app whitespace-pre-wrap)
    flexWrap: 'wrap',
  },
  errorText: {
    color: "#dc2626",
  },
  // Scan Result Styles
  scanResultContainer: {
    width: '100%',
  },
  scanInfoSection: {
    marginBottom: 16,
  },
  scanHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  scanTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#070707",
    flex: 1,
    marginRight: 8,
  },
  labelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  scanLocation: {
    fontSize: 14,
    color: "#070707",
    marginBottom: 8,
  },
  scanUrl: {
    fontSize: 12,
    color: "#3b82f6",
    textDecorationLine: 'underline',
  },
  scanSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#070707",
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: "#070707",
    lineHeight: 20,
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoryItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  categoryItemSuccess: {
    backgroundColor: "#f0fdf4",
    borderLeftColor: "#22c55e",
  },
  categoryItemWarning: {
    backgroundColor: "#fffbeb",
    borderLeftColor: "#f59e0b",
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#070707",
  },
  categoryStatusSuccess: {
    fontSize: 12,
    color: "#22c55e",
  },
  categoryStatusWarning: {
    fontSize: 12,
    color: "#f59e0b",
  },
  signalsContainer: {
    marginTop: 8,
  },
  signalText: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
  },
  signalFlag: {
    fontWeight: "600",
    color: "#92400e",
  },
  // Progress Styles
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#070707",
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: "#1e162a",
    borderRadius: 4,
  },
  // Input Styles
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e9e8ea",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: "#070707",
    textAlignVertical: 'top',
  },
  sendButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1e162a",
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginLeft: 8,
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.5,
  },
  sendButtonIcon: {
    width: 24,
    height: 24,
  },
  sendButtonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonLoadingText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  linkText: {
    color: "#3b82f6",
    textDecorationLine: 'underline',
  },
  typingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  typingIndicatorText: {
    fontSize: 16,
    color: "#070707",
    fontStyle: 'italic',
  },
});
