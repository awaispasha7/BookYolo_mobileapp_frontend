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
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthProvider';

const CompareScreen = ({ navigation }) => {
  const { refreshUser, scanBalance, refreshScanBalance } = useAuth();
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
  const [showChat, setShowChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [currentCompareChat, setCurrentCompareChat] = useState(null);
  const flatListRef = useRef(null);

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

  // Refresh scans and reset comparison when screen comes into focus (same as web app)
  useFocusEffect(
    React.useCallback(() => {
      // Reset listings to allow user to compare new listings
      setFirstListing(null);
      setSecondListing(null);
      setComparisonQuestion('');
      
      // Clear chat messages on screen focus (chat should be empty unless user is actively comparing)
      // Only load messages if there's an active comparison in the current session
      // Don't load previous messages from storage - they should be cleared on login
      setMessages([]);
      setShowChat(false);
      setComparisonResult(null);
      setChatId(null);
      setCurrentCompareChat(null);
      
      // Only refresh if not already loading
      if (!isLoadingRef.current) {
        loadScans();
      }
    }, [])
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

  const handleRecentComparePress = async (compare) => {
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
          
          // Extract comparison result from messages (same as web frontend)
          const assistantMessage = chatData.messages?.find(msg => 
            msg.role === 'assistant' && 
            msg.content && 
            (msg.content.includes('Listing A:') || msg.content.includes('Comparative Analysis:'))
          );
          
          // Set current compare chat for AI questions (same as web frontend)
          const compareChat = {
            id: compare.chatId,
            type: 'compare',
            title: compare.title,
            created_at: compare.created_at,
            scan1: compareScanData?.scan1 || null,
            scan2: compareScanData?.scan2 || null,
            result: assistantMessage?.content || '',
            messages: chatData.messages || []
          };
          setCurrentCompareChat(compareChat);
          setChatId(compareChat.id);
          
          // Save current chat ID (same as web frontend)
          await AsyncStorage.setItem('current_compare_chat_id', compareChat.id);
          
          // Navigate with the full chat data
          navigation.navigate('ComparisonResult', {
            comparisonData: {
              ...compare,
              chatData: {
                ...chatData,
                compareScanData: compareScanData
              }
            }
          });
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
        
        navigation.navigate('ComparisonResult', {
          comparisonData: compare
        });
      }
      
    } catch (error) {
      // console.log('❌ RECENT COMPARE: Error navigating to comparison result:', error);
      Alert.alert('Error', 'Could not open comparison result');
    }
  };

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
              text: "Do you have any questions about this comparison? Feel free to ask anything...",
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
        
        // Don't set initial messages - start with empty messages (same as recent compare AI assistant)
        // Messages will only be shown when user asks questions
        setMessages([]);
        setShowChat(true); // Show chat interface (but empty, like recent compare)
        
        // Show comparison result on the same screen
        // console.log('✅ Comparison completed successfully');
        
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

  const formatComparisonResult = (text) => {
    if (!text || typeof text !== 'string') {
      return <Text style={styles.resultText}>No comparison result available</Text>;
    }

    try {
      // Split text into complete sentences (keeping the punctuation)
      const sentences = text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
      
      if (sentences.length === 0) {
        return <Text style={styles.resultText}>{text}</Text>;
      }
      
      return (
        <View style={styles.resultFormatted}>
          {sentences.map((sentence, index) => {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) return null;
            
            // All sentences become bullet points for clean, consistent formatting
            return (
              <View key={index} style={styles.bulletPoint}>
                <Text style={styles.bulletText}>•</Text>
                <Text style={styles.bulletContent}>
                  {trimmedSentence}
                </Text>
              </View>
            );
          })}
        </View>
      );
    } catch (error) {
      // Fallback to simple text display if formatting fails
      return <Text style={styles.resultText}>{text}</Text>;
    }
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

    // Check if we have comparison data
    if (!comparisonResult) {
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
    
    // Add user message immediately
    const userQuestion = question.trim();
    const updatedMessages = [...messages, { 
      type: "user", 
      text: userQuestion,
      id: Date.now().toString()
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
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: `Sorry, I encountered an error: ${error}. Please try again.`,
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
          } else if (data && data.answer) {
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: data.answer,
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
            
            // /compare endpoint automatically deducts 0.5 scans from backend (same as web app)
            await deductScanFromBalance();
            
            // Refresh scan balance from backend immediately (same as web app)
            try {
              await refreshScanBalance();
            } catch (error) {
              // console.error('❌ Error refreshing scan balance after AI chat:', error);
            }
          } else {
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
          }
        } catch (apiError) {
          const newMessages = [...updatedMessages, { 
            type: "bot", 
            text: `Sorry, I encountered an error: ${apiError.message || apiError}. Please try again.`,
            id: (Date.now() + 1).toString()
          }];
          setMessages(newMessages);
        }
      } else if (chatId && !chatId.startsWith('compare-')) {
        // Use backend chat system for non-local chats (same as web app)
        const { data, error } = await apiClient.askChatQuestion(chatId, userQuestion);
        
        if (error) {
          // Handle API errors
          const newMessages = [...updatedMessages, { 
            type: "bot", 
            text: `Sorry, I encountered an error: ${error}. Please try again.`,
            id: (Date.now() + 1).toString()
          }];
          setMessages(newMessages);
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
            
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: errorMessage,
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
          } else if (data && data.answer) {
            // Use backend AI response from /compare endpoint
            const newMessages = [...updatedMessages, { 
              type: "bot", 
              text: data.answer,
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
            
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
              type: "bot", 
              text: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
              id: (Date.now() + 1).toString()
            }];
            setMessages(newMessages);
          }
        } catch (apiError) {
          console.error('❌ Error with /compare endpoint:', apiError);
          
          // Show user-friendly error message
          const errorMessages = [...updatedMessages, { 
            type: "bot", 
            text: "I'm having trouble connecting to the AI service right now. Let me try a different approach...",
            id: (Date.now() + 1).toString()
          }];
          setMessages(errorMessages);
          
          // Fallback to local AI response after a short delay (same as recent compare)
          setTimeout(async () => {
            const comparisonDataForLocal = {
              firstListing: firstListing,
              secondListing: secondListing,
              answer: comparisonResult.answer,
              question: comparisonQuestion
            };
            
            const aiResponse = generateAIResponse(userQuestion, comparisonDataForLocal);
            const fallbackMessages = [...errorMessages, { 
              type: "bot", 
              text: aiResponse,
              id: (Date.now() + 2).toString()
            }];
            setMessages(fallbackMessages);
            
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
          type: "bot", 
          text: aiResponse,
          id: (Date.now() + 1).toString()
        }];
        setMessages(newMessages);
        
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
      const comparisonData = {
        firstListing: firstListing,
        secondListing: secondListing,
        answer: comparisonResult.answer,
        question: comparisonQuestion
      };
      const fallbackResponse = generateAIResponse(userQuestion, comparisonData);
      setMessages((prev) => [...prev, { 
        type: "bot", 
        text: fallbackResponse,
        id: (Date.now() + 1).toString()
      }]);
      
      // Deduct 0.5 scans from local balance after fallback AI response
      await deductScanFromBalance();
      
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } finally {
      setIsAsking(false);
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
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your scans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
      
      {/* Header with Logo and Version */}
      <View style={styles.header}>
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

      {/* Beautiful Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Compare Listings</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
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
              <ActivityIndicator color="white" size="small" />
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

          {/* Comparison Result - Matching Web App Format */}
          {comparisonResult && firstListing && secondListing && (
            <View style={styles.resultContainer}>
              {/* Listing A Information */}
              <View style={styles.listingInfoSection}>
                <Text style={styles.listingLabel}>Listing A: {firstListing.listing_title || 'Title not available'}</Text>
                {firstListing.listing_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(firstListing.listing_url)}>
                    <Text style={styles.listingUrl}>{firstListing.listing_url}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Listing B Information */}
              <View style={styles.listingInfoSection}>
                <Text style={styles.listingLabel}>Listing B: {secondListing.listing_title || 'Title not available'}</Text>
                {secondListing.listing_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(secondListing.listing_url)}>
                    <Text style={styles.listingUrl}>{secondListing.listing_url}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Comparative Analysis */}
              <View style={styles.analysisSection}>
                <Text style={styles.analysisTitle}>Comparative Analysis</Text>
                <View style={styles.resultContent}>
                  {formatComparisonResult(comparisonResult.answer || 'No comparison result available')}
                </View>
              </View>
            </View>
          )}

          {/* AI Assistant Toggle Button - Only show after comparison */}
          {comparisonResult && (
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
          )}

          {/* AI Assistant Chat Interface - Only show when chat is visible and comparison exists */}
          {showChat && comparisonResult && (
            <View style={styles.chatContainer}>
              {/* Chat Header */}
              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderLeft}>
                  <View style={styles.chatAvatar}>
                    <Ionicons name="chatbubble" size={20} color="#000000" />
                  </View>
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatHeaderTitle}>BookYolo AI</Text>
                    <Text style={styles.chatHeaderSubtitle}>Ask me anything about this comparison</Text>
                  </View>
                </View>
              </View>
              
              {/* Chat Messages Area */}
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
                        Hi! I'm here to help you understand this comparison better. What would you like to know about these two listings?
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
                          {item.text || 'EMPTY MESSAGE'}
                        </Text>
                        <Text style={[
                          styles.messageTime,
                          item.type === "user" ? styles.messageTimeOnPrimary : styles.messageTimeOnSecondary
                        ]}>
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          }) : new Date().toLocaleTimeString('en-US', { 
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

          {/* Recent Compares Section - Always show like web version */}
          <View style={styles.recentComparesContainer}>
            <Text style={styles.recentComparesTitle}>Recent Compares</Text>
            {recentCompares.length > 0 ? (
              <ScrollView 
                style={styles.recentComparesList}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
              >
                {recentCompares.map((compare, index) => (
                  <TouchableOpacity 
                    key={compare.id} 
                    style={[
                      styles.recentCompareItem,
                      index === 0 && styles.recentCompareItemActive
                    ]}
                    onPress={() => handleRecentComparePress(compare)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.recentCompareTitle,
                      index === 0 && styles.recentCompareTitleActive
                    ]} numberOfLines={2}>
                      {compare.title}
                    </Text>
                    <Text style={[
                      styles.recentCompareDate,
                      index === 0 && styles.recentCompareDateActive
                    ]}>
                      {compare.date}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noRecentComparesText}>No recent comparisons yet</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* AI Assistant Input Area - Same as ScanScreen (same as web app) */}
      {showChat && comparisonResult && (
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
                style={[styles.sendButton, (!question.trim() || isAsking) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!question.trim() || isAsking}
                activeOpacity={0.7}
              >
                {isAsking ? (
                  <ActivityIndicator size="small" color="#ffffff" />
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
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
    height: 80,
    position: 'relative',
  },
  logoContainer: {
    position: 'absolute',
    left: 20,
    top: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 45,
    height: 45,
  },
  versionContainer: {
    position: 'absolute',
    right: 20,
    top: 23,
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 40,
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  versionText: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "600",
    textAlign: 'center',
    letterSpacing: 0.2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    gap: 8,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1e162a",
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonIcon: {
    width: 24,
    height: 24,
  },
});

export default CompareScreen;