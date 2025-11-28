import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Linking,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthProvider';
import { BOOK1_LOGO } from '../constants/images';

const CompareScreen = ({ navigation, route }) => {
  const { refreshUser, scanBalance, refreshScanBalance, user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [firstListing, setFirstListing] = useState(null);
  const [secondListing, setSecondListing] = useState(null);
  const [comparisonQuestion, setComparisonQuestion] = useState('');
  const [showFirstDropdown, setShowFirstDropdown] = useState(false);
  const [showSecondDropdown, setShowSecondDropdown] = useState(false);
  const [recentCompares, setRecentCompares] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingRef = useRef(false);
  
  // AI Assistant state
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [currentCompareChat, setCurrentCompareChat] = useState(null);
  const flatListRef = useRef(null);
  const lastTabPressTime = useRef(0);

  // Load user's scan history
  useEffect(() => {
    loadScans();
    loadRecentCompares();
    loadCompareChats();
    // Don't load current compare chat on mount - chat should be empty on screen load
    // Messages will only be shown during active comparison in current session
  }, []);

  // Load compare chats from localStorage (same as web frontend)
  const loadCompareChats = async () => {
    try {
      const savedCompareChats = JSON.parse(await AsyncStorage.getItem('compare_chats') || '[]');
      // console.log('📱 Loaded compare chats from localStorage:', savedCompareChats.length);
      return savedCompareChats;
    } catch (error) {
      // console.error('❌ Error loading compare chats:', error);
      return [];
    }
  };

  // Load current compare chat (same as web frontend)
  const loadCurrentCompareChat = async () => {
    try {
      // Check if we have a current chat ID
      const currentChatId = await AsyncStorage.getItem('current_compare_chat_id');
      if (currentChatId) {
        // First check if it's a backend chat (starts with UUID, not 'compare-')
        if (!currentChatId.startsWith('compare-')) {
          // Load from backend (same as web frontend)
          const { data: chatData, error } = await apiClient.getChat(currentChatId);
          if (!error && chatData && chatData.chat) {
            // If it's a compare chat, fetch the scan data for both scans (same as web frontend)
            let compareScanData = null;
            if (chatData.chat.type === 'compare' && chatData.chat.scan_ids && chatData.chat.scan_ids.length >= 2) {
              try {
                const [scan1Result, scan2Result] = await Promise.all([
                  apiClient.getScanById(chatData.chat.scan_ids[0]),
                  apiClient.getScanById(chatData.chat.scan_ids[1])
                ]);
                
                if (scan1Result.data && scan2Result.data) {
                  compareScanData = {
                    scan1: scan1Result.data,
                    scan2: scan2Result.data
                  };
                }
              } catch (e) {
                console.error('Failed to load compare scan data:', e);
              }
            }
            
            // Extract comparison result from messages (same as web frontend)
            const assistantMessage = chatData.messages?.find(msg => 
              msg.role === 'assistant' && 
              msg.content && 
              (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))
            );
            
            const compareChat = {
              id: currentChatId,
              type: 'compare',
              title: chatData.chat.title || '',
              created_at: chatData.chat.created_at,
              scan1: compareScanData?.scan1 || null,
              scan2: compareScanData?.scan2 || null,
              result: assistantMessage?.content || '',
              messages: chatData.messages || []
            };
            
            setCurrentCompareChat(compareChat);
            setChatId(compareChat.id);
            setComparisonResult({ answer: assistantMessage?.content || '' });
            
            // Convert backend messages to frontend format and set them (same as web frontend)
            if (chatData.messages && chatData.messages.length > 0) {
              const formattedMessages = chatData.messages.map((msg, index) => {
                const formattedMsg = {
                  type: msg.role === 'user' ? 'user' : 'bot',
                  text: msg.content,
                  id: `${msg.role}_${msg.created_at || Date.now()}_${Math.random()}`,
                  timestamp: msg.created_at
                };
                
                // Add comparison metadata for assistant messages (same as web frontend)
                if (msg.role === 'assistant' && compareScanData) {
                  formattedMsg.isComparison = true;
                  formattedMsg.comparedScans = compareScanData;
                }
                
                // Mark first assistant message as comparison if it contains comparison content
                if (msg.role === 'assistant' && index === 0 && !compareScanData) {
                  if (msg.content && (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))) {
                    formattedMsg.isComparison = true;
                  }
                }
                
                return formattedMsg;
              });
              setMessages(formattedMessages);
              setShowChat(true);
            }
            
            // console.log('📱 Loaded current compare chat from backend:', currentChatId);
            return;
          }
        }
        
        // Load the compare chat from localStorage (for local compare chats)
        const savedCompareChats = JSON.parse(await AsyncStorage.getItem('compare_chats') || '[]');
        const currentChat = savedCompareChats.find(chat => chat.id === currentChatId);
        if (currentChat) {
          setCurrentCompareChat(currentChat);
          setChatId(currentChat.id);
          setComparisonResult({ answer: currentChat.result || '' });
          
          // Load messages from the compare chat (same as web frontend)
          if (currentChat.messages && currentChat.messages.length > 0) {
            setMessages(currentChat.messages);
            setShowChat(true);
          }
          
          // console.log('📱 Loaded current compare chat from localStorage:', currentChat.id);
        }
      }
    } catch (error) {
      // console.error('❌ Error loading current compare chat:', error);
    }
  };

  // Handle loading compare from HistoryScreen navigation
  useEffect(() => {
    if (route?.params?.loadCompare) {
      const compareToLoad = route.params.loadCompare;
      
      // Find the compare in recentCompares or create a compare object
      const compare = recentCompares.find(c => 
        (c.id === compareToLoad.id || c.chatId === compareToLoad.id)
      ) || {
        id: compareToLoad.id,
        chatId: compareToLoad.id,
        title: compareToLoad.title || 'Comparison',
        source: compareToLoad.source || 'backend',
        date: new Date().toLocaleDateString(),
        createdAt: new Date().toISOString()
      };
      
      // Load the compare using handleRecentComparePress
      handleRecentComparePress(compare);
      
      // Clear the param after loading
      navigation.setParams({ loadCompare: undefined });
    }
  }, [route?.params?.loadCompare, recentCompares, handleRecentComparePress, navigation]);

  // Reload recent compares when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // console.log('🔄 Screen focused, reloading recent compares...');
      loadRecentCompares();
    }, [])
  );

  // Pull to refresh functionality
  const onRefresh = React.useCallback(async () => {
    // console.log('🔄 Pull to refresh triggered');
    setRefreshing(true);
    try {
      await Promise.all([
        loadScans(),
        loadRecentCompares()
      ]);
    } catch (error) {
      // console.log('❌ Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Function to reset/clear comparison state (same as web app startNewChat for compare)
  const resetComparison = React.useCallback(() => {
    setFirstListing(null);
    setSecondListing(null);
    setComparisonQuestion('');
    setMessages([]);
    setComparisonResult(null);
    setChatId(null);
    setCurrentCompareChat(null);
    setComparing(false);
    setQuestion('');
    setIsAsking(false);
  }, []);

  // Handle reset parameter (when Compare tab is pressed while already focused)
  // Using timestamp to ensure the effect triggers every time
  useEffect(() => {
    const resetParam = route?.params?.reset;
    const timestamp = route?.params?.timestamp;
    
    if (resetParam === true && timestamp) {
      // Only trigger if this is a new timestamp (not a stale navigation)
      if (timestamp !== lastTabPressTime.current) {
        lastTabPressTime.current = timestamp;
        resetComparison();
        // Clear the reset parameter after a short delay to allow the effect to complete
        setTimeout(() => {
          navigation.setParams({ reset: undefined, timestamp: undefined });
        }, 100);
      }
    }
  }, [route?.params?.reset, route?.params?.timestamp, resetComparison, navigation]);

  // Refresh scans and reset comparison when screen comes into focus (same as web app)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if not already loading
      if (!isLoadingRef.current) {
        loadScans();
      }
      
      // If there's an active chat, refresh messages to get latest chat history
      // This ensures that when user navigates back, they see the latest messages
      if (chatId && currentCompareChat && !chatId.startsWith('compare-')) {
        // Only refresh if we have a backend chat (not local)
        const refreshChatMessages = async () => {
          try {
            const { data: chatData, error: chatError } = await apiClient.getChat(chatId);
            if (!chatError && chatData && chatData.messages) {
              // Process and update messages with latest from backend
              const processedMessages = chatData.messages
                .filter((msg) => {
                  if (msg.role === 'user' && msg.content && msg.content.trim() !== '') {
                    return true;
                  }
                  if (msg.role === 'assistant' && msg.content && msg.content.trim() !== '') {
                    return true;
                  }
                  if (msg.role === 'assistant' && msg.content && 
                      (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))) {
                    return true;
                  }
                  return false;
                })
                .map((msg) => {
                  const message = {
                    role: msg.role,
                    content: msg.content || '',
                    timestamp: msg.created_at
                  };
                  
                  if (msg.role === 'user') {
                    message.messageType = "compare";
                  }
                  
                  if (msg.role === 'assistant' && msg.content && 
                      (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))) {
                    message.isComparison = true;
                    
                    // Try to get scan data from currentCompareChat
                    if (currentCompareChat.scan1 && currentCompareChat.scan2) {
                      message.comparedScans = {
                        scan1: currentCompareChat.scan1,
                        scan2: currentCompareChat.scan2
                      };
                      const analysisStart = msg.content.indexOf('Comparative Analysis:');
                      if (analysisStart !== -1) {
                        message.content = msg.content.substring(analysisStart + 'Comparative Analysis:'.length).trim();
                      }
                    }
                  }
                  
                  return message;
                });
              
              // Only update if we have messages (avoid clearing messages if fetch fails)
              if (processedMessages.length > 0) {
                setMessages(processedMessages);
              }
            }
          } catch (e) {
            // Silent error - keep existing messages
          }
        };
        
        refreshChatMessages();
      }
    }, [chatId, currentCompareChat])
  );

  // Add navigation listener to refresh scan balance when leaving compare screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      // Trigger scan balance refresh when leaving compare screen
      // This ensures the scan screen will have the latest balance
      const refreshScanBalanceOnLeave = async () => {
        try {
          await refreshScanBalance();
        } catch (error) {
          // console.error('❌ Error refreshing scan balance when leaving compare screen:', error);
        }
      };
      
      // Refresh scan balance when leaving compare screen
      refreshScanBalanceOnLeave();
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]); // refreshScanBalance is a stable function from context

  const loadScans = async () => {
    if (isLoadingRef.current) return; // Prevent multiple simultaneous calls
    
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await apiClient.getMyScans();
      
      if (error) {
        Alert.alert('Error', 'Failed to load scan history');
        return;
      }
      
      // Filter to show only unique Airbnb links (most recent scan for each URL)
      const uniqueScans = filterUniqueScans(data || []);
      
      // Fetch additional details for each scan to get listing_title and location
      const enrichedScans = await Promise.all(
        uniqueScans.map(async (scan) => {
          try {
            const { data: scanDetails } = await apiClient.request(`/scan/${scan.id}`);
            // console.log(`🔍 COMPARE: Scan ${scan.id} details:`, {
            //   listing_title: scanDetails?.listing_title,
            //   location: scanDetails?.location
            // });
            return {
              ...scan,
              listing_title: scanDetails?.listing_title || "",
              location: scanDetails?.location || ""
            };
          } catch (error) {
            // console.log(`Failed to get details for scan ${scan.id}:`, error);
            return scan; // Return original scan if details fetch fails
          }
        })
      );
      
      setScans(enrichedScans);
    } catch (error) {
      Alert.alert('Error', 'Failed to load scan history');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const filterUniqueScans = (scans) => {
    // Create a map to track unique URLs and keep the most recent scan for each
    const uniqueScansMap = new Map();
    
    scans.forEach(scan => {
      const url = scan.listing_url;
      const existingScan = uniqueScansMap.get(url);
      
      // If no existing scan for this URL, or if current scan is more recent
      if (!existingScan || new Date(scan.created_at) > new Date(existingScan.created_at)) {
        uniqueScansMap.set(url, scan);
      }
    });
    
    // Convert map back to array and sort by creation date (most recent first)
    return Array.from(uniqueScansMap.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const storeComparisonLocally = async (firstListing, secondListing, answer, question) => {
    try {
      // console.log('💾 STORING: Starting to store comparison locally');
      // console.log('💾 STORING: First listing:', firstListing);
      // console.log('💾 STORING: Second listing:', secondListing);
      // console.log('💾 STORING: Answer length:', answer?.length || 0);
      // console.log('💾 STORING: Question:', question);
      
      // Create a more descriptive title
      const firstTitle = firstListing.listing_title || firstListing.listing_url?.split('/rooms/')[1] || 'Listing 1';
      const secondTitle = secondListing.listing_title || secondListing.listing_url?.split('/rooms/')[1] || 'Listing 2';
      
      const comparison = {
        id: `local_${Date.now()}`,
        title: `${firstTitle} vs ${secondTitle}`,
        date: new Date().toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric'
        }),
        firstListing,
        secondListing,
        answer,
        question,
        timestamp: new Date().toISOString()
      };
      
      // console.log('💾 STORING: Created comparison object:', comparison);
      
      // Get existing local comparisons
      const existing = await AsyncStorage.getItem('local_comparisons');
      const comparisons = existing ? JSON.parse(existing) : [];
      
      // console.log('💾 STORING: Existing comparisons count:', comparisons.length);
      
      // Add new comparison at the beginning
      comparisons.unshift(comparison);
      
      // Keep only last 10 comparisons
      const limitedComparisons = comparisons.slice(0, 10);
      
      // console.log('💾 STORING: Final comparisons count:', limitedComparisons.length);
      
      // Save back to storage
      await AsyncStorage.setItem('local_comparisons', JSON.stringify(limitedComparisons));
      
      // console.log('✅ STORING: Successfully stored comparison locally:', comparison.title);
    } catch (error) {
      // console.log('❌ STORING: Error storing comparison locally:', error);
    }
  };

  // Save compare chat to localStorage (same as web frontend)
  const saveCompareChat = async (compareChat) => {
    try {
      const savedCompareChats = JSON.parse(await AsyncStorage.getItem('compare_chats') || '[]');
      const newCompareChats = [compareChat, ...savedCompareChats];
      await AsyncStorage.setItem('compare_chats', JSON.stringify(newCompareChats));
      
      // Save current chat ID (same as web frontend)
      await AsyncStorage.setItem('current_compare_chat_id', compareChat.id);
      
      // console.log('💾 Saved compare chat to localStorage:', compareChat.id);
    } catch (error) {
      // console.error('❌ Error saving compare chat:', error);
    }
  };

  // Load compare chat from localStorage (same as web frontend)
  const loadCompareChat = async (chatId) => {
    try {
      const savedCompareChats = JSON.parse(await AsyncStorage.getItem('compare_chats') || '[]');
      return savedCompareChats.find(chat => chat.id === chatId);
    } catch (error) {
      // console.error('❌ Error loading compare chat:', error);
      return null;
    }
  };

  // Note: AI assistant messages are NOT saved to history (same as web app - only kept in memory)
  // The saveCompareChatMessages function has been removed to match web app behavior

  const loadRecentCompares = async () => {
    try {
      // console.log('🔄 Loading recent compares...');
      
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        // console.log('❌ No auth token found, skipping backend fetch');
        // Still load local comparisons
        await loadLocalCompares();
        return;
      }
      
      // Load backend comparison chats (primary source - stored in user session)
      // console.log('🌐 Fetching chats from backend (user session)...');
      const { data: chats, error } = await apiClient.getChats();
      
      let backendCompares = [];
      if (error) {
        // console.log('❌ Error fetching chats from backend:', error);
        // Still try to load local comparisons
        await loadLocalCompares();
        return;
      }
      
      if (chats && Array.isArray(chats)) {
        // console.log('📋 All chats from backend:', chats);
        // console.log('📋 Total chats count:', chats.length);
        
        // Filter for comparison chats only
        const compareChats = chats.filter(chat => chat.type === 'compare');
        // console.log('🔍 Compare chats found:', compareChats);
        // console.log('🔍 Compare chats count:', compareChats.length);
        
        // Format the data for display (matching web frontend exactly)
        backendCompares = compareChats.map(chat => {
          // console.log('🔄 Processing compare chat:', chat);
          // Match web frontend: chat.title.replace("Compare • ", "")
          const displayTitle = (chat.title || 'Untitled Comparison').replace("Compare • ", "");
          // Match web frontend: new Date(chat.created_at).toLocaleDateString()
          const displayDate = new Date(chat.created_at).toLocaleDateString();
          
          return {
            id: chat.id,
            title: displayTitle,
            date: displayDate,
            source: 'backend',
            chatId: chat.id,
            createdAt: chat.created_at
          };
        });
        
        // console.log('✅ Formatted backend compares:', backendCompares);
      } else {
        // console.log('⚠️ No chats data received from backend or invalid format');
      }
      
      // Load local comparisons
      await loadLocalCompares(backendCompares);
      
    } catch (error) {
      // console.log('❌ Error loading recent compares:', error);
      // Try to load at least local comparisons
      try {
        await loadLocalCompares();
      } catch (localError) {
        // console.log('❌ Error loading local comparisons:', localError);
      }
    }
  };

  const loadLocalCompares = async (backendCompares = []) => {
    try {
      // Load local comparisons as backup (primary source is user session via backend)
      const localComparisons = await AsyncStorage.getItem('local_comparisons');
      // console.log('📱 LOADING: Raw local comparisons from storage (backup):', localComparisons);
      
      const localCompares = localComparisons ? JSON.parse(localComparisons).map(comp => {
        // console.log('📱 LOADING: Processing local comparison:', comp);
        return {
          id: comp.id,
          title: comp.title,
          date: comp.date,
          source: 'local',
          answer: comp.answer,
          firstListing: comp.firstListing,
          secondListing: comp.secondListing,
          question: comp.question,
          createdAt: comp.timestamp
        };
      }) : [];
      
      // console.log('📱 LOADING: Processed local compares:', localCompares);
      
      // Combine and sort by date (most recent first)
      const allCompares = [...backendCompares, ...localCompares]
        .sort((a, b) => {
          // Use createdAt for more accurate sorting
          const dateA = new Date(a.createdAt || a.date);
          const dateB = new Date(b.createdAt || b.date);
          return dateB - dateA;
        });
      
      // console.log('✅ All formatted compares (total:', allCompares.length, '):', allCompares);
      setRecentCompares(allCompares);
    } catch (error) {
      // console.log('❌ Error loading local comparisons:', error);
      // Set empty array if both backend and local fail
      setRecentCompares(backendCompares);
    }
  };

  const handleRecentComparePress = React.useCallback(async (compare) => {
    try {
      // console.log('🔍 RECENT COMPARE: Clicked on:', compare);
      
      // For backend comparisons, we need to fetch the full chat data (same as web frontend)
      if (compare.source === 'backend' && compare.chatId) {
        // console.log('🌐 Fetching full chat data for backend comparison...');
        const { data: chatData, error } = await apiClient.getChat(compare.chatId);
        
        if (error) {
          // console.log('❌ Error fetching chat data:', error);
          Alert.alert('Error', 'Could not load comparison details');
          return;
        }
        
        if (chatData && chatData.chat) {
          // console.log('✅ Chat data fetched:', chatData);
          
          // If it's a compare chat, fetch the scan data for both scans (same as web frontend)
          let compareScanData = null;
          if (chatData.chat.type === 'compare' && chatData.chat.scan_ids && chatData.chat.scan_ids.length >= 2) {
            try {
              // Fetch scan data for both scans using /scan/{scanId} endpoint (same as web frontend)
              const [scan1Result, scan2Result] = await Promise.all([
                apiClient.getScanById(chatData.chat.scan_ids[0]),
                apiClient.getScanById(chatData.chat.scan_ids[1])
              ]);
              
              if (scan1Result.data && scan2Result.data) {
                compareScanData = {
                  scan1: scan1Result.data,
                  scan2: scan2Result.data
                };
              }
            } catch (e) {
              console.error('Failed to load compare scan data:', e);
            }
          }
          
          // Extract URLs from messages if scan data is not available (for fallback)
          let fallbackScan1 = compareScanData?.scan1 || null;
          let fallbackScan2 = compareScanData?.scan2 || null;
          
          // If scan data fetch failed, try to extract URLs from messages
          if (!fallbackScan1 || !fallbackScan2) {
            // Try to find assistant message with comparison content
            const comparisonMessage = (chatData.messages || []).find(msg => 
              msg.role === 'assistant' && 
              msg.content && 
              (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))
            );
            
            if (comparisonMessage) {
              // Improved URL regex that handles URLs on separate lines and various formats
              const urlRegex = /https?:\/\/[^\s\n\)]+/g;
              const urls = comparisonMessage.content.match(urlRegex) || [];
              
              if (urls.length >= 2) {
                // Extract titles from content (handle multi-line titles)
                let title1 = null;
                let title2 = null;
                
                // Match Listing A: followed by title (may be on next line)
                const listingAMatch = comparisonMessage.content.match(/Listing A:\s*\n?([^\n]+)/);
                const listingBMatch = comparisonMessage.content.match(/Listing B:\s*\n?([^\n]+)/);
                
                if (listingAMatch) {
                  title1 = listingAMatch[1].trim();
                }
                if (listingBMatch) {
                  title2 = listingBMatch[1].trim();
                }
                
                // Set fallback scan data with URLs (for fallback to /compare endpoint)
                if (!fallbackScan1) {
                  fallbackScan1 = {
                    listing_url: urls[0],
                    listing_title: title1
                  };
                }
                if (!fallbackScan2) {
                  fallbackScan2 = {
                    listing_url: urls[1],
                    listing_title: title2
                  };
                }
              }
            }
          }
          
          // Set current compare chat for AI questions (same as web frontend)
          const compareChat = {
            id: compare.chatId,
            type: 'compare',
            title: compare.title,
            created_at: chatData.chat.created_at,
            scan1: fallbackScan1,
            scan2: fallbackScan2,
            messages: chatData.messages || []
          };
          setCurrentCompareChat(compareChat);
          setChatId(compareChat.id);
          
          // Save current chat ID (same as web frontend)
          await AsyncStorage.setItem('current_compare_chat_id', compareChat.id);
          
          // Process messages and format them for display (matching web app loadChat)
          // Ensure all user messages (AI questions) are included
          const processedMessages = (chatData.messages || [])
            .filter((msg) => {
              // Include all messages that have content
              // User messages should always be included if they have content
              if (msg.role === 'user' && msg.content && msg.content.trim() !== '') {
                return true;
              }
              // Include assistant messages with content
              if (msg.role === 'assistant' && msg.content && msg.content.trim() !== '') {
                return true;
              }
              // Include assistant messages that are comparison results (even if content is processed)
              if (msg.role === 'assistant' && msg.content && 
                  (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))) {
                return true;
              }
              return false;
            })
            .map((msg, index) => {
              const message = {
                role: msg.role,
                content: msg.content || '',
                timestamp: msg.created_at
              };
              
              // Determine message type for user messages
              if (msg.role === 'user') {
                message.messageType = "compare";
              }
              
              // If this is an assistant message in a compare chat, attach compare scan data
              if (msg.role === 'assistant' && chatData.chat.type === 'compare') {
                // Check if this message contains comparison content
                if (msg.content && (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))) {
                  message.isComparison = true;
                  
                  // If we have scan data, use it
                  if (compareScanData) {
                    message.comparedScans = compareScanData;
                    
                    // Extract just the Comparative Analysis part from content (matching web app)
                    const analysisStart = msg.content.indexOf('Comparative Analysis:');
                    if (analysisStart !== -1) {
                      message.content = msg.content.substring(analysisStart + 'Comparative Analysis:'.length).trim();
                    }
                  } else {
                    // If no scan data, extract URLs and titles from formatted content (matching web app)
                    const urlRegex = /https?:\/\/[^\s]+/g;
                    const urls = msg.content.match(urlRegex) || [];
                    
                    if (urls.length >= 2) {
                      // Extract titles from content
                      let title1 = null;
                      let title2 = null;
                      
                      // Try to extract titles from "Listing A:" and "Listing B:" sections
                      const listingAMatch = msg.content.match(/Listing A:\s*([^\n]+)/);
                      const listingBMatch = msg.content.match(/Listing B:\s*([^\n]+)/);
                      
                      if (listingAMatch) {
                        title1 = listingAMatch[1].trim();
                      }
                      if (listingBMatch) {
                        title2 = listingBMatch[1].trim();
                      }
                      
                      message.comparedScans = {
                        scan1: {
                          listing_url: urls[0],
                          listing_title: title1
                        },
                        scan2: {
                          listing_url: urls[1],
                          listing_title: title2
                        }
                      };
                      
                      // Extract just the Comparative Analysis part from content (matching web app)
                      const analysisStart = msg.content.indexOf('Comparative Analysis:');
                      if (analysisStart !== -1) {
                        message.content = msg.content.substring(analysisStart + 'Comparative Analysis:'.length).trim();
                      }
                    }
                  }
                }
              }
              
              return message;
            });
          
          // Set messages to display chat history (matching web app)
          setMessages(processedMessages);
          
        } else {
          Alert.alert('Error', 'No comparison data found');
        }
      } else {
        // For local comparisons, we already have all the data
        // console.log('📱 Using local comparison data');
        
        // Set current compare chat for AI questions (same as web frontend)
        setCurrentCompareChat(compare);
        setChatId(compare.id);
        
        // Save current chat ID (same as web frontend)
        await AsyncStorage.setItem('current_compare_chat_id', compare.id);
        
        // Format local comparison messages (matching web app format)
        const localMessages = [];
        
        // Add user message
        if (compare.firstListing && compare.secondListing) {
          localMessages.push({
            role: "user",
            content: `Compare these listings`,
            messageType: "compare",
            timestamp: compare.createdAt
          });
        }
        
        // Add assistant message with comparison result
        if (compare.answer) {
          localMessages.push({
            role: "assistant",
            content: compare.answer,
            isComparison: true,
            comparedScans: {
              scan1: compare.firstListing,
              scan2: compare.secondListing
            },
            timestamp: compare.createdAt
          });
        }
        
        // Add follow-up prompt
        localMessages.push({
          role: "assistant",
          content: "Do you have any question...",
          timestamp: compare.createdAt
        });
        
        // Set messages to display chat history (matching web app)
        setMessages(localMessages);
      }
      
    } catch (error) {
      // console.log('❌ RECENT COMPARE: Error loading comparison chat:', error);
      Alert.alert('Error', 'Could not load comparison chat history');
    }
  }, [navigation]);

  // Helper function to load compare with provided chat messages (from HistoryScreen)
  const loadCompareWithMessages = React.useCallback(async (compare, chatMessages) => {
    try {
      if (!chatMessages || chatMessages.length === 0) {
        // If no messages provided, fall back to handleRecentComparePress
        await handleRecentComparePress(compare);
        return;
      }

      // For backend comparisons, fetch scan data if available
      let compareScanData = null;
      if (compare.source === 'backend' && compare.chatId) {
        try {
          const { data: chatData } = await apiClient.getChat(compare.chatId);
          if (chatData && chatData.chat && chatData.chat.type === 'compare' && chatData.chat.scan_ids && chatData.chat.scan_ids.length >= 2) {
            try {
              const [scan1Result, scan2Result] = await Promise.all([
                apiClient.getScanById(chatData.chat.scan_ids[0]),
                apiClient.getScanById(chatData.chat.scan_ids[1])
              ]);
              
              if (scan1Result.data && scan2Result.data) {
                compareScanData = {
                  scan1: scan1Result.data,
                  scan2: scan2Result.data
                };
              }
            } catch (e) {
              console.error('Failed to load compare scan data:', e);
            }
          }
        } catch (e) {
          // Silent error - continue without scan data
        }
      }

      // Extract URLs from messages if scan data is not available
      let fallbackScan1 = compareScanData?.scan1 || null;
      let fallbackScan2 = compareScanData?.scan2 || null;

      if (!fallbackScan1 || !fallbackScan2) {
        const comparisonMessage = chatMessages.find(msg => 
          msg.role === 'assistant' && 
          msg.content && 
          (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))
        );
        
        if (comparisonMessage) {
          const urlRegex = /https?:\/\/[^\s\n\)]+/g;
          const urls = comparisonMessage.content.match(urlRegex) || [];
          
          if (urls.length >= 2) {
            const listingAMatch = comparisonMessage.content.match(/Listing A:\s*\n?([^\n]+)/);
            const listingBMatch = comparisonMessage.content.match(/Listing B:\s*\n?([^\n]+)/);
            
            if (!fallbackScan1) {
              fallbackScan1 = {
                listing_url: urls[0],
                listing_title: listingAMatch ? listingAMatch[1].trim() : null
              };
            }
            if (!fallbackScan2) {
              fallbackScan2 = {
                listing_url: urls[1],
                listing_title: listingBMatch ? listingBMatch[1].trim() : null
              };
            }
          }
        }
      }

      // Set current compare chat
      const compareChat = {
        id: compare.chatId || compare.id,
        type: 'compare',
        title: compare.title,
        created_at: new Date().toISOString(),
        scan1: fallbackScan1,
        scan2: fallbackScan2,
        messages: chatMessages
      };
      setCurrentCompareChat(compareChat);
      setChatId(compareChat.id);

      // Save current chat ID
      await AsyncStorage.setItem('current_compare_chat_id', compareChat.id);

      // Process messages and format them for display (same logic as handleRecentComparePress)
      const processedMessages = chatMessages
        .filter((msg) => {
          if (msg.role === 'user' && msg.content && msg.content.trim() !== '') {
            return true;
          }
          if (msg.role === 'assistant' && msg.content && msg.content.trim() !== '') {
            return true;
          }
          if (msg.role === 'assistant' && msg.content && 
              (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))) {
            return true;
          }
          return false;
        })
        .map((msg) => {
          const message = {
            role: msg.role,
            content: msg.content || '',
            timestamp: msg.created_at
          };
          
          if (msg.role === 'user') {
            message.messageType = "compare";
          }
          
          if (msg.role === 'assistant' && msg.content && 
              (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))) {
            message.isComparison = true;
            
            if (compareScanData) {
              message.comparedScans = compareScanData;
              const analysisStart = msg.content.indexOf('Comparative Analysis:');
              if (analysisStart !== -1) {
                message.content = msg.content.substring(analysisStart + 'Comparative Analysis:'.length).trim();
              }
            } else if (fallbackScan1 && fallbackScan2) {
              message.comparedScans = {
                scan1: fallbackScan1,
                scan2: fallbackScan2
              };
              const analysisStart = msg.content.indexOf('Comparative Analysis:');
              if (analysisStart !== -1) {
                message.content = msg.content.substring(analysisStart + 'Comparative Analysis:'.length).trim();
              }
            }
          }
          
          return message;
        });

      setMessages(processedMessages);
    } catch (error) {
      console.error('Error loading compare with messages:', error);
      Alert.alert('Error', 'Could not load comparison chat history');
    }
  }, [handleRecentComparePress]);

  // Handle loading compare from HistoryScreen navigation
  useEffect(() => {
    if (route?.params?.loadCompare) {
      const compareToLoad = route.params.loadCompare;
      
      // Always fetch fresh messages from backend to ensure we have the latest chat history
      // This is important because user may have sent new messages in a previous session
      const loadCompareWithFreshMessages = async () => {
        const compare = recentCompares.find(c => c.id === compareToLoad.id || c.chatId === compareToLoad.id) || {
          id: compareToLoad.id,
          chatId: compareToLoad.id,
          title: compareToLoad.title || 'Comparison',
          source: compareToLoad.source || 'backend',
          date: new Date().toLocaleDateString(),
          createdAt: new Date().toISOString()
        };
        
        // Always fetch fresh chat messages from backend (don't rely on passed messages)
        if (compareToLoad.id && compareToLoad.source === 'backend') {
          try {
            const { data: chatData, error: chatError } = await apiClient.getChat(compareToLoad.id);
            if (!chatError && chatData && chatData.messages) {
              // Use fresh messages from backend
              await loadCompareWithMessages(compare, chatData.messages);
            } else if (compareToLoad.chatMessages && compareToLoad.chatMessages.length > 0) {
              // Fallback to provided messages if backend fetch fails
              await loadCompareWithMessages(compare, compareToLoad.chatMessages);
            } else {
              // No messages available, use handleRecentComparePress
              await handleRecentComparePress(compare);
            }
          } catch (e) {
            // If fetch fails, use provided messages or fallback to handleRecentComparePress
            if (compareToLoad.chatMessages && compareToLoad.chatMessages.length > 0) {
              await loadCompareWithMessages(compare, compareToLoad.chatMessages);
            } else {
              await handleRecentComparePress(compare);
            }
          }
        } else {
          // For local compares or if no chatId, use provided messages or handleRecentComparePress
          if (compareToLoad.chatMessages && compareToLoad.chatMessages.length > 0) {
            await loadCompareWithMessages(compare, compareToLoad.chatMessages);
          } else {
            await handleRecentComparePress(compare);
          }
        }
        
        // Clear the param after loading
        navigation.setParams({ loadCompare: undefined });
      };
      
      loadCompareWithFreshMessages();
    }
  }, [route?.params?.loadCompare, recentCompares, handleRecentComparePress, loadCompareWithMessages, navigation]);

  const handleCompare = async () => {
    // Check if user has at least 2 scans before allowing comparison (same as web app)
    if (scans.length < 2) {
      Alert.alert(
        'Insufficient Scans',
        'Please scan at least 2 listings first before you can compare them.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Check if user has sufficient balance for comparison (requires 1 full scan)
    if (scanBalance?.remaining < 1.0) {
      Alert.alert(
        'Insufficient Scans', 
        'You don\'t have enough scans remaining. Please upgrade your plan to continue comparing.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Upgrade Now', style: 'default', onPress: () => navigation.navigate('PlanStatus') }
        ]
      );
      return;
    }

    if (!firstListing || !secondListing) {
      Alert.alert('Error', 'Please select both listings to compare');
      return;
    }

    // Check if same listing is selected (same as web app - prevent comparing same listing)
    if (firstListing.id === secondListing.id || 
        firstListing.listing_url === secondListing.listing_url ||
        (firstListing.listing_title && secondListing.listing_title && 
         firstListing.listing_title === secondListing.listing_title)) {
      Alert.alert(
        'Cannot Compare',
        'You cannot compare the same listing. Please select two different listings.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (comparing) {
      return;
    }

    setComparing(true);
    setComparisonResult(null);

    // Add typing indicator for comparison processing
    const typingIndicator = { 
      role: "assistant", 
      content: "", 
      isTyping: true 
    };
    setMessages([typingIndicator]);

    try {
      // console.log('🔍 COMPARE: Sending URLs to backend:');
      // console.log('🔍 COMPARE: First URL:', firstListing.listing_url);
      // console.log('🔍 COMPARE: Second URL:', secondListing.listing_url);
      
        // Use the working compare endpoint (same as web version)
        const { data, error } = await apiClient.compareListings(
          firstListing.listing_url, 
          secondListing.listing_url, 
          comparisonQuestion || null
        );
      
      
      if (error) {
        
        if (error.includes('Limit reached') || error.includes('402')) {
          Alert.alert(
            "Comparison Limit Reached",
            "You've reached your comparison limit. Consider upgrading to Premium for more comparisons.",
            [
              { text: "Upgrade", onPress: () => navigation.navigate('Upgrade') },
              { text: "Cancel", style: "cancel" }
            ]
          );
        } else if (error.includes('Please scan both listings first')) {
          Alert.alert(
            "Listings Not Scanned",
            "Please scan both listings first before comparing them.",
            [
              { text: "Go to Scan", onPress: () => navigation.navigate('Scan') },
              { text: "Cancel", style: "cancel" }
            ]
          );
        } else {
          Alert.alert("Comparison Failed", error);
        }
        return;
      }

      if (data && data.answer) {
        // Save the compare result to the database (matching web frontend)
        let newChatId = `compare-${Date.now()}`;
        try {
          const { data: saveData, error: saveError } = await apiClient.saveCompare(
            firstListing.listing_url,
            secondListing.listing_url,
            data.answer,
            comparisonQuestion || null
          );
          
          if (saveData && !saveError && saveData.chat_id) {
            newChatId = saveData.chat_id;
          }
        } catch (saveError) {
          // Continue with local storage if save fails
        }
        
        // Store comparison locally as backup (main storage is now in user session)
        storeComparisonLocally(firstListing, secondListing, data.answer, comparisonQuestion);
        
        // Deduct 1 scan for the comparison first
        await deductComparisonScan();
        
        // Refresh scan balance immediately after comparison (same as web app)
        try {
          await refreshScanBalance();
        } catch (error) {
          // Silent error handling
        }
        
        // Create compare chat entry (same as web frontend)
        const compareChat = {
          id: newChatId, // Use saved chat_id from backend if available
          type: 'compare',
          title: `${firstListing.listing_title || firstListing.location} vs ${secondListing.listing_title || secondListing.location}`,
          created_at: new Date().toISOString(),
          scan1: firstListing,
          scan2: secondListing,
          result: data.answer,
          messages: [
            {
              type: "user",
              text: comparisonQuestion ? `Compare these listings: ${comparisonQuestion}` : "Compare these listings",
              id: `user-${Date.now()}`,
              timestamp: new Date().toISOString()
            },
            {
              type: "bot",
              text: data.answer,
              id: `bot-${Date.now() + 1}`,
              timestamp: new Date().toISOString(),
              isComparison: true
            },
            {
              type: "bot",
              text: "Do you have any question...",
              id: `bot-${Date.now() + 2}`,
              timestamp: new Date().toISOString()
            }
          ]
        };
        
        // Save compare chat to localStorage
        await saveCompareChat(compareChat);
        
        // Set current compare chat for AI questions
        setCurrentCompareChat(compareChat);
        setChatId(compareChat.id);
        
        // Set comparison result after scan deduction to avoid race conditions
        setComparisonResult({ answer: data.answer });
        
        // Add messages to display comparison result (matching web app)
        const userMessage = {
          role: "user",
          // content: `Compare: ${compare.firstListing.listing_title || compare.firstListing.location} vs ${compare.secondListing.listing_title || compare.secondListing.location}`,
          content: comparisonQuestion 
            ? `Compare these listings. ${comparisonQuestion}`
            : `Compare these listings`,
          messageType: "compare"
        };
        
        const assistantMessage = {
          role: "assistant",
          content: data.answer,
          isComparison: true,
          comparedScans: {
            scan1: firstListing,
            scan2: secondListing
          }
        };
        
        // Remove typing indicator and add messages
        const postCompareMessage = {
          role: "assistant",
          content: "Do you have any question..."
        };
        
        setMessages(prev => {
          const filtered = prev.filter(msg => !msg.isTyping);
          return [userMessage, assistantMessage, postCompareMessage];
        });
        
        // Reload recent compares after successful comparison to show the new comparison
        loadRecentCompares();
      } else {
        Alert.alert('Error', 'No comparison result received');
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setComparing(false);
    }
  };

  const selectListing = (listing, type) => {
    
    if (type === 'first') {
      setFirstListing(listing);
      setShowFirstDropdown(false);
    } else {
      setSecondListing(listing);
      setShowSecondDropdown(false);
    }
    
    // Clear comparison result when selecting new listings
    setComparisonResult(null);
  };

  const formatListingDisplay = (listing) => {
    if (!listing) return 'Select a listing';
    
    // Match web frontend format: listing_title || location || listing_url (same as web frontend)
    const displayTitle = listing.listing_title || 
                        listing.location || 
                        (listing.listing_url ? listing.listing_url.replace("https://www.airbnb.com/rooms/", "Room ") : `Room ${listing.id || 'Unknown'}`);
    
    return displayTitle;
  };

  // Render answer text with clickable URLs (matching web app)
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

  // Render message (matching web app format)
  const renderMessage = (message, index) => {
    const isUser = message.role === "user";
    const isError = message.isError;
    const isTyping = message.isTyping;
    const isComparison = message.isComparison && message.comparedScans;
    const isPostCompareMessage = !isUser && !isError && message.content && 
      message.content.includes("Do you have any question");
    
    return (
      <View key={index} style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.assistantMessageBubble,
          isError && styles.errorMessageBubble,
          isPostCompareMessage && styles.postCompareMessageBubble
        ]}>
          {isTyping ? (
            <TypingIndicator />
          ) : !isUser && !isError && isComparison ? (
            // Comparison result display (matching web app)
            <View style={styles.comparisonResultContainer}>
              {/* Listing A Information */}
              <View style={styles.listingInfoSection}>
                <Text style={styles.listingLabel}>
                  Listing A: {message.comparedScans.scan1.listing_title || 'Title not available'}
                </Text>
                {message.comparedScans.scan1.listing_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(message.comparedScans.scan1.listing_url)}>
                    <Text style={styles.listingUrl}>{message.comparedScans.scan1.listing_url}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Listing B Information */}
              <View style={styles.listingInfoSection}>
                <Text style={styles.listingLabel}>
                  Listing B: {message.comparedScans.scan2.listing_title || 'Title not available'}
                </Text>
                {message.comparedScans.scan2.listing_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(message.comparedScans.scan2.listing_url)}>
                    <Text style={styles.listingUrl}>{message.comparedScans.scan2.listing_url}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Comparative Analysis */}
              <View style={styles.analysisSection}>
                <Text style={styles.analysisTitle}>Comparative Analysis</Text>
                <View style={styles.analysisContent}>
                  {renderAnswerText(message.content)}
                </View>
              </View>
            </View>
          ) : (
            // Regular message text (matching web app whitespace-pre-wrap)
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

  // AI Assistant Functions
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  // Function to manually deduct 1 scan from local balance (for comparison)
  const deductComparisonScan = async () => {
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
      
      // Deduct 1 scan for comparison, but don't exceed the total limit
      const newUsed = Math.min(totalLimit, balance.used + 1);
      const newRemaining = Math.max(0, totalLimit - newUsed);
      
      const updatedBalance = {
        ...balance,
        remaining: newRemaining,
        used: newUsed
      };
      
      // Save updated balance to AsyncStorage
      await AsyncStorage.setItem('user_scan_balance', JSON.stringify(updatedBalance));
      
      // console.log('✅ Deducted 1 scan for comparison. New remaining:', newRemaining);
      // console.log('📊 Updated balance saved to AsyncStorage:', updatedBalance);
      
      // Refresh scan balance from backend immediately
      try {
        await refreshScanBalance();
        // console.log('✅ Scan balance refreshed successfully after comparison');
      } catch (error) {
        // console.error('❌ Error refreshing scan balance after comparison:', error);
        // Don't throw error, just log it - the local balance is already updated
      }
      
      return updatedBalance;
    } catch (error) {
      // console.error('❌ Error deducting comparison scan from balance:', error);
      return null;
    }
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
      
      // Force refresh user data to update the auth context
      if (refreshUser) {
        // console.log('🔄 Forcing refresh of user data...');
        await refreshUser();
        // console.log('✅ User data refreshed successfully');
      }
      
      return updatedBalance;
    } catch (error) {
      // console.error('❌ Error deducting scan from balance:', error);
      return null;
    }
  };

  const generateAIResponse = (question, comparisonData) => {
    const questionLower = question.toLowerCase();
    
    // Extract information from comparison data
    const firstTitle = comparisonData?.firstListing?.listing_title || "First listing";
    const secondTitle = comparisonData?.secondListing?.listing_title || "Second listing";
    const answer = comparisonData?.answer || "comparison analysis";
    
    // Generate contextual responses based on question
    if (questionLower.includes('price') || questionLower.includes('cost') || questionLower.includes('expensive')) {
      return `Based on the comparison between ${firstTitle} and ${secondTitle}, I can help you understand the pricing differences. The comparison analysis shows: ${answer.substring(0, 200)}... Would you like me to elaborate on any specific pricing aspects?`;
    }
    
    if (questionLower.includes('location') || questionLower.includes('area') || questionLower.includes('neighborhood')) {
      return `Regarding the location comparison between ${firstTitle} and ${secondTitle}, the analysis indicates: ${answer.substring(0, 200)}... Both properties have their unique location advantages. Would you like more details about the neighborhood characteristics?`;
    }
    
    if (questionLower.includes('amenities') || questionLower.includes('facilities') || questionLower.includes('features')) {
      return `The amenities comparison shows interesting differences between ${firstTitle} and ${secondTitle}. Based on the analysis: ${answer.substring(0, 200)}... Each property offers distinct features that might suit different needs. What specific amenities are you most interested in?`;
    }
    
    if (questionLower.includes('recommend') || questionLower.includes('should i') || questionLower.includes('which one')) {
      return `Based on the comprehensive comparison between ${firstTitle} and ${secondTitle}, here's what the analysis suggests: ${answer.substring(0, 200)}... The recommendation depends on your specific needs and preferences. What's most important to you in your stay?`;
    }
    
    if (questionLower.includes('difference') || questionLower.includes('compare') || questionLower.includes('versus')) {
      return `The key differences between ${firstTitle} and ${secondTitle} are highlighted in the comparison: ${answer.substring(0, 200)}... Each property has distinct advantages. Would you like me to focus on any particular aspect of the comparison?`;
    }
    
    // Default response for general questions
    return `I can help you understand the comparison between ${firstTitle} and ${secondTitle}. The analysis shows: ${answer.substring(0, 200)}... What specific aspect of this comparison would you like to explore further?`;
  };

  const handleSend = async () => {
    if (!question.trim() || isAsking) {
      return;
    }

    // Check if we have an active chat (matching web app - checks currentChatId)
    // For compare chats, we need either chatId (backend chat) or currentCompareChat (local chat)
    if (!chatId && !currentCompareChat) {
      Alert.alert(
        "No Comparison Available", 
        "Please complete a comparison first before asking questions."
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
    
    // Add user message immediately (matching web app format)
    const userQuestion = question.trim();
    const updatedMessages = [...messages, { 
      role: "user", 
      content: userQuestion,
      messageType: "question"
    }];
    setMessages(updatedMessages);
    setQuestion("");
    setIsAsking(true);
    
    // Auto-scroll to bottom when new message is added
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
      // Same logic as web app frontend (ChatInterface.jsx)
      // Check if this is a local compare chat (starts with 'compare-')
      if (chatId && chatId.startsWith('compare-') && currentCompareChat && currentCompareChat.scan1 && currentCompareChat.scan2) {
        // For local compare chat questions, call the /compare endpoint (same as web app)
        try {
          const firstUrl = currentCompareChat.scan1.listing_url || currentCompareChat.scan1.link || currentCompareChat.scan1.url;
          const secondUrl = currentCompareChat.scan2.listing_url || currentCompareChat.scan2.link || currentCompareChat.scan2.url;
          
          if (!firstUrl || !secondUrl) {
            throw new Error('Missing listing URLs for comparison');
          }
          
          const { data, error } = await apiClient.compareListings(
            firstUrl,
            secondUrl,
            userQuestion
          );
          
          if (error) {
            // Remove typing indicator and add error message
            const errorMessage = { 
              role: "assistant", 
              content: `Sorry, I encountered an error: ${error}. Please try again.`,
              isError: true
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, errorMessage];
            });
            setIsAsking(false); // Hide typing indicator immediately after error
          } else if (data && data.answer) {
            // Remove typing indicator and add assistant response
            const assistantMessage = { 
              role: "assistant", 
              content: data.answer
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, assistantMessage];
            });
            setIsAsking(false); // Hide typing indicator immediately after response
            
            // /compare endpoint automatically deducts 0.5 scans from backend (same as web app)
            await deductScanFromBalance();
            
            // Refresh scan balance from backend immediately (same as web app)
            try {
              await refreshScanBalance();
            } catch (error) {
              // console.error('❌ Error refreshing scan balance after AI chat:', error);
            }
          } else {
            // Remove typing indicator and add error message
            const errorMessage = { 
              role: "assistant", 
              content: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
              isError: true
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, errorMessage];
            });
            setIsAsking(false); // Hide typing indicator immediately after error
          }
        } catch (apiError) {
          // Remove typing indicator and add error message
          const errorMessage = { 
            role: "assistant", 
            content: `Sorry, I encountered an error: ${apiError.message || apiError}. Please try again.`,
            isError: true
          };
          setMessages(prev => {
            const filtered = prev.filter(msg => !msg.isTyping);
            return [...filtered, errorMessage];
          });
          setIsAsking(false); // Hide typing indicator immediately after error
        }
      } else if (chatId && !chatId.startsWith('compare-')) {
        // Use backend chat system for non-local chats (same as web app)
        // This handles both scan chats and backend compare chats
        try {
          const { data, error } = await apiClient.askChatQuestion(chatId, userQuestion);
          
          if (error) {
            // Handle API errors - extract meaningful error message
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            const errorString = typeof error === 'string' ? error : (error?.message || String(error));
            const isInternalServerError = errorString.includes('Internal Server Error') || 
                                        errorString.includes('500') ||
                                        errorString.includes('internal server error');
            
            if (isInternalServerError) {
              // For Internal Server Error in compare chats, try fallback to /compare endpoint
              // First try to get URLs from currentCompareChat.scan1/scan2, then from messages
              let firstUrl = null;
              let secondUrl = null;
              
              // Try to get URLs from currentCompareChat.scan1 and scan2
              if (currentCompareChat && currentCompareChat.scan1 && currentCompareChat.scan2) {
                firstUrl = currentCompareChat.scan1.listing_url || 
                          currentCompareChat.scan1.link || 
                          currentCompareChat.scan1.url;
                secondUrl = currentCompareChat.scan2.listing_url || 
                           currentCompareChat.scan2.link || 
                           currentCompareChat.scan2.url;
              }
              
              // If URLs not found, try to extract from currentCompareChat.messages
              if ((!firstUrl || !secondUrl) && currentCompareChat && currentCompareChat.messages) {
                const comparisonMessage = currentCompareChat.messages.find(msg => 
                  msg.role === 'assistant' && 
                  msg.content && 
                  (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))
                );
                
                if (comparisonMessage) {
                  const urlRegex = /https?:\/\/[^\s\n]+/g;
                  const urls = comparisonMessage.content.match(urlRegex) || [];
                  if (urls.length >= 2) {
                    if (!firstUrl) firstUrl = urls[0];
                    if (!secondUrl) secondUrl = urls[1];
                  }
                }
              }
              
              // If URLs still not found, try to extract from current messages state
              if ((!firstUrl || !secondUrl) && messages && messages.length > 0) {
                const comparisonMessage = messages.find(msg => 
                  msg.role === 'assistant' && 
                  msg.content && 
                  (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:') || msg.isComparison)
                );
                
                if (comparisonMessage) {
                  // Try to get URLs from comparedScans first
                  if (comparisonMessage.comparedScans) {
                    if (!firstUrl) {
                      firstUrl = comparisonMessage.comparedScans.scan1?.listing_url || 
                                comparisonMessage.comparedScans.scan1?.link ||
                                comparisonMessage.comparedScans.scan1?.url;
                    }
                    if (!secondUrl) {
                      secondUrl = comparisonMessage.comparedScans.scan2?.listing_url || 
                                 comparisonMessage.comparedScans.scan2?.link ||
                                 comparisonMessage.comparedScans.scan2?.url;
                    }
                  }
                  
                  // If still not found, extract from message content
                  if ((!firstUrl || !secondUrl) && comparisonMessage.content) {
                    const urlRegex = /https?:\/\/[^\s\n]+/g;
                    const urls = comparisonMessage.content.match(urlRegex) || [];
                    if (urls.length >= 2) {
                      if (!firstUrl) firstUrl = urls[0];
                      if (!secondUrl) secondUrl = urls[1];
                    }
                  }
                }
              }
              
              // If we have both URLs, try fallback to /compare endpoint
              if (firstUrl && secondUrl) {
                try {
                  console.log('🔄 Attempting fallback to /compare endpoint with URLs:', { firstUrl, secondUrl });
                  
                  // Fallback to /compare endpoint (same as web app for local compare chats)
                  const { data: compareData, error: compareError } = await apiClient.compareListings(
                    firstUrl,
                    secondUrl,
                    userQuestion
                  );
                  
                  if (!compareError && compareData && compareData.answer) {
                    // Success with fallback - remove typing indicator and add response
                    console.log('✅ Fallback to /compare endpoint succeeded');
                    const assistantMessage = { 
                      role: "assistant", 
                      content: compareData.answer
                    };
                    setMessages(prev => {
                      const filtered = prev.filter(msg => !msg.isTyping);
                      return [...filtered, assistantMessage];
                    });
                    setIsAsking(false); // Hide typing indicator immediately after response
                    
                    await deductScanFromBalance();
                    try {
                      await refreshScanBalance();
                    } catch (error) {
                      // Silent error
                    }
                    return; // Exit early on success
                  } else {
                    console.error('❌ Fallback /compare endpoint returned error:', compareError);
                  }
                } catch (fallbackError) {
                  // Fallback also failed, continue with error message
                  console.error('❌ Fallback /compare also failed:', fallbackError);
                }
              } else {
                console.error('❌ Could not extract URLs for fallback:', { 
                  firstUrl, 
                  secondUrl, 
                  hasCurrentCompareChat: !!currentCompareChat,
                  hasMessages: !!messages && messages.length > 0
                });
              }
              
              errorMessage = 'Sorry, the server encountered an error processing your question. Please try again in a moment.';
            } else {
              errorMessage = `Sorry, I encountered an error: ${errorString}`;
            }
            
            const newMessages = [...updatedMessages, { 
              role: "assistant", 
              content: errorMessage,
              isError: true
            }];
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, { 
                role: "assistant", 
                content: errorMessage,
                isError: true
              }];
            });
            setIsAsking(false); // Hide typing indicator immediately after error
          } else if (data && data.answer) {
            // Remove typing indicator and add backend AI response
            const assistantMessage = { 
              role: "assistant", 
              content: data.answer
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, assistantMessage];
            });
            setIsAsking(false); // Hide typing indicator immediately after response
            
            // Backend chat system automatically saves messages to database (same as web app)
            // Deduct 0.5 scans from local balance after successful AI chat
            await deductScanFromBalance();
            
            // Refresh scan balance from backend immediately (same as web app)
            try {
              await refreshScanBalance();
            } catch (error) {
              // console.error('❌ Error refreshing scan balance after AI chat:', error);
            }
          } else {
            // Remove typing indicator and add fallback error message
            const errorMessage = { 
              role: "assistant", 
              content: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
              isError: true
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, errorMessage];
            });
            setIsAsking(false); // Hide typing indicator immediately after error
          }
        } catch (apiError) {
          // Handle unexpected errors - remove typing indicator and add error
          console.error('Error asking chat question:', apiError);
          const errorMsg = apiError.message || 'Sorry, I encountered an unexpected error. Please try again.';
          const errorMessage = { 
            role: "assistant", 
            content: errorMsg,
            isError: true
          };
          setMessages(prev => {
            const filtered = prev.filter(msg => !msg.isTyping);
            return [...filtered, errorMessage];
          });
          setIsAsking(false); // Hide typing indicator immediately after error
        }
      } else if (comparisonResult && firstListing && secondListing) {
        // Use /compare endpoint for AI chat questions (same as recent compare)
        try {
          // Extract URLs from listing objects (same as recent compare)
          const firstUrl = firstListing.listing_url || firstListing.link || firstListing.url;
          const secondUrl = secondListing.listing_url || secondListing.link || secondListing.url;
          
          if (!firstUrl || !secondUrl) {
            throw new Error('Missing listing URLs for comparison');
          }
          
          const { data, error } = await apiClient.compareListings(
            firstUrl,
            secondUrl,
            userQuestion
          );
          
          if (error) {
            // Handle API errors with more specific error handling
            console.error('❌ Compare API Error:', error);
            console.error('❌ Request URLs:', { firstUrl, secondUrl });
            console.error('❌ Question:', userQuestion);
            
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            if (typeof error === 'string') {
              errorMessage = `Sorry, I encountered an error: ${error}`;
            } else if (error && error.message) {
              errorMessage = `Sorry, I encountered an error: ${error.message}`;
            }
            
            // Remove typing indicator and add error message
            const errorMsg = { 
              role: "assistant", 
              content: errorMessage,
              isError: true
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, errorMsg];
            });
            setIsAsking(false); // Hide typing indicator immediately after error
          } else if (data && data.answer) {
            // Remove typing indicator and add backend AI response
            const assistantMessage = { 
              role: "assistant", 
              content: data.answer
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, assistantMessage];
            });
            setIsAsking(false); // Hide typing indicator immediately after response
            
            // /compare endpoint automatically deducts 0.5 scans from backend (same as web app)
            // Deduct 0.5 scans from local balance after successful AI chat
            await deductScanFromBalance();
            
            // Refresh scan balance from backend immediately
            try {
              await refreshScanBalance();
            } catch (error) {
              // console.error('❌ Error refreshing scan balance after AI chat:', error);
            }
          } else {
            // Fallback response if no answer in data
            const newMessages = [...updatedMessages, { 
              role: "assistant", 
              content: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
              isError: true
            }];
            setMessages(newMessages);
            setIsAsking(false); // Hide typing indicator immediately after error
          }
        } catch (apiError) {
          console.error('❌ Error with /compare endpoint:', apiError);
          
          // Show user-friendly error message
          const errorMessages = [...updatedMessages, { 
            role: "assistant", 
            content: "I'm having trouble connecting to the AI service right now. Let me try a different approach...",
            isError: true
          }];
          setMessages(errorMessages);
          setIsAsking(false); // Hide typing indicator immediately after error
          
          // Fallback to local AI response after a short delay (same as recent compare)
          setTimeout(async () => {
            const comparisonDataForLocal = {
              firstListing: firstListing,
              secondListing: secondListing,
              answer: comparisonResult.answer,
              question: comparisonQuestion
            };
            
            const aiResponse = generateAIResponse(userQuestion, comparisonDataForLocal);
            // Remove typing indicator and add fallback response
            const fallbackMessage = { 
              role: "assistant", 
              content: aiResponse
            };
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isTyping);
              return [...filtered, fallbackMessage];
            });
            setIsAsking(false); // Hide typing indicator immediately after response
            
            // Deduct 0.5 scans from local balance for local AI responses
            await deductScanFromBalance();
            
            // Refresh scan balance from backend immediately
            try {
              await refreshScanBalance();
            } catch (error) {
              // console.error('❌ Error refreshing scan balance after AI chat:', error);
            }
          }, 1000);
        }
      } else {
        // Use local AI response for comparison questions (same as recent compare)
        const comparisonData = {
          firstListing: firstListing,
          secondListing: secondListing,
          answer: comparisonResult.answer,
          question: comparisonQuestion
        };
        
        const aiResponse = generateAIResponse(userQuestion, comparisonData);
        const newMessages = [...updatedMessages, { 
          role: "assistant", 
          content: aiResponse
        }];
        setMessages(newMessages);
        setIsAsking(false); // Hide typing indicator immediately after response
        
        // Deduct 0.5 scans from local balance for local AI responses
        await deductScanFromBalance();
        
        // Refresh scan balance from backend immediately (same as web app)
        try {
          await refreshScanBalance();
        } catch (error) {
          // console.error('❌ Error refreshing scan balance after AI chat:', error);
        }
      }
      
      // Auto-scroll to bottom after bot response (same as recent compare)
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
    } catch (error) {
      // console.error('AI Chat Error:', error);
      // Fallback to local response if API fails (same as recent compare)
      setIsAsking(false);
      const comparisonData = {
        firstListing: firstListing,
        secondListing: secondListing,
        answer: comparisonResult.answer,
        question: comparisonQuestion
      };
      const fallbackResponse = generateAIResponse(userQuestion, comparisonData);
      // Remove typing indicator and add fallback response
      setMessages((prev) => {
        const filtered = prev.filter(msg => !msg.isTyping);
        return [...filtered, { 
          role: "assistant", 
          content: fallbackResponse
        }];
      });
      
      // Deduct 0.5 scans from local balance after fallback AI response
      await deductScanFromBalance();
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } finally {
      // Only set to false if it's still true (in case of unexpected errors)
      if (isAsking) {
        setIsAsking(false);
      }
    }
  };

  const renderDropdown = (type, isVisible, onClose) => {
    if (!isVisible) return null;

    return (
      <View style={styles.dropdown}>
        <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
          {scans.length === 0 ? (
            <View style={styles.emptyDropdown}>
              <Text style={styles.emptyText}>No scans available</Text>
              <Text style={styles.emptySubtext}>Scan some listings first</Text>
            </View>
          ) : (
            scans.map((listing, index) => {
              // console.log(`🔍 COMPARE: Rendering listing ${index}:`, {
              //   id: listing.id,
              //   listing_title: listing.listing_title,
              //   location: listing.location,
              //   listing_url: listing.listing_url
              // });
              return (
                <TouchableOpacity
                  key={listing.id || index}
                  style={styles.dropdownItem}
                  onPress={() => selectListing(listing, type)}
                >
                  <Text style={styles.dropdownItemText}>
                    {formatListingDisplay(listing)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e162a" />
          <Text style={styles.loadingText}>Loading your scans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
      
      {/* Header with Profile Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.profileButtonContainer}
          onPress={() => navigation.navigate('Account')}
          activeOpacity={0.6}
        >
          <View style={styles.profileIcon}>
            <Text style={styles.profileInitial}>
              {user?.name?.[0]?.toUpperCase() || user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Beautiful Title - Only show when no messages (matching web app) */}
      {messages.length === 0 && (
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Compare Listings</Text>
        </View>
      )}

      {/* Show comparison form when no messages, show messages when comparison is done (matching web app) */}
      {messages.length === 0 ? (
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1e162a']}
              tintColor="#1e162a"
            />
          }
        >
          {/* Main Content Card - Matching Web */}
          <View style={styles.mainCard}>
            <Text style={styles.helpText}>
              I can help you compare your scanned listings. Here are your available scans:
            </Text>

            {/* Listing A Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Listing A</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowFirstDropdown(!showFirstDropdown)}
              >
                <Text style={styles.selectorText}>
                  {firstListing ? formatListingDisplay(firstListing) : "Select listing A"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
              {renderDropdown('first', showFirstDropdown, () => setShowFirstDropdown(false))}
            </View>

            {/* Listing B Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Listing B</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowSecondDropdown(!showSecondDropdown)}
              >
                <Text style={styles.selectorText}>
                  {secondListing ? formatListingDisplay(secondListing) : "Select listing B"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
              {renderDropdown('second', showSecondDropdown, () => setShowSecondDropdown(false))}
            </View>

            {/* Comparison Question */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Comparison Question (Optional)</Text>
              <TextInput
                style={styles.questionInput}
                placeholder="e.g., Which is better for families? Which has better location?"
                placeholderTextColor="#9CA3AF"
                value={comparisonQuestion}
                onChangeText={setComparisonQuestion}
                multiline
              />
            </View>

            {/* Compare Button - Same validation as web app */}
            <TouchableOpacity
              style={[
                styles.compareButton, 
                comparing && styles.compareButtonDisabled,
                (!firstListing || !secondListing) && styles.compareButtonDisabled,
                (scanBalance?.remaining < 1.0) && styles.compareButtonDisabled,
                (firstListing && secondListing && (
                  firstListing.id === secondListing.id || 
                  firstListing.listing_url === secondListing.listing_url ||
                  (firstListing.listing_title && secondListing.listing_title && 
                   firstListing.listing_title === secondListing.listing_title)
                )) && styles.compareButtonDisabled
              ]}
              onPress={handleCompare}
              disabled={
                comparing || 
                !firstListing || 
                !secondListing || 
                (scanBalance?.remaining < 1.0) ||
                (firstListing && secondListing && (
                  firstListing.id === secondListing.id || 
                  firstListing.listing_url === secondListing.listing_url ||
                  (firstListing.listing_title && secondListing.listing_title && 
                   firstListing.listing_title === secondListing.listing_title)
                ))
              }
            >
              {comparing ? (
                <View style={styles.sendButtonLoadingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonLoadingText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.compareButtonText}>Compare Listings</Text>
              )}
            </TouchableOpacity>

            {/* Zero Scans Warning */}
            {scanBalance?.remaining < 1.0 && (
              <View style={styles.zeroScansWarning}>
                <Text style={styles.zeroScansText}>
                  ⚠️ You need at least 1 scan to compare listings. Please{' '}
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

          </View>
        </ScrollView>
      ) : null}

      {/* Messages Area - Display comparison results as messages (matching web app) */}
      {messages.length > 0 && (
        <View style={styles.messagesArea}>
          <ScrollView 
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            ref={flatListRef}
            onContentSizeChange={() => scrollToBottom()}
            onLayout={() => scrollToBottom()}
          >
            {messages.map((message, index) => renderMessage(message, index))}
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

      {/* Input Area - Same as ScanScreen (same as web app) */}
      {messages.length > 0 && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={question}
                onChangeText={setQuestion}
                placeholder="Scan or Ask Anything…"
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
                editable={!isAsking}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton, 
                  question.trim() && !isAsking && styles.sendButtonActive,
                  (!question.trim() || isAsking) && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!question.trim() || isAsking}
                activeOpacity={0.7}
              >
                {isAsking ? (
                  <View style={styles.sendButtonLoadingContainer}>
                    <ActivityIndicator size="small" color="#1e162a" style={{ marginRight: 8 }} />
                    <Text style={styles.sendButtonLoadingText}>Processing...</Text>
                  </View>
                ) : (
                  <Image 
                    source={require('../assets/book2.png')} 
                    style={styles.sendButtonIcon}
                    resizeMode="contain"
                    tintColor={question.trim() ? "#ffffff" : undefined}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
    height: 80,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff',
  },
  profileButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 0,
    marginTop: 3,
  },
  profileIcon: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#1e162a",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  recentCompareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 10,
  },
  recentCompareButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  titleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  helpText: {
    fontSize: 17,
    color: '#374151',
    marginBottom: 28,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '400',
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectorText: {
    fontSize: 17,
    color: '#1F2937',
    flex: 1,
    fontWeight: '400',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  dropdownItemLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyDropdown: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  questionInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 17,
    color: '#1F2937',
    minHeight: 52,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compareButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  compareButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  compareButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  zeroScansWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  zeroScansText: {
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
  resultContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  listingInfoSection: {
    marginBottom: 24,
  },
  listingLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  listingUrl: {
    fontSize: 14,
    color: '#1D4ED8',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  analysisSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  analysisTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultContent: {
    marginTop: 8,
    lineHeight: 24,
  },
  resultFormatted: {
    gap: 12,
  },
  resultText: {
    fontSize: 17,
    color: '#374151',
    lineHeight: 26,
    marginBottom: 12,
    fontWeight: '400',
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  bulletText: {
    fontSize: 18,
    color: '#000000',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
  },
  bulletContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    flex: 1,
  },
  conclusionSection: {
    marginTop: 12,
    paddingLeft: 8,
  },
  conclusionText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    marginTop: 4,
  },
  conclusionLabel: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
  recentComparesContainer: {
    marginTop: 24,
  },
  recentComparesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  recentComparesList: {
    flexDirection: 'row',
  },
  recentCompareItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
  },
  recentCompareItemActive: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  recentCompareTitle: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18,
  },
  recentCompareTitleActive: {
    color: '#ffffff',
  },
  recentCompareDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  recentCompareDateActive: {
    color: '#D1D5DB',
  },
  noRecentComparesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // AI Assistant Styles - Same as ScanResultScreen
  chatToggleContainer: {
    marginTop: 40,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  chatToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
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
    color: '#FFFFFF',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  chatContainer: {
    backgroundColor: '#ffffff',
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    backgroundColor: '#FFFFFF',
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
    color: '#1f2937',
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  chatMessagesContainer: {
    backgroundColor: '#f8fafb',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
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
    backgroundColor: '#000000',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#303030',
    lineHeight: 20,
  },
  messageTextOnPrimary: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeOnPrimary: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOnSecondary: {
    color: 'rgba(48, 48, 48, 0.6)',
  },
  // Input Styles - Same as ScanScreen (same as web app)
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
    paddingVertical: 12,
    fontSize: 16,
    color: "#070707",
    textAlignVertical: 'top',
  },
  sendButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#d1d5db",
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 12,
  },
  sendButtonActive: {
    backgroundColor: "#1e162a",
  },
  sendButtonDisabled: {
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
    color: '#1e162a',
    fontSize: 14,
    fontWeight: '600',
  },
  sendButtonLoadingTextActive: {
    color: '#ffffff',
  },
  // Messages Area Styles (matching ScanScreen)
  messagesArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    width: '100%',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '99%',
    borderRadius: 16,
    padding: 16,
    marginLeft: 3.5,
  },
  userMessageBubble: {
    backgroundColor: "#f3f4f6",
  },
  assistantMessageBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e9e8ea",
  },
  postCompareMessageBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 0,
    borderColor: "transparent",
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
    flexWrap: 'wrap',
  },
  errorText: {
    color: "#dc2626",
  },
  linkText: {
    color: "#3b82f6",
    textDecorationLine: 'underline',
  },
  // Typing Indicator Styles
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
  // Comparison Result Styles (matching web app)
  comparisonResultContainer: {
    width: '100%',
  },
  listingInfoSection: {
    marginBottom: 16,
  },
  listingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#070707",
    marginBottom: 8,
  },
  listingUrl: {
    fontSize: 12,
    color: "#3b82f6",
    textDecorationLine: 'underline',
  },
  analysisSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9e8ea",
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#070707",
    marginBottom: 12,
  },
  analysisContent: {
    width: '100%',
  },
  typingIndicator: {
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e9e8ea",
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9ca3af",
    marginHorizontal: 2,
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalCompareItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalCompareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalCompareDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default CompareScreen;