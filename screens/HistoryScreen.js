import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  ScrollView,
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from "../lib/apiClient";
import { useAuth } from "../context/AuthProvider";

export default function HistoryScreen({ navigation, route }) {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [compares, setCompares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingScanId, setLoadingScanId] = useState(null);
  const [scansExpanded, setScansExpanded] = useState(true);
  const [comparesExpanded, setComparesExpanded] = useState(true);
  const lastUserIdRef = useRef(null);
  const lastRefreshTimeRef = useRef(null);
  const loadRunIdRef = useRef(0); // used to ignore stale async enrich results

  // Helper function to get user-specific storage keys
  const getUserStorageKey = (baseKey) => {
    if (!user || (!user.id && !user.email)) {
      return baseKey; // Fallback to old key if no user
    }
    const userId = user.id || user.email;
    return `${baseKey}_${userId}`;
  };

  // Clear old compares when user changes
  useEffect(() => {
    const currentUserId = user?.id || user?.email;
    if (currentUserId && lastUserIdRef.current !== null && lastUserIdRef.current !== currentUserId) {
      // User changed - clear state
      setCompares([]);
    }
    lastUserIdRef.current = currentUserId;
  }, [user?.id, user?.email]);

  useEffect(() => {
    loadHistory();
  }, [user?.id, user?.email]);

  // Refresh history when screen comes into focus (e.g., after a new scan)
  useFocusEffect(
    React.useCallback(() => {
      // Always refresh when screen comes into focus to get latest scans
      // Check if we recently refreshed (within last 2 seconds) to avoid excessive calls
      const timeSinceLastRefresh = lastRefreshTimeRef.current 
        ? Date.now() - lastRefreshTimeRef.current 
        : Infinity;
      
      if (timeSinceLastRefresh > 2000) {
        // Not recently refreshed, refresh now
        if (!loading) {
          loadHistory();
        } else {
          // If currently loading, wait a bit then refresh to ensure we get latest data
          const timeoutId = setTimeout(() => {
            loadHistory();
          }, 500); // Small delay to let current load finish
          return () => clearTimeout(timeoutId);
        }
      } else {
        // Recently refreshed, skip to avoid excessive API calls
        console.log('🔵 [HistoryScreen] Skipping refresh - recently refreshed');
      }
    }, [loading])
  );

  const loadHistory = async () => {
    console.log('🔵 [HistoryScreen] loadHistory called');
    lastRefreshTimeRef.current = Date.now();
    const runId = ++loadRunIdRef.current;
    try {
      // Check if user is authenticated before loading
      if (!user) {
        console.log('🔵 [HistoryScreen] No user, clearing data');
        setScans([]);
        setCompares([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('🔵 [HistoryScreen] User authenticated, loading history...');

      // Load both scans and compares
      const [scansResult, chatsResult] = await Promise.all([
        apiClient.getMyScans(),
        apiClient.getChats().catch((err) => {
          console.log('🔵 [HistoryScreen] Chats request failed, using empty array:', err);
          return { data: [], error: null };
        })
      ]);
      
      console.log('🔵 [HistoryScreen] API Results:', {
        scansResult: {
          hasData: !!scansResult?.data,
          dataType: scansResult?.data ? typeof scansResult.data : 'null',
          isArray: Array.isArray(scansResult?.data),
          hasScansProperty: !!(scansResult?.data?.scans),
          dataLength: Array.isArray(scansResult?.data) ? scansResult.data.length : (scansResult?.data?.scans?.length || 0),
          hasError: !!scansResult?.error,
          error: scansResult?.error
        },
        chatsResult: {
          hasData: !!chatsResult?.data,
          dataType: chatsResult?.data ? typeof chatsResult.data : 'null',
          isArray: Array.isArray(chatsResult?.data),
          hasChatsProperty: !!(chatsResult?.data?.chats),
          dataLength: Array.isArray(chatsResult?.data) ? chatsResult.data.length : (chatsResult?.data?.chats?.length || 0),
          hasError: !!chatsResult?.error,
          error: chatsResult?.error
        }
      });
      
      // Handle both array and paginated object responses from /my-scans
      let scans = [];
      if (scansResult && scansResult.data) {
        if (Array.isArray(scansResult.data)) {
          // Backward compatible: direct array response (when page=1 and total <= 30)
          scans = scansResult.data;
          console.log('🔵 [HistoryScreen] Scans: Direct array format, count:', scans.length);
        } else if (scansResult.data.scans && Array.isArray(scansResult.data.scans)) {
          // Paginated response: extract scans array (when total > 30)
          scans = scansResult.data.scans;
          console.log('🔵 [HistoryScreen] Scans: Paginated format, count:', scans.length, 'pagination:', scansResult.data.pagination);
        } else {
          console.log('⚠️ [HistoryScreen] Scans: Unexpected data format:', {
            dataType: typeof scansResult.data,
            keys: scansResult.data ? Object.keys(scansResult.data) : 'null',
            data: scansResult.data
          });
        }
      } else {
        console.log('⚠️ [HistoryScreen] Scans: No data in result');
      }
      
      // Handle both array and paginated object responses from /chats (same as /my-scans)
      let chats = [];
      if (chatsResult && chatsResult.data) {
        if (Array.isArray(chatsResult.data)) {
          // Backward compatible: direct array response
          chats = chatsResult.data;
          console.log('🔵 [HistoryScreen] Chats: Direct array format, count:', chats.length);
        } else if (chatsResult.data.chats && Array.isArray(chatsResult.data.chats)) {
          // Paginated response: extract chats array
          chats = chatsResult.data.chats;
          console.log('🔵 [HistoryScreen] Chats: Paginated format, count:', chats.length, 'pagination:', chatsResult.data.pagination);
        } else {
          console.log('⚠️ [HistoryScreen] Chats: Unexpected data format:', {
            dataType: typeof chatsResult.data,
            keys: chatsResult.data ? Object.keys(chatsResult.data) : 'null',
            data: chatsResult.data
          });
        }
      } else {
        console.log('⚠️ [HistoryScreen] Chats: No data in result');
      }
      console.log('🔵 [HistoryScreen] Chats count:', chats.length);
      
      // Check for errors - only show error if we have no data from either request
      const scansHasError = scansResult && scansResult.error;
      const chatsHasError = chatsResult && chatsResult.error;
      
      console.log('🔵 [HistoryScreen] Error check:', {
        scansHasError,
        chatsHasError,
        scansCount: scans.length,
        chatsCount: chats.length,
        hasAnyData: scans.length > 0 || chats.length > 0
      });
      
      // Only proceed with error handling if we have no data to display
      if (scans.length === 0 && chats.length === 0) {
        console.log('⚠️ [HistoryScreen] No data from either request, checking errors...');
        
        // Check if errors are authentication-related (user logged out)
        const scansIsAuthError = scansHasError && (
          (typeof scansResult.error === 'string' && (
            scansResult.error.includes('401') || 
            scansResult.error.includes('Unauthorized') || 
            scansResult.error.includes('token')
          )) || (scansResult.error?.message && (
            scansResult.error.message.includes('401') || 
            scansResult.error.message.includes('Unauthorized') || 
            scansResult.error.message.includes('token')
          ))
        );
        
        const chatsIsAuthError = chatsHasError && (
          (typeof chatsResult.error === 'string' && (
            chatsResult.error.includes('401') || 
            chatsResult.error.includes('Unauthorized') || 
            chatsResult.error.includes('token')
          )) || (chatsResult.error?.message && (
            chatsResult.error.message.includes('401') || 
            chatsResult.error.message.includes('Unauthorized') || 
            chatsResult.error.message.includes('token')
          ))
        );
        
        console.log('🔵 [HistoryScreen] Auth error check:', {
          scansIsAuthError,
          chatsIsAuthError,
          user: !!user,
          willShowError: user && (scansHasError || chatsHasError) && !scansIsAuthError && !chatsIsAuthError
        });
        
        // Only show error if user is still authenticated and errors are not auth-related
        if (user && (scansHasError || chatsHasError) && !scansIsAuthError && !chatsIsAuthError) {
          console.log('❌ [HistoryScreen] Showing error alert: Failed to load history');
          Alert.alert('Error', 'Failed to load history');
        } else {
          console.log('🔵 [HistoryScreen] Not showing error (auth error or no user)');
        }
        return;
      }
      
      console.log('✅ [HistoryScreen] Has data, continuing processing...');
      
      // If we have data, continue processing (even if there were some errors)
      
      // Filter to show only unique Airbnb links (most recent scan for each URL)
      const uniqueScans = filterUniqueScans(scans);
      // FAST PATH: show scans immediately (titles/locations will enrich in background)
      const quickScans = uniqueScans.map((scan) => ({
              ...scan,
              type: 'scan',
        listing_title: scan.listing_title || "",
        location: scan.location || "",
        label: scan.label || null
      }));
      
      // Process compares from chats (same as CompareScreen)
      const compareChats = chats.filter(chat => chat.type === 'compare');
      
      // Format backend compares (same as CompareScreen)
      const backendCompares = compareChats.map(chat => {
        const displayTitle = (chat.title || 'Untitled Comparison').replace("Compare • ", "");
        return {
          id: chat.id,
          title: displayTitle,
          source: 'backend',
          chatId: chat.id,
          createdAt: chat.created_at,
          scan_ids: chat.scan_ids
        };
      });
      
      // Load local compares (same as CompareScreen) - user-specific
      let localCompares = [];
      try {
        const storageKey = getUserStorageKey('local_comparisons');
        const localComparisons = await AsyncStorage.getItem(storageKey);
        localCompares = localComparisons ? JSON.parse(localComparisons).map(comp => ({
          id: comp.id,
          title: comp.title,
          source: 'local',
          answer: comp.answer,
          firstListing: comp.firstListing,
          secondListing: comp.secondListing,
          question: comp.question,
          createdAt: comp.timestamp
        })) : [];
      } catch (error) {
        // Ignore local storage errors
      }
      
      // Combine all compares and sort by date
      const allCompares = [...backendCompares, ...localCompares]
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at);
          const dateB = new Date(b.createdAt || b.created_at);
          return dateB - dateA;
        });
      
      // FAST PATH: show compares immediately (scan1/scan2 details will enrich in background)
      const quickCompares = allCompares.map((compare) => ({
              id: compare.id,
        title: compare.title || 'Comparison',
        date: new Date(compare.createdAt || compare.created_at || Date.now()).toLocaleDateString(),
              source: compare.source,
        chatId: compare.chatId || compare.id,
        // Local compares already have scan objects; backend compares will be enriched later
        scan1: compare.source === 'local' ? (compare.firstListing || null) : null,
        scan2: compare.source === 'local' ? (compare.secondListing || null) : null
      }));

      // Sort by creation date (most recent first)
      quickScans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      quickCompares.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Update UI immediately (avoid long blocking spinner)
      setScans(quickScans);
      setCompares(quickCompares);
      setLoading(false);
      setRefreshing(false);

      // --- Background enrichment (non-blocking) ---
      const mapWithConcurrency = async (items, limit, mapper) => {
        const results = new Array(items.length);
        let idx = 0;
        const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
          while (idx < items.length) {
            const current = idx++;
            try {
              results[current] = await mapper(items[current], current);
            } catch (e) {
              results[current] = null;
            }
          }
        });
        await Promise.all(workers);
        return results;
      };

      // Enrich scans (titles/locations/labels) in background with small concurrency
      mapWithConcurrency(uniqueScans, 5, async (scan) => {
        const { data: scanDetails } = await apiClient.getScanById(scan.id);
        return {
          ...scan,
          type: 'scan',
          listing_title: scanDetails?.listing_title || "",
          location: scanDetails?.location || "",
          label: scanDetails?.label || null
        };
      }).then((results) => {
        if (loadRunIdRef.current !== runId) return; // ignore stale results
        const enriched = results.filter(Boolean);
        enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setScans(enriched);
      });

      // Enrich compares in background (backend compares only) with small concurrency
      mapWithConcurrency(allCompares, 3, async (compare) => {
        let scan1 = null;
        let scan2 = null;

        if (compare.source === 'backend') {
          // Some /chats list payloads may not include scan_ids for compare chats.
          // Fetch /chat/{id} once to get scan_ids if missing, then fetch the scans.
          const chatId = compare.chatId || compare.id;
          let scanIds = compare.scan_ids;

          if ((!scanIds || scanIds.length < 2) && chatId) {
            const { data: chatData, error: chatErr } = await apiClient.getChat(chatId);
            if (!chatErr && chatData?.chat?.scan_ids) {
              scanIds = chatData.chat.scan_ids;
            }
          }

          if (scanIds && scanIds.length >= 2) {
              const [scan1Result, scan2Result] = await Promise.all([
              apiClient.getScanById(scanIds[0]).catch(() => ({ data: null })),
              apiClient.getScanById(scanIds[1]).catch(() => ({ data: null }))
              ]);
              scan1 = scan1Result.data;
              scan2 = scan2Result.data;
          }
            } else if (compare.source === 'local') {
              scan1 = compare.firstListing;
              scan2 = compare.secondListing;
            }
            
        if (!scan1 || !scan2) return null;

        const title =
          scan1?.listing_title && scan2?.listing_title
                  ? `${scan1.listing_title} vs ${scan2.listing_title}`
            : (compare.title || 'Comparison');
              
        return {
          id: compare.id,
          title,
          date: new Date(compare.createdAt || compare.created_at || Date.now()).toLocaleDateString(),
          source: compare.source,
          chatId: compare.chatId || compare.id,
          scan1,
          scan2
        };
      }).then((results) => {
        if (loadRunIdRef.current !== runId) return; // ignore stale results
        const enrichedCompares = results.filter(Boolean);
        enrichedCompares.sort((a, b) => new Date(b.date) - new Date(a.date));
        // Keep at least the quick list even if enrichment is partial: merge by id
        setCompares((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          for (const c of enrichedCompares) byId.set(c.id, { ...byId.get(c.id), ...c });
          return Array.from(byId.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        });
      });
    } catch (error) {
      console.error('❌ [HistoryScreen] Error in loadHistory:', {
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: typeof error,
        errorString: String(error),
        user: !!user
      });
      
      // Handle authentication errors silently (user logged out)
      const isAuthError = error.message && (
        error.message.includes('401') || 
        error.message.includes('Unauthorized') || 
        error.message.includes('token')
      );
      
      console.log('🔵 [HistoryScreen] Error handling:', {
        isAuthError,
        hasUser: !!user,
        willShowError: !isAuthError && user
      });
      
      if (isAuthError || !user) {
        // User is not authenticated, silently clear data
        console.log('🔵 [HistoryScreen] Clearing data (auth error or no user)');
        setScans([]);
        setCompares([]);
      } else if (user) {
        // Only show error if user is still authenticated
        console.log('❌ [HistoryScreen] Showing error alert from catch block');
        Alert.alert('Error', 'Failed to load history');
      }
    } finally {
      console.log('🔵 [HistoryScreen] Finally block: setting loading states to false');
      setLoading(false);
      setRefreshing(false);
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


  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if it's the same day
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }
  };

  const getLabelStyle = (label) => {
    // Match label styling used across the app (e.g., ScanScreen) for consistency.
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
      "Avoid": { bg: "#ef4444", text: "#ffffff" }, // Backward compatibility
    };
    return map[label] || { bg: "#64748b", text: "#ffffff" };
  };

  const extractRoomId = (url) => {
    try {
      const match = url.match(/\/rooms\/(\d+)/);
      return match ? match[1] : 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  // Normalize URLs so "auto-open" works even if query params differ.
  const getUrlKey = useCallback((url) => {
    const roomId = extractRoomId(url);
    if (roomId !== 'Unknown') return `airbnb:${roomId}`;

    try {
      const u = new URL(url);
      return `${u.hostname}${u.pathname}`.replace(/\/$/, '');
    } catch {
      return String(url || '');
    }
  }, []);

  const handleScanPress = async (scan) => {
    // Set loading state for this specific scan
    setLoadingScanId(scan.id);
    
    try {
      // Fetch scan data
      const { data, error } = await apiClient.getScanById(scan.id);
      
      if (error) {
        // Handle backend rate limit gracefully (frontend-only change)
        if (typeof error === 'string' && error.toLowerCase().includes('rate limit')) {
          Alert.alert(
            'Please Try Again Later',
            'You have reached the temporary scan rate limit. Wait a little and try again.',
            [ { text: 'OK', style: 'default' } ]
          );
          return;
        }

        Alert.alert(
          'Error',
          'Failed to load scan results. This might be because the scan is too old or the listing is no longer available.',
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Scan Again', 
              onPress: () => {
                navigation.navigate('Scan', { prefillUrl: scan.listing_url });
              }
            }
          ]
        );
        return;
      }
      
      if (data) {
        // Find chatId for this scan to load chat history
        // OPTIMIZATION: Use scan_id from chats array directly (already available from /chats endpoint)
        // This avoids calling /chat/{chatId} for every chat, making it much faster
        let chatId = null;
        let chatMessages = null;
        
        try {
          const { data: chats, error: chatsError } = await apiClient.getChats();
          if (!chatsError && chats) {
            // Handle both array and paginated object responses from /chats
            const chatsArray = Array.isArray(chats) ? chats : (chats.chats || []);
            
            // Filter to only scan-type chats and find matching scan_id directly
            // The /chats endpoint already includes scan_id, so we can match directly
            const matchingChat = chatsArray.find(chat => 
              chat.type === 'scan' && 
              chat.scan_id && 
              chat.scan_id === scan.id
            );
            
            if (matchingChat) {
              chatId = matchingChat.id;
              console.log('🔵 [HistoryScreen] Found chatId from chats array:', chatId, 'for scan_id:', scan.id);
              
              // Now fetch chat messages only once (not for every chat)
              try {
                const { data: chatData, error: chatError } = await apiClient.getChat(chatId);
                if (!chatError && chatData && chatData.messages) {
                  chatMessages = chatData.messages;
                  console.log('🔵 [HistoryScreen] Loaded chat messages:', chatMessages.length, 'messages');
                } else {
                  console.log('⚠️ [HistoryScreen] No chat messages found or error:', chatError);
                }
              } catch (e) {
                console.log('⚠️ [HistoryScreen] Error loading chat messages:', e.message);
                // Continue without messages - user can still view scan
              }
            } else {
              console.log('⚠️ [HistoryScreen] No matching chat found for scan_id:', scan.id);
            }
          }
        } catch (error) {
          console.log('⚠️ [HistoryScreen] Error fetching chats:', error.message);
          // Silent error - chatId will remain null, but user can still view scan results
        }
        
        // Navigate with scan data and chat history
        navigation.navigate('Scan', { 
          scanHistoryData: {
            id: scan.id,
            link: scan.listing_url,
            status: "Success",
            analysis: data,
            listing_title: data.listing_title,
            location: data.location,
            label: data.label,
            timestamp: scan.created_at,
            chatId: chatId,
            chatMessages: chatMessages // Pass chat history
          }
        });
      } else {
        Alert.alert('Error', 'No scan data received');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred while loading scan results');
    } finally {
      setLoadingScanId(null);
    }
  };

  // If we navigated here from the "Already Scanned" card, auto-open that scan once.
  useEffect(() => {
    const autoOpenUrl = route?.params?.autoOpenUrl;
    if (!autoOpenUrl) return;
    if (loading) return; // wait until history loads
    if (loadingScanId) return; // avoid overlapping opens

    // Clear the param so it doesn't re-trigger on future focuses/renders.
    try {
      navigation.setParams({ autoOpenUrl: undefined });
    } catch {
      // no-op
    }

    const target = scans.find((s) => getUrlKey(s?.listing_url) === getUrlKey(autoOpenUrl));
    if (target) {
      handleScanPress(target);
    }
  }, [route?.params?.autoOpenUrl, loading, loadingScanId, scans, getUrlKey, navigation]);

  const handleComparePress = async (compare) => {
    console.log('🔵 [HistoryScreen DEBUG] handleComparePress called with:', {
      compareId: compare.id,
      chatId: compare.chatId || compare.id,
      source: compare.source,
      title: compare.title,
      hasScan1: !!compare.scan1,
      hasScan2: !!compare.scan2
    });
    
    setLoadingScanId(compare.id);
    try {
      // Always fetch fresh chat messages from backend (don't use cache)
      // This ensures we get the latest messages including any new ones from previous sessions
      let chatMessages = null;
      const chatId = compare.chatId || compare.id;
      
      console.log('🔵 [HistoryScreen DEBUG] Fetching chat data for chatId:', chatId);
      
      if (chatId) {
        try {
          // Always fetch fresh data from backend to get latest messages
          const { data: chatData, error: chatError } = await apiClient.getChat(chatId);
          
          console.log('🔵 [HistoryScreen DEBUG] Chat fetch result:', {
            hasData: !!chatData,
            hasError: !!chatError,
            error: chatError,
            messagesCount: chatData?.messages?.length || 0,
            chatType: chatData?.chat?.type,
            scanIds: chatData?.chat?.scan_ids
          });
          
          if (!chatError && chatData && chatData.messages) {
            chatMessages = chatData.messages;
            console.log('🔵 [HistoryScreen DEBUG] Chat messages loaded:', {
              count: chatMessages.length,
              firstMessage: chatMessages[0]?.role,
              hasComparisonMessage: chatMessages.some(m => 
                m.content && (m.content.includes('Listing A:') || m.content.includes('Comparative Analysis:'))
              )
            });
          } else {
            console.log('⚠️ [HistoryScreen DEBUG] No chat messages found or error occurred');
          }
        } catch (e) {
          console.log('❌ [HistoryScreen DEBUG] Error fetching chat:', e.message);
          // Silent error - chat messages will remain null, but compare can still be loaded
        }
      } else {
        console.log('⚠️ [HistoryScreen DEBUG] No chatId available');
      }
      
      // Prepare navigation data
      const navigationData = {
        loadCompare: {
          id: chatId,
          source: compare.source || 'backend',
          title: compare.title,
          chatMessages: chatMessages, // Pass chat history (fresh from backend)
          forceRefresh: true // Flag to indicate we should always fetch fresh data
        }
      };
      
      console.log('🔵 [HistoryScreen DEBUG] Navigating to CompareScreen with:', {
        loadCompareId: navigationData.loadCompare.id,
        source: navigationData.loadCompare.source,
        title: navigationData.loadCompare.title,
        chatMessagesCount: navigationData.loadCompare.chatMessages?.length || 0,
        forceRefresh: navigationData.loadCompare.forceRefresh
      });
      
      // Navigate to CompareScreen and pass compare data with chat messages
      // Always pass chatId so CompareScreen can refresh messages if needed
      navigation.navigate('Compare', navigationData);
      
      console.log('✅ [HistoryScreen DEBUG] Navigation completed');
    } catch (error) {
      console.log('❌ [HistoryScreen DEBUG] Error in handleComparePress:', error.message);
      Alert.alert('Error', 'Failed to load comparison');
    } finally {
      setLoadingScanId(null);
      console.log('🔵 [HistoryScreen DEBUG] handleComparePress finished, loading cleared');
    }
  };

  const renderScanItem = ({ item, index }) => {
    const isLoading = loadingScanId === item.id;
    
    // Use listing_title if available. Avoid showing raw URLs while background enrichment is running.
    const displayTitle =
      (item.listing_title && String(item.listing_title).trim().length > 0)
        ? item.listing_title
        : "Loading listing details…";
    const displayDate = item?.created_at ? new Date(item.created_at).toLocaleDateString() : "";
    
    return (
      <TouchableOpacity 
        style={[styles.scanItem, isLoading && styles.scanItemLoading]}
        onPress={() => !isLoading && handleScanPress(item)}
        activeOpacity={isLoading ? 1 : 0.7}
        disabled={isLoading}
      >
        <View style={styles.scanItemHeader}>
          <View style={styles.scanItemLeft}>
            <View style={styles.propertyNameContainer}>
              <Text style={styles.propertyNameText} numberOfLines={2}>
                {displayTitle}
                  </Text>
                </View>
            {!!displayDate && (
            <Text style={styles.propertyLocation} numberOfLines={1}>
                {displayDate}
            </Text>
            )}
          </View>
          <View style={styles.scanItemRight}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#1e162a" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </View>
        </View>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCompareItem = ({ item, index }) => {
    const isLoading = loadingScanId === item.id;
    const displayTitle = item.title || "Comparison";
    const displayDate =
      item?.date ||
      (item?.created_at ? new Date(item.created_at).toLocaleDateString() : "");

    return (
      <TouchableOpacity 
        style={[styles.scanItem, isLoading && styles.scanItemLoading]}
        onPress={() => !isLoading && handleComparePress(item)}
        activeOpacity={isLoading ? 1 : 0.7}
        disabled={isLoading}
      >
        <View style={styles.scanItemHeader}>
          <View style={styles.scanItemLeft}>
            <View style={styles.propertyNameContainer}>
              <Text style={styles.propertyNameText} numberOfLines={2}>
                {displayTitle}
              </Text>
            </View>
            {!!displayDate && (
            <Text style={styles.propertyLocation} numberOfLines={1}>
                {displayDate}
            </Text>
            )}
          </View>
          <View style={styles.scanItemRight}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#1e162a" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </View>
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#1e162a" />
          </View>
        )}
      </TouchableOpacity>
    );
  };


  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Scan History Yet</Text>
      <Text style={styles.emptySubtitle}>
        Scan a listing first to see it in your scan history.
      </Text>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => {
          // Navigate to Scan tab
          const timestamp = Date.now();
          navigation.navigate('Scan', { reset: true, timestamp });
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="scan" size={20} color="#FFFFFF" />
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>History</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e162a" />
          <Text style={styles.loadingText}>Loading your scan history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
      
      {/* Header with Profile Button */}
      <View style={styles.topHeader}>
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
      
      {renderHeader()}
      
      {scans.length === 0 && compares.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
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
          {/* Recent Scans Section */}
          {scans.length > 0 && (
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setScansExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <Ionicons
                  name={scansExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {scansExpanded &&
                scans.map((scan, index) => (
                  <View key={scan.id}>
                    {renderScanItem({ item: scan, index })}
                  </View>
                ))}
            </View>
          )}
          
          {/* Recent Compares Section */}
          {compares.length > 0 && (
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setComparesExpanded((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Recent Compares</Text>
                <Ionicons
                  name={comparesExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {comparesExpanded &&
                compares.map((compare, index) => (
                  <View key={compare.id}>
                    {renderCompareItem({ item: compare, index })}
                  </View>
                ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Same as CompareScreen
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
    height: 80,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Same as CompareScreen
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerInfo: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100, // Increased bottom padding for new bottom nav height
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 0,
  },
  compareItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    position: 'relative',
  },
  compareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  compareDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  scanItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  scanItemLoading: {
    opacity: 0.7,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    marginTop: 8,
  },
  scanItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scanItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  propertyNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  propertyNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 0,
    flex: 1,
    lineHeight: 20,
  },
  labelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  labelBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  propertyLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  scanItemRight: {
    justifyContent: 'center',
  },
  scanItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scanDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanDateText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 0,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e162a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
});