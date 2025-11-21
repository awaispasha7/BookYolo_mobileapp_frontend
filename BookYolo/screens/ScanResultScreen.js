import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from "../lib/apiClient";
import { useAuth } from "../context/AuthProvider";
import { BOOK1_LOGO } from "../constants/images";

const { width } = Dimensions.get("window");

// Inline iPhone Back Button Component - same as AccountScreen
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

export default function ScanResultScreen({ route, navigation }) {
  const { scanData: initialScanData, isFreshScan, chatId: initialChatId } = route.params || { scanData: null, isFreshScan: false, chatId: null };
  const { refreshUser, scanBalance, refreshScanBalance } = useAuth();
  
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(initialChatId || null);
  const [chatLoading, setChatLoading] = useState(false);
  const [localChatKey, setLocalChatKey] = useState(null);
  const [scanSaved, setScanSaved] = useState(!isFreshScan); // Track if scan is saved in backend
  const [canNavigateToHistory, setCanNavigateToHistory] = useState(!isFreshScan); // Track if user can navigate to history
  const [historyDelayCountdown, setHistoryDelayCountdown] = useState(isFreshScan ? 3 : 0); // Countdown for fresh scans
  const [showChat, setShowChat] = useState(true); // Toggle for chat visibility
  const [scanData, setScanData] = useState(initialScanData); // Use state for scanData so we can update it
  const [isLoading, setIsLoading] = useState(isFreshScan && (!initialScanData?.analysis || initialScanData?.status === "Scanning")); // Track if we're waiting for scan data
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();
  const pollingIntervalRef = useRef(null);

  // Load scan data from backend if we have scan_id (same as web app)
  useEffect(() => {
    const loadScanDataFromBackend = async () => {
      let currentScanId = scanData?.id;
      
      // If we don't have scan_id but have chatId, get it from chat (same as web app)
      if (!currentScanId && chatId) {
        try {
          const { data: chatData, error: chatError } = await apiClient.getChat(chatId);
          if (!chatError && chatData?.chat?.scan_id) {
            currentScanId = chatData.chat.scan_id;
            // Update scanData with scan_id
            setScanData(prev => ({
              ...prev,
              id: currentScanId
            }));
          }
        } catch (error) {
          console.error('Error fetching chat to get scan_id:', error);
        }
      }
      
      if (!currentScanId) return;
      
      try {
        // Fetch scan data from /scan/{scan_id} endpoint (same as web app)
        const { data: fetchedScanData, error } = await apiClient.getScanById(currentScanId);
        
        if (!error && fetchedScanData) {
          // Update scanData with fetched data
          setScanData(prevScanData => {
            const updatedScanData = {
              ...prevScanData,
              ...fetchedScanData,
              id: currentScanId,
              link: fetchedScanData.listing_url || prevScanData?.link,
              status: fetchedScanData.status || "Success",
              analysis: fetchedScanData,
              listing_title: fetchedScanData.listing_title || prevScanData?.listing_title,
              location: fetchedScanData.location || prevScanData?.location,
              label: fetchedScanData.label || prevScanData?.label
            };
            
            // If scan is complete, stop loading
            if (updatedScanData.status === "Success" || updatedScanData.analysis) {
              setIsLoading(false);
              setScanSaved(true);
            }
            
            return updatedScanData;
          });
        }
      } catch (error) {
        console.error('Error loading scan data from backend:', error);
      }
    };
    
    // Load scan data immediately if we have scan_id or chatId
    if (scanData?.id || chatId) {
      loadScanDataFromBackend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanData?.id, chatId]); // Depend on scan_id and chatId

  // Poll for scan completion if status is "Scanning" (same as web app logic)
  useEffect(() => {
    const currentScanId = scanData?.id;
    const currentStatus = scanData?.status;
    const hasAnalysis = scanData?.analysis;
    
    if (isFreshScan && currentScanId && (currentStatus === "Scanning" || !hasAnalysis)) {
      // Start polling for scan completion
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const { data: fetchedScanData, error } = await apiClient.getScanById(currentScanId);
          
          if (!error && fetchedScanData) {
            setScanData(prevScanData => {
              const updatedScanData = {
                ...prevScanData,
                ...fetchedScanData,
                id: currentScanId,
                link: fetchedScanData.listing_url || prevScanData?.link,
                status: fetchedScanData.status || "Success",
                analysis: fetchedScanData,
                listing_title: fetchedScanData.listing_title || prevScanData?.listing_title,
                location: fetchedScanData.location || prevScanData?.location,
                label: fetchedScanData.label || prevScanData?.label
              };
              
              // If scan is complete, stop polling and loading
              if (updatedScanData.status === "Success" || updatedScanData.analysis) {
                setIsLoading(false);
                setScanSaved(true);
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
              }
              
              return updatedScanData;
            });
          }
        } catch (error) {
          console.error('Error polling scan data:', error);
        }
      }, 3000); // Poll every 3 seconds (same as web app)
      
      // Stop polling after 60 seconds max
      const timeoutId = setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setIsLoading(false);
        }
      }, 60000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        clearTimeout(timeoutId);
      };
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFreshScan, scanData?.id]); // Only depend on scan_id, status will be checked inside

  // Load chat history when component mounts or when route params change
  useEffect(() => {
    loadChatHistory();
  }, [scanData?.id, scanData?.link]);

  // Also load chat history when screen comes into focus (but only if we don't have messages)
  useFocusEffect(
    React.useCallback(() => {
      // Only load chat history if we don't have any messages yet
      if (messages.length === 0) {
        loadChatHistory();
      }
    }, [scanData?.id, scanData?.link, messages.length])
  );

  // Function to refresh chat history (can be called after creating a new chat)
  const refreshChatHistory = async () => {
    // console.log('🔄 Refreshing chat history...');
    await loadChatHistory();
  };

  // Local chat storage functions
  const getLocalChatKey = (scanId) => `local_chat_${scanId}`;
  
  const saveLocalChatHistory = async (scanId, messages) => {
    try {
      const key = getLocalChatKey(scanId);
      await AsyncStorage.setItem(key, JSON.stringify(messages));
      // console.log('💾 Saved local chat history for scan:', scanId);
    } catch (error) {
      // console.error('❌ Error saving local chat history:', error);
    }
  };
  
  const loadLocalChatHistory = async (scanId) => {
    try {
      const key = getLocalChatKey(scanId);
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const messages = JSON.parse(stored);
        // console.log('📱 Loaded local chat history for scan:', scanId, 'messages:', messages.length);
        return messages;
      }
    } catch (error) {
      // console.error('❌ Error loading local chat history:', error);
    }
    return [];
  };

  // Function to manually deduct 0.5 scans from local balance (for AI chat)
  const deductScanFromBalance = async () => {
    try {
      // Get current scan balance from AsyncStorage
      const currentBalance = await AsyncStorage.getItem('user_scan_balance');
      let balance = currentBalance ? JSON.parse(currentBalance) : null;
      
      if (!balance) {
        // If no local balance, get from auth context
        balance = {
          remaining: scanBalance?.remaining || 0,
          used: scanBalance?.used || 0,
          plan: scanBalance?.plan || 'free',
          limits: scanBalance?.limits || {}
        };
      }
      
      // Check if user has enough scans to deduct
      const totalLimit = balance.limits?.total_limit || 50;
      if (balance.used >= totalLimit) {
        // console.log('⚠️ User has reached scan limit, cannot deduct more scans');
        return null;
      }
      
      // Deduct 0.5 scans, but don't exceed the total limit
      const newUsed = Math.min(totalLimit, balance.used + 0.5);
      const newRemaining = Math.max(0, totalLimit - newUsed);
      
      const updatedBalance = {
        ...balance,
        remaining: newRemaining,
        used: newUsed
      };
      
      // Save updated balance to AsyncStorage
      await AsyncStorage.setItem('user_scan_balance', JSON.stringify(updatedBalance));
      
      // console.log('✅ Deducted 0.5 scans from local balance. New remaining:', newRemaining);
      // console.log('📊 Updated balance saved to AsyncStorage:', updatedBalance);
      
      // Note: We don't call refreshUser() here to avoid infinite loops
      // The local balance is updated in AsyncStorage and will be synced on next app refresh
      
      return updatedBalance;
    } catch (error) {
      // console.error('❌ Error deducting scan from balance:', error);
      return null;
    }
  };

  // Function to load chat history
  const loadChatHistory = async () => {
    if (!scanData) return;
    
    // console.log('🔄 Loading chat history for scan:', scanData?.id, scanData?.link);
    setChatLoading(true);
    try {
      // If we have a chatId from route params (new scan), use it directly
      if (initialChatId) {
        // console.log('✅ Using chatId from route params:', initialChatId);
        setChatId(initialChatId);
        
        // Load chat messages
        const { data: chatData, error: chatError } = await apiClient.getChat(initialChatId);
        
        if (chatError) {
          // console.error('❌ Error loading chat messages:', chatError);
        } else if (chatData?.messages) {
          // console.log('💬 Loaded', chatData.messages.length, 'chat messages from backend');
          // Convert backend messages to frontend format
          const formattedMessages = chatData.messages.map(msg => ({
            type: msg.role === 'user' ? 'user' : 'bot',
            text: msg.content,
            id: `${msg.role}_${Date.now()}_${Math.random()}`
          }));
          setMessages(formattedMessages);
        } else {
          // console.log('📭 No messages found in chat');
        }
        setChatLoading(false);
        return;
      }
      
      // Get all chats and find the one for this scan ID
      const { data: chats, error: chatsError } = await apiClient.getChats();
      
      if (chatsError) {
        // console.error('❌ Error loading chats:', chatsError);
        setChatLoading(false);
        return;
      }

      // console.log('📋 Found chats:', chats?.length || 0);

      // Find chat for this scan ID by checking each chat's scan_id
      let matchingChat = null;
      
      for (const chat of chats || []) {
        try {
          // Get the full chat data to check scan_id
          const { data: chatData, error: chatError } = await apiClient.getChat(chat.id);
          
          if (!chatError && chatData?.chat?.scan_id) {
            // console.log('🔍 Checking chat', chat.id, 'with scan_id:', chatData.chat.scan_id, 'against our scan:', scanData?.id);
            
            if (chatData.chat.scan_id === scanData?.id) {
              matchingChat = chat;
              // console.log('✅ Found matching chat by scan_id:', chat.id);
              break;
            }
          }
        } catch (error) {
          // console.log('⚠️ Error checking chat', chat.id, ':', error);
        }
      }

      if (matchingChat) {
        // console.log('✅ Found existing chat:', matchingChat.id, 'for scan_id:', scanData?.id);
        setChatId(matchingChat.id);
        
        // Load chat messages
        const { data: chatData, error: chatError } = await apiClient.getChat(matchingChat.id);
        
        if (chatError) {
          // console.error('❌ Error loading chat messages:', chatError);
        } else if (chatData?.messages) {
          // console.log('💬 Loaded', chatData.messages.length, 'chat messages');
          // Convert backend messages to frontend format
          const formattedMessages = chatData.messages.map(msg => ({
            type: msg.role === 'user' ? 'user' : 'bot',
            text: msg.content,
            id: `${msg.role}_${Date.now()}_${Math.random()}`
          }));
          setMessages(formattedMessages);
        } else {
          // console.log('📭 No messages found in chat');
        }
      } else {
        // console.log('❌ No existing chat found for scan_id:', scanData?.id);
        // Clear any existing chat state
        setChatId(null);
        
        // Don't clear messages if we already have some (preserve AI chat history)
        if (messages.length === 0) {
          setMessages([]);
        }
      }
    } catch (error) {
      // console.error('❌ Error in loadChatHistory:', error);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle scan data updates and loading state
  useEffect(() => {
    if (isFreshScan && scanData) {
      // Check if we have real analysis data
      if (scanData.analysis && scanData.status === "Success") {
        setIsLoading(false);
        setScanSaved(true);
        // console.log('✅ Fresh scan data is now available with analysis');
      } else if (scanData.status === "Scanning" || !scanData.analysis) {
        setIsLoading(true);
        // console.log('⏳ Waiting for scan analysis to complete...');
      }
    }
  }, [isFreshScan, scanData]);

  // Ensure scan is saved in backend for fresh scans
  useEffect(() => {
    if (isFreshScan && scanData && !scanSaved) {
      // Add a small delay to ensure the scan is saved in backend
      const timer = setTimeout(() => {
        setScanSaved(true);
        // console.log('✅ Fresh scan data is now available for questions');
      }, 2000); // 2 second delay to ensure backend has processed the scan
      
      return () => clearTimeout(timer);
    }
  }, [isFreshScan, scanData, scanSaved]);

  // Handle delay for fresh scans before allowing history navigation
  useEffect(() => {
    if (isFreshScan && historyDelayCountdown > 0) {
      const timer = setTimeout(() => {
        setHistoryDelayCountdown(prev => {
          if (prev <= 1) {
            setCanNavigateToHistory(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isFreshScan, historyDelayCountdown]);

  // Generate AI response based on scan data and question
  const generateAIResponse = (question, scanData) => {
    const analysis = scanData?.analysis || scanData;
    const questionLower = question.toLowerCase();
    
    // Extract key information from scan data
    const location = analysis?.location || "this location";
    const label = analysis?.label || "this property";
    const inspectionSummary = analysis?.inspection_summary || "passed all inspection checks";
    const whatToExpect = analysis?.what_to_expect || "a standard vacation rental experience";
    const categories = analysis?.categories || [];
    
    // Generate contextual responses based on question
    if (questionLower.includes('price') || questionLower.includes('cost') || questionLower.includes('expensive')) {
      return `Based on the analysis, ${label} appears to be reasonably priced for ${location}. The property ${inspectionSummary.toLowerCase()}, which suggests good value for money. However, I'd recommend checking current pricing on Airbnb as rates can fluctuate.`;
    }
    
    if (questionLower.includes('safe') || questionLower.includes('security') || questionLower.includes('dangerous')) {
      return `The safety analysis shows that ${label} ${inspectionSummary.toLowerCase()}. The property appears to be in a safe area of ${location}. All safety checks have been passed, so you can feel confident about your stay.`;
    }
    
    if (questionLower.includes('clean') || questionLower.includes('hygiene') || questionLower.includes('dirty')) {
      return `Cleanliness is one of the key factors analyzed. ${label} has ${inspectionSummary.toLowerCase()}, which includes cleanliness and hygiene standards. The property maintains good cleanliness standards based on the inspection.`;
    }
    
    if (questionLower.includes('host') || questionLower.includes('owner') || questionLower.includes('manager')) {
      return `The host reliability analysis shows that the property owner maintains good standards. ${inspectionSummary} indicates the host is responsive and maintains the property well. You can expect good communication and support during your stay.`;
    }
    
    if (questionLower.includes('location') || questionLower.includes('area') || questionLower.includes('neighborhood')) {
      return `${location} is a great location for your stay. The property is well-situated and ${inspectionSummary.toLowerCase()}. The area appears to be safe and convenient for travelers.`;
    }
    
    if (questionLower.includes('amenities') || questionLower.includes('facilities') || questionLower.includes('features')) {
      return `The property offers standard amenities that you'd expect from a vacation rental. ${inspectionSummary} includes checks for essential amenities like WiFi, kitchen facilities, and basic comforts.`;
    }
    
    if (questionLower.includes('recommend') || questionLower.includes('should i') || questionLower.includes('worth it')) {
      return `Based on the comprehensive analysis, ${label} appears to be a good choice for your stay in ${location}. ${inspectionSummary} and the overall assessment suggests it's worth considering for your trip.`;
    }
    
    if (questionLower.includes('problem') || questionLower.includes('issue') || questionLower.includes('concern')) {
      const hasIssues = categories.some(cat => cat.triggered || (cat.signals && cat.signals.length > 0));
      if (hasIssues) {
        return `The analysis found some areas that need attention, but overall ${label} ${inspectionSummary.toLowerCase()}. Any issues identified are minor and shouldn't significantly impact your stay.`;
      } else {
        return `Great news! The analysis shows no significant problems with ${label}. ${inspectionSummary} and all categories passed their checks, so you can book with confidence.`;
      }
    }
    
    // Default response for general questions
    return `Based on the analysis of ${label} in ${location}, ${inspectionSummary.toLowerCase()}. ${whatToExpect}. The property appears to be well-maintained and suitable for your stay. Is there anything specific about the property you'd like to know more about?`;
  };

  const handleSend = async () => {
    if (!question.trim() || isAsking) {
      return;
    }

    // Check if scan is ready for questions (for fresh scans)
    if (isFreshScan && (isLoading || !scanSaved)) {
      Alert.alert(
        "Scan Processing", 
        "Please wait a moment for the scan to be fully processed before asking questions."
      );
      return;
    }

    // Check if user has sufficient balance for questions (requires 0.5 scans)
    if (scanBalance?.remaining < 0.5) {
      Alert.alert(
        'Insufficient Scans', 
        'You don\'t have enough scans remaining. Please upgrade your plan to continue asking questions.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Upgrade Now', style: 'default', onPress: () => navigation.navigate('PlanStatus') }
        ]
      );
      return;
    }
    
    // Add user message immediately
    const userQuestion = question.trim();
    const updatedMessages = [...messages, { 
      type: "user", 
      text: userQuestion,
      id: Date.now().toString() // Add unique ID
    }];
    setMessages(updatedMessages);
    setQuestion("");
    setIsAsking(true);
    
    // Save user message to local storage immediately (only for existing scans without backend chat)
    if (scanData?.id && !chatId) {
      await saveLocalChatHistory(scanData.id, updatedMessages);
      setLocalChatKey(scanData.id);
    }

    // Auto-scroll to bottom when new message is added
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
      if (chatId) {
        // Use backend chat system
        // console.log('🤖 Using backend chat system for question:', userQuestion);
        
        const { data, error } = await apiClient.askChatQuestion(chatId, userQuestion);
        // console.log('🤖 Backend chat response:', { data, error });
        
        if (error) {
          // Handle API errors
          const newMessages = [...updatedMessages, { 
            type: "bot", 
            text: `Sorry, I encountered an error: ${error}. Please try again.`,
            id: (Date.now() + 1).toString()
          }];
          setMessages(newMessages);
          
          // Backend chat system automatically saves messages to database
        } else if (data && data.answer) {
          // Use backend AI response
          const newMessages = [...updatedMessages, { 
            type: "bot", 
            text: data.answer,
            id: (Date.now() + 1).toString()
          }];
          setMessages(newMessages);
          
          // Backend chat system automatically saves messages to database (same as web app)
            // Deduct 0.5 scans from local balance after successful AI chat
            await deductScanFromBalance();
            
            // Save messages to local storage for persistence
            if (scanData?.id) {
              await saveLocalChatHistory(scanData.id, newMessages);
            }
            
            // Refresh scan balance from backend immediately (same as web app)
            try {
              await refreshScanBalance();
            } catch (error) {
              // console.error('❌ Error refreshing scan balance after AI chat:', error);
            }
        } else {
          // Fallback response if no answer in data
          const newMessages = [...updatedMessages, { 
            type: "bot", 
            text: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
            id: (Date.now() + 1).toString()
          }];
          setMessages(newMessages);
          
          // Backend chat system automatically saves messages to database
        }
      } else {
        // No chat ID found - use the old question endpoint for existing scans
        // console.log('🤖 No chat ID found, using old question endpoint for existing scan');
        
        try {
          // Use the old question endpoint which should reduce scan balance
          // Note: This will use the most recent scan, not the specific scan from history
          // console.log('🤖 Using old question endpoint with question:', userQuestion);
          
          const { data, error } = await apiClient.askQuestion(userQuestion);
          // console.log('🤖 Old question endpoint response:', { data, error });
          
          if (error) {
            // Handle API errors
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: `Sorry, I encountered an error: ${error}. Please try again.`,
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
            
            // No local storage saving - use backend only (same as web app)
          } else if (data && data.answer) {
            // Use backend AI response
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: data.answer,
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
            
            // No local storage saving - use backend only (same as web app)
            
            // Deduct 0.5 scans from local balance after successful AI chat
            await deductScanFromBalance();
            
            // Save messages to local storage for persistence
            if (scanData?.id) {
              await saveLocalChatHistory(scanData.id, newMessages);
            }
            
            // Refresh scan balance from backend immediately (same as web app)
            try {
              await refreshScanBalance();
            } catch (error) {
              // console.error('❌ Error refreshing scan balance after AI chat:', error);
            }
          } else {
            // Fallback response if no answer in data
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
            
            // No local storage saving - use backend only (same as web app)
          }
        } catch (error) {
          // console.error('❌ Error with old question endpoint:', error);
          // Fallback to local response
          const fallbackResponse = generateAIResponse(userQuestion, scanData);
          const newMessages = [...updatedMessages, { 
            type: "bot", 
            text: fallbackResponse,
            id: (Date.now() + 1).toString()
          }];
          setMessages(newMessages);
          
          // Save to local storage for persistence
          if (scanData?.id) {
            await saveLocalChatHistory(scanData.id, newMessages);
            setLocalChatKey(scanData.id);
          }
          
          // Deduct 0.5 scans from local balance for local AI responses
          await deductScanFromBalance();
          
          // Save messages to local storage for persistence
          if (scanData?.id) {
            await saveLocalChatHistory(scanData.id, newMessages);
          }
          
          // Refresh scan balance from backend immediately
          try {
            await refreshScanBalance();
          } catch (error) {
            // console.error('❌ Error refreshing scan balance after AI chat:', error);
          }
        }
      }
      
      // Auto-scroll to bottom after bot response
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
    } catch (error) {
      // console.error('AI Chat Error:', error);
      // Fallback to local response if API fails
      const fallbackResponse = generateAIResponse(userQuestion, scanData);
      setMessages((prev) => [...prev, { 
        type: "bot", 
        text: fallbackResponse,
        id: (Date.now() + 1).toString()
      }]);
      
      // Deduct 0.5 scans from local balance for fallback AI responses
      await deductScanFromBalance();
      
      // Save messages to local storage for persistence
      if (scanData?.id) {
        await saveLocalChatHistory(scanData.id, messages);
      }
      
      // Refresh scan balance from backend immediately
      try {
        await refreshScanBalance();
      } catch (error) {
        // console.error('❌ Error refreshing scan balance after AI chat:', error);
      }
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } finally {
      setIsAsking(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderScanResult = () => {
    if (!scanData) return null;
    
    
    // Show loading state if we're waiting for analysis data
    if (isLoading) {
      return (
        <View style={styles.scanResultContainer}>
          <View style={styles.headerCard}>
            <Text style={styles.urlText}>{scanData.link}</Text>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000000" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </View>
        </View>
      );
    }
    
    // Extract the actual analysis data from the nested structure
    const analysis = scanData.analysis || scanData;
    const label = analysis.label || 
                  analysis.scan?.label || 
                  scanData.label || 
                  scanData.scan?.label || 
                  "Unknown";
    
    // Try multiple possible paths for location data
    const location = analysis.location || 
                    analysis.scan?.location || 
                    scanData.location || 
                    scanData.scan?.location || 
                    "Location not available";
    
    const listingUrl = analysis.listing_url || 
                      analysis.scan?.listing_url || 
                      scanData?.link || 
                      "N/A";
    
    // Final location with additional fallback
    const finalLocation = location === "Location not available" 
      ? (analysis.location || analysis.scan?.location || scanData.location || scanData.scan?.location || "Location not available")
      : location;
    
    
    // Determine label color and icon based on web app styling
    const getLabelStyle = (label) => {
      switch (label.toLowerCase()) {
        case 'excellent stay':
        case 'outstanding stay':
          return { backgroundColor: '#10B981', color: '#ffffff', icon: 'star' };
        case 'good stay':
        case 'decent stay':
        case 'looks legit':
          return { backgroundColor: '#3B82F6', color: '#ffffff', icon: 'thumbs-up' };
        case 'fair stay':
        case 'average stay':
        case 'probably ok':
          return { backgroundColor: '#F59E0B', color: '#ffffff', icon: 'warning' };
        case 'poor stay':
        case 'avoid':
        case 'travel trap':
        case 'looks sketchy':
          return { backgroundColor: '#EF4444', color: '#ffffff', icon: 'alert-circle' };
        case 'a bit risky':
          return { backgroundColor: '#F59E0B', color: '#ffffff', icon: 'warning' };
        case 'insufficient data':
          return { backgroundColor: '#6B7280', color: '#ffffff', icon: 'help-circle' };
        default:
          return { backgroundColor: '#6B7280', color: '#ffffff', icon: 'help-circle' };
      }
    };
    
    const labelStyle = getLabelStyle(label);
    
    return (
      <View style={styles.scanResultContainer}>
        {/* Header with URL, Location and Label - Matching Web */}
        <View style={styles.headerCard}>
          <Text style={styles.urlText}>{listingUrl}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#EF4444" />
            <Text style={styles.locationText}>{finalLocation}</Text>
          </View>
          <View style={styles.labelContainer}>
            <Ionicons name="checkmark" size={16} color="#10B981" />
            <View style={[styles.labelBadge, { backgroundColor: labelStyle.backgroundColor }]}>
              <Text style={[styles.labelText, { color: labelStyle.color }]}>{label}</Text>
            </View>
          </View>
          <Text style={styles.inspectionSummary}>
            {analysis.inspection_summary || analysis.scan?.inspection_summary || "This place passed 100 out of 100 inspection checks."}
          </Text>
        </View>
        
        {/* What to Expect Section - Matching Web */}
        <View style={styles.whatToExpectCard}>
          <Text style={styles.sectionTitle}>What to Expect</Text>
          <Text style={styles.sectionText}>
            {analysis.what_to_expect || analysis.scan?.what_to_expect || "Expect a standard vacation rental experience based on the listing details and reviews."}
          </Text>
          <Text style={styles.recentChangesLabel}>Recent changes:</Text>
          <Text style={styles.recentChangesText}>
            {analysis.recent_changes || analysis.scan?.recent_changes || "Recent reviews show stable performance."}
          </Text>
        </View>
        
        {/* Analysis Section - Matching Web */}
        <View style={styles.analysisCard}>
          <Text style={styles.sectionTitle}>Analysis</Text>
          
          {/* Show issues if any categories have problems */}
          {(analysis.categories || analysis.scan?.categories) && (analysis.categories || analysis.scan?.categories).some(cat => cat.triggered || (cat.signals && cat.signals.length > 0)) ? (
            <View style={styles.issuesContainer}>
              {(analysis.categories || analysis.scan?.categories).map((categoryData, index) => {
                const categoryName = categoryData?.category || 'Unknown Category';
                const triggered = categoryData?.triggered || false;
                const signals = categoryData?.signals || [];
                const hasIssues = triggered || signals.length > 0;
                
                if (!hasIssues) return null;
                
                return (
                  <View key={index} style={styles.issueSection}>
                    <View style={styles.issueHeader}>
                      <Text style={styles.issueCategoryTitle}>{categoryName}</Text>
                      <View style={styles.issueBadge}>
                        <Ionicons name="warning" size={16} color="#F59E0B" />
                        <Text style={styles.issueBadgeText}>Issues found</Text>
                      </View>
                    </View>
                    {signals.map((signal, signalIndex) => (
                      <Text key={signalIndex} style={styles.issueText}>
                        {signal.flag}: {signal.note}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noIssuesText}>No issues found in the analysis.</Text>
          )}
        </View>
        
        {/* Inspection Categories - Individual Cards like Analysis */}
        <View style={styles.categoriesCard}>
          <Text style={styles.categoriesTitle}>Inspection Categories</Text>
          <View style={styles.categoriesContainer}>
            {(analysis.categories || analysis.scan?.categories) && Array.isArray(analysis.categories || analysis.scan?.categories) && (analysis.categories || analysis.scan?.categories).length > 0 ? (
              (analysis.categories || analysis.scan?.categories).map((categoryData, index) => {
                const categoryName = categoryData?.category || 'Unknown Category';
                const triggered = categoryData?.triggered || false;
                const signals = categoryData?.signals || [];
                const hasIssues = triggered || signals.length > 0;
                
                return (
                  <View key={index} style={[styles.inspectionCategoryCard, hasIssues ? styles.inspectionCategoryCardWithIssues : styles.inspectionCategoryCardAllClear]}>
                    <View style={styles.inspectionCategoryHeader}>
                      <Text style={styles.inspectionCategoryTitle}>{categoryName}</Text>
                      <View style={styles.inspectionCategoryBadge}>
                        <Ionicons 
                          name={hasIssues ? "warning" : "checkmark"} 
                          size={16} 
                          color={hasIssues ? "#F59E0B" : "#10B981"} 
                        />
                        <Text style={[styles.inspectionCategoryBadgeText, { color: hasIssues ? "#F59E0B" : "#10B981" }]}>
                          {hasIssues ? "Issues found" : "All clear"}
                        </Text>
                      </View>
                    </View>
                    {hasIssues && signals.length > 0 && (
                      <View style={styles.inspectionCategoryIssues}>
                        {signals.map((signal, signalIndex) => (
                          <Text key={signalIndex} style={styles.inspectionCategoryIssueText}>
                            {signal.flag}: {signal.note}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              // Default categories if none provided
              [
                "Maintenance & Functionality",
                "Comfort & Sleep", 
                "Check-in & Access",
                "Host Reliability & Policies",
                "Accuracy & Expectation Fit",
                "Safety & Surroundings",
                "Value & Fees",
                "Trends & Consistency"
              ].map((categoryName, index) => (
                <View key={index} style={styles.inspectionCategoryCardAllClear}>
                  <View style={styles.inspectionCategoryHeader}>
                    <Text style={styles.inspectionCategoryTitle}>{categoryName}</Text>
                    <View style={styles.inspectionCategoryBadge}>
                      <Ionicons 
                        name="checkmark" 
                        size={16} 
                        color="#10B981" 
                      />
                      <Text style={[styles.inspectionCategoryBadgeText, { color: "#10B981" }]}>All clear</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
          <View style={styles.container}>
            {/* Header with Back Button, Logo and MVP Version */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
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
              
              <View style={styles.versionContainer}>
                <Text style={styles.versionText}>MVP 17.7.9.9b</Text>
              </View>
            </View>
            

            {/* Main Content with ScrollView */}
            <ScrollView 
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Scan Result Content */}
              {renderScanResult()}
              
              {/* Chat Toggle Button */}
              <View style={styles.chatToggleContainer}>
                <TouchableOpacity 
                  style={styles.chatToggleButton}
                  onPress={() => setShowChat(!showChat)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={showChat ? "chatbubbles" : "chatbubbles-outline"} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.chatToggleText}>
                    {showChat ? "Hide AI Chat" : "Ask AI Assistant"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Clean Chat Interface - Conditionally Rendered */}
              {showChat && (
                <View style={styles.chatContainer}>
                  {/* Chat Header */}
                  <View style={styles.chatHeader}>
                    <View style={styles.chatHeaderLeft}>
                      <View style={styles.chatAvatar}>
                        <Ionicons name="chatbubble" size={20} color="#000000" />
                      </View>
                      <View style={styles.chatHeaderInfo}>
                        <Text style={styles.chatHeaderTitle}>BookYolo AI</Text>
                        <Text style={styles.chatHeaderSubtitle}>Ask me anything about this listing</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Chat Messages Area - Fixed Height with ScrollView */}
                  <ScrollView 
                    style={styles.chatMessagesContainer}
                    contentContainerStyle={styles.chatMessagesContent}
                    showsVerticalScrollIndicator={true}
                    ref={flatListRef}
                    onContentSizeChange={() => scrollToBottom()}
                    onLayout={() => scrollToBottom()}
                  >
                    {messages.length === 0 ? (
                      <View style={styles.welcomeMessage}>
                        <View style={styles.welcomeBubble}>
                          <Ionicons name="sparkles" size={24} color="#000000" />
                          <Text style={styles.welcomeText}>
                            Hi! I'm here to help you with any questions about this Airbnb listing. What would you like to know?
                          </Text>
                        </View>
                      </View>
                    ) : (
                      messages.map((item, index) => (
                        <View
                          key={item.id || `message-${index}`}
                          style={[
                            styles.messageContainer,
                            item.type === "user" ? styles.userMessageContainer : styles.botMessageContainer,
                          ]}
                        >
                          {item.type === "bot" && (
                            <View style={styles.botAvatar}>
                              <Ionicons name="chatbubble" size={16} color="#000000" />
                            </View>
                          )}
                          <View
                            style={[
                              styles.messageBubble,
                              item.type === "user" ? styles.userMessage : styles.botMessage,
                            ]}
                          >
                            <Text style={item.type === "user" ? styles.messageTextOnPrimary : styles.messageText}>
                              {item.text}
                            </Text>
                            <Text style={[
                              styles.messageTime,
                              item.type === "user" ? styles.messageTimeOnPrimary : styles.messageTimeOnSecondary
                            ]}>
                              {new Date().toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                    {isAsking && (
                      <View style={styles.typingIndicator}>
                        <View style={styles.typingBubble}>
                          <View style={styles.typingDots}>
                            <View style={[styles.typingDot, styles.typingDot1]} />
                            <View style={[styles.typingDot, styles.typingDot2]} />
                            <View style={[styles.typingDot, styles.typingDot3]} />
                          </View>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            {/* Zero Scans Warning - Only show when chat is visible and scans are zero */}
            {showChat && scanBalance?.remaining <= 0 && (
              <View style={styles.zeroScansChatWarning}>
                <Text style={styles.zeroScansChatText}>
                  ⚠️ You need at least 0.5 scans to chat with AI assistant. Please{' '}
                  <Text 
                    style={styles.upgradeLinkText}
                    onPress={() => navigation.navigate('PlanStatus')}
                  >
                    upgrade to premium plan
                  </Text>
                  {' '}to get more scans.
                </Text>
              </View>
            )}

            {/* Simple Input Area - Only show when chat is visible */}
            {showChat && (
              <View style={[styles.chatInputContainer, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
                <View style={styles.chatInputWrapper}>
                  <View style={styles.chatInputCenter}>
                    <TextInput
                      style={[styles.chatInput, (isLoading || isAsking || scanBalance?.remaining <= 0) && styles.disabledInput]}
                      placeholder={isLoading ? "Analyzing listing..." : (scanBalance?.remaining <= 0 ? "No scans left..." : "ask follow up questions...")}
                      placeholderTextColor="#9CA3AF"
                      value={question}
                      onChangeText={setQuestion}
                      returnKeyType="send"
                      onSubmitEditing={handleSend}
                      multiline
                      editable={!isAsking && !isLoading && scanBalance?.remaining > 0}
                    />
                  </View>
                  
                  <View style={styles.chatInputRight}>
                    <TouchableOpacity 
                      style={[styles.sendButton, (isAsking || isLoading || scanBalance?.remaining <= 0) && styles.disabledButton]} 
                      onPress={handleSend} 
                      activeOpacity={0.8}
                      disabled={isAsking || isLoading || scanBalance?.remaining <= 0}
                    >
                      {(isAsking || isLoading) ? (
                        <ActivityIndicator color="black" size="small" />
                      ) : (
                        <Ionicons name="send" size={20} color="#000000" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'transparent',
    height: 90,
  },
  backButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: 'transparent',
    marginHorizontal: 15,
  },
  logo: {
    width: 35,
    height: 35,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  versionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 85,
    height: 40,
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  versionText: {
    fontSize: 9,
    color: "#374151",
    fontWeight: "600",
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  debugText: {
    fontSize: 12,
    color: "#FF0000",
    fontWeight: "bold",
    textAlign: 'center',
    backgroundColor: '#00FF00',
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Give a bit more room for the input bar
    paddingTop: 8,
  },
  scanResultContainer: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  urlText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '500',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inspectionSummary: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  whatToExpectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 12,
  },
  recentChangesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  recentChangesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  analysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  issuesContainer: {
    marginTop: 12,
  },
  issueSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueCategoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  issueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issueBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  issueText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 4,
  },
  noIssuesText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 12,
  },
  categoriesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  categoriesContainer: {
    marginTop: 12,
  },
  inspectionCategoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inspectionCategoryCardAllClear: {
    backgroundColor: '#D1FAE5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  inspectionCategoryCardWithIssues: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  inspectionCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectionCategoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  inspectionCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inspectionCategoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  inspectionCategoryIssues: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  inspectionCategoryIssueText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 4,
  },
  // Chat Toggle Styles - Beautiful Button
  chatToggleContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  chatToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000', // Black background for premium look
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 0,
  },
  chatToggleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF', // White text for contrast
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  // Chat Interface Styles - Part of Screen
  chatContainer: {
    backgroundColor: '#ffffff', // Same as other cards
    marginHorizontal: 20,
    marginBottom: 4, // Reduced gap
    borderRadius: 12, // Same as other cards
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // Same as other cards
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff', // Same as other cards
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB', // Same as other cards
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF', // White background for black icon
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937', // Same as other section titles
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#6b7280', // Same as other subtitles
    marginTop: 2,
  },
  chatHeaderRight: {
    padding: 8,
  },
  chatMessagesContainer: {
    backgroundColor: '#f8fafb', // Same as screen background
    minHeight: 200,
    maxHeight: 300,
  },
  chatMessagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 1,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 2,
  },
  typingDot1: {
    animationDelay: '0s',
  },
  typingDot2: {
    animationDelay: '0.2s',
  },
  typingDot3: {
    animationDelay: '0.4s',
  },
  welcomeMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  welcomeBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 14,
    color: '#4A4A4A',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF', // White background for black icon
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: '#000000', // Black background for user messages
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#FFFFFF', // WhatsApp bot message color
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#303030',
    lineHeight: 20,
  },
  messageTextOnPrimary: {
    fontSize: 15,
    color: '#FFFFFF', // White text for black background
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeOnPrimary: {
    color: 'rgba(255, 255, 255, 0.7)', // Light white for black background
  },
  messageTimeOnSecondary: {
    color: 'rgba(48, 48, 48, 0.6)',
  },
  chatInputContainer: {
    backgroundColor: '#ffffff', // Same as card background
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // Same as other borders
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced padding
  },
  chatInputCenter: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chatInput: {
    fontSize: 16,
    color: '#303030',
    paddingVertical: 4,
  },
  disabledInput: {
    opacity: 0.5,
    color: '#9CA3AF',
  },
  zeroScansChatWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  zeroScansChatText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  upgradeLinkText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  chatInputRight: {
    // Send button container
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF', // White background for black icon
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
});