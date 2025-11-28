import React, { useState, useEffect } from "react";
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

export default function HistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [compares, setCompares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingScanId, setLoadingScanId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  // Refresh history when screen comes into focus (e.g., after a new scan)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if not already loading
      if (!loading) {
        loadHistory();
      }
    }, [loading])
  );

  const loadHistory = async () => {
    try {
      // Load both scans and compares
      const [scansResult, chatsResult] = await Promise.all([
        apiClient.getMyScans(),
        apiClient.getChats().catch(() => ({ data: [], error: null })) // Handle error gracefully
      ]);
      
      const scans = scansResult.data || [];
      const chats = chatsResult.data || [];
      
      if (scansResult.error && chatsResult.error) {
        Alert.alert('Error', 'Failed to load history');
        return;
      }
      
      // Filter to show only unique Airbnb links (most recent scan for each URL)
      const uniqueScans = filterUniqueScans(scans);
      
      // Fetch additional details for each scan to get listing_title, location, and label
      const enrichedScans = await Promise.all(
        uniqueScans.map(async (scan) => {
          try {
            const { data: scanDetails } = await apiClient.getScanById(scan.id);
            return {
              ...scan,
              type: 'scan',
              listing_title: scanDetails?.listing_title || "",
              location: scanDetails?.location || "",
              label: scanDetails?.label || null
            };
          } catch (error) {
            return {
              ...scan,
              type: 'scan',
              listing_title: "",
              location: "",
              label: null
            };
          }
        })
      );
      
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
      
      // Load local compares (same as CompareScreen)
      let localCompares = [];
      try {
        const localComparisons = await AsyncStorage.getItem('local_comparisons');
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
      
      // Enrich compares with scan details (same as CompareScreen approach)
      const enrichedCompares = await Promise.all(
        allCompares.map(async (compare) => {
          try {
            let scan1 = null;
            let scan2 = null;
            
            if (compare.source === 'backend' && compare.scan_ids && compare.scan_ids.length >= 2) {
              // Fetch scan data for backend compares
              const [scan1Result, scan2Result] = await Promise.all([
                apiClient.getScanById(compare.scan_ids[0]).catch(() => ({ data: null })),
                apiClient.getScanById(compare.scan_ids[1]).catch(() => ({ data: null }))
              ]);
              scan1 = scan1Result.data;
              scan2 = scan2Result.data;
            } else if (compare.source === 'local') {
              // Use local compare data
              scan1 = compare.firstListing;
              scan2 = compare.secondListing;
            }
            
            if (scan1 && scan2) {
              return {
                id: compare.id,
                type: 'compare',
                created_at: compare.createdAt || compare.created_at,
                listing_title: scan1?.listing_title && scan2?.listing_title 
                  ? `${scan1.listing_title} vs ${scan2.listing_title}`
                  : compare.title || 'Comparison',
                location: scan1?.location || scan2?.location || "",
                scan1: scan1,
                scan2: scan2,
                chatId: compare.chatId || compare.id,
                source: compare.source
              };
            }
            return null;
          } catch (error) {
            return null;
          }
        })
      );
      
      // Filter out null compares
      const validCompares = enrichedCompares.filter(c => c !== null);
      
      // Format compares for display (same format as CompareScreen modal)
      const formattedCompares = validCompares.map(compare => ({
        id: compare.id,
        title: compare.listing_title || compare.title || 'Comparison',
        date: new Date(compare.created_at).toLocaleDateString(),
        source: compare.source,
        chatId: compare.chatId || compare.id,
        scan1: compare.scan1,
        scan2: compare.scan2
      }));
      
      // Sort by creation date (most recent first)
      enrichedScans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      formattedCompares.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setScans(enrichedScans);
      setCompares(formattedCompares);
    } catch (error) {
      Alert.alert('Error', 'Failed to load history');
    } finally {
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
    const labelStyles = {
      "Outstanding Stay": { bg: "#0ea5e9", text: "#ffffff" },
      "Probably OK": { bg: "#eab308", text: "#ffffff" },
      "Avoid": { bg: "#ef4444", text: "#ffffff" },
    };
    return labelStyles[label] || { bg: "#6b7280", text: "#ffffff" };
  };

  const extractRoomId = (url) => {
    try {
      const match = url.match(/\/rooms\/(\d+)/);
      return match ? match[1] : 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

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
        let chatId = null;
        let chatMessages = null;
        
        try {
          const { data: chats, error: chatsError } = await apiClient.getChats();
          if (!chatsError && chats && Array.isArray(chats)) {
            // Filter to only scan-type chats
            const scanChats = chats.filter(chat => chat.type === 'scan');
            
            // Check each scan chat to find the one with matching scan_id
            for (const chat of scanChats) {
              try {
                const { data: chatData, error: chatError } = await apiClient.getChat(chat.id);
                if (!chatError && chatData?.chat?.scan_id === scan.id) {
                  chatId = chat.id;
                  chatMessages = chatData.messages || [];
                  break; // Found it, stop searching
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

  const handleComparePress = async (compare) => {
    setLoadingScanId(compare.id);
    try {
      // Always fetch fresh chat messages from backend (don't use cache)
      // This ensures we get the latest messages including any new ones from previous sessions
      let chatMessages = null;
      const chatId = compare.chatId || compare.id;
      
      if (chatId) {
        try {
          // Always fetch fresh data from backend to get latest messages
          const { data: chatData, error: chatError } = await apiClient.getChat(chatId);
          if (!chatError && chatData && chatData.messages) {
            chatMessages = chatData.messages;
          }
        } catch (e) {
          // Silent error - chat messages will remain null, but compare can still be loaded
        }
      }
      
      // Navigate to CompareScreen and pass compare data with chat messages
      // Always pass chatId so CompareScreen can refresh messages if needed
      navigation.navigate('Compare', {
        loadCompare: {
          id: chatId,
          source: compare.source || 'backend',
          title: compare.title,
          chatMessages: chatMessages, // Pass chat history (fresh from backend)
          forceRefresh: true // Flag to indicate we should always fetch fresh data
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load comparison');
    } finally {
      setLoadingScanId(null);
    }
  };

  const renderScanItem = ({ item, index }) => {
    const isLoading = loadingScanId === item.id;
    
    // Use listing_title if available, otherwise fall back to URL
    const displayTitle = item.listing_title || item.listing_url || 'Untitled';
    const displayLocation = item.location || "Location not available";
    
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
              <Ionicons name="home" size={16} color="#000000" />
              <Text style={styles.propertyNameText} numberOfLines={2}>
                {displayTitle}
              </Text>
              {item.label && (
                <View style={[styles.labelBadge, { backgroundColor: getLabelStyle(item.label).bg }]}>
                  <Text style={[styles.labelBadgeText, { color: getLabelStyle(item.label).text }]}>
                    {item.label}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.propertyLocation} numberOfLines={1}>
              {displayLocation}
            </Text>
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
          navigation.navigate('Scan');
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
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              {scans.map((scan, index) => (
                <View key={scan.id}>
                  {renderScanItem({ item: scan, index })}
                </View>
              ))}
            </View>
          )}
          
          {/* Recent Compares Section */}
          {compares.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recent Compares</Text>
              {compares.map((compare, index) => {
                const isLoading = loadingScanId === compare.id;
                return (
                  <TouchableOpacity
                    key={compare.id}
                    style={[styles.compareItem, isLoading && styles.scanItemLoading]}
                    onPress={() => !isLoading && handleComparePress(compare)}
                    activeOpacity={isLoading ? 1 : 0.7}
                    disabled={isLoading}
                  >
                    <Text style={styles.compareTitle} numberOfLines={2}>
                      {compare.title}
                    </Text>
                    {isLoading && (
                      <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="small" color="#1e162a" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
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
    marginLeft: 6,
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
    marginTop: 16,
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