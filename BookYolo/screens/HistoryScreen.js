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
import apiClient from "../lib/apiClient";
import { BOOK1_LOGO } from "../constants/images";

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingScanId, setLoadingScanId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  // Refresh history when screen comes into focus (e.g., after a new scan)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if not already loading and we have history loaded
      if (!loading && history.length >= 0) {
        loadHistory();
      }
    }, [loading, history.length])
  );

  const loadHistory = async () => {
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
            const { data: scanDetails } = await apiClient.getScanById(scan.id);
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
      
      setHistory(enrichedScans);
    } catch (error) {
      Alert.alert('Error', 'Failed to load scan history');
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
      // Optimized: Only fetch scan data (fast - 1-2 seconds, same as web app)
      // chat_id is optional and can be fetched later in ScanScreen if needed for AI questions
      // The /my-scans endpoint only returns id, listing_url, created_at
      // We need to get the full scan data using the scan ID
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
        // Navigate immediately with scan data (same as web app - fast navigation, 1-2 seconds)
        // chat_id is optional and can be fetched later in ScanScreen if needed for AI questions
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
            chatId: null // Optional - will be fetched in ScanScreen if needed for AI questions
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

  const renderScanItem = ({ item, index }) => {
    const scanDate = formatDate(item.created_at);
    const scanTime = formatTime(item.created_at);
    const isLoading = loadingScanId === item.id;
    
    // Use listing_title if available, otherwise fall back to URL
    const displayTitle = item.listing_title || item.listing_url;
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
              <View style={styles.uniqueBadge}>
                <Text style={styles.uniqueBadgeText}>Unique</Text>
              </View>
            </View>
            <Text style={styles.propertyLocation} numberOfLines={1}>
              {displayLocation}
            </Text>
          </View>
          <View style={styles.scanItemRight}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </View>
        </View>
        
        <View style={styles.scanItemFooter}>
          <View style={styles.scanDateContainer}>
            <Ionicons name="time" size={14} color="#6B7280" />
            <Text style={styles.scanDateText}>{scanDate}</Text>
          </View>
          <Text style={styles.scanTimeText}>{scanTime}</Text>
        </View>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Loading scan results...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Unique Scans Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start by scanning your first unique Airbnb listing to see it here. Only unique links are shown in your history.
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
      <Text style={styles.headerTitle}>Scan History</Text>
      <Text style={styles.headerSubtitle}>
        {history.length} unique {history.length === 1 ? 'scan' : 'scans'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your scan history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafb" />
      
      {/* Header with Logo and Profile Button */}
      <View style={styles.topHeader}>
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
      
      {renderHeader()}
      
      {history.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderScanItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B5CF6']}
              tintColor="#8B5CF6"
            />
          }
        />
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
    justifyContent: 'flex-end',
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
    marginLeft: 7,
  },
  logo: {
    width: 45,
    height: 45,
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
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
  uniqueBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  uniqueBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
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
    justifyContent: 'space-between',
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
  scanTimeText: {
    fontSize: 12,
    color: '#9CA3AF',
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
    marginRight: 12,
    marginTop: 3,
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
});