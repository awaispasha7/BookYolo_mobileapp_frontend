import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthProvider';
import { BOOK1_LOGO } from '../constants/images';

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

const ComparisonResultScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { comparisonData } = route.params || {};
  const insets = useSafeAreaInsets();
  const { refreshUser, scanBalance, refreshScanBalance } = useAuth();
  
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // AI Assistant state
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadComparisonResult();
  }, [comparisonData?.source, comparisonData?.chatId, comparisonData?.answer]);

  // AI Assistant Functions
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  // Function to manually deduct 0.5 scans from local balance
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
      
      // Note: We don't call refreshUser() here to avoid infinite loops
      // The local balance is updated in AsyncStorage and will be synced on next app refresh
      
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
      if (chatId) {
        // Use backend chat system if available
        const { data, error } = await apiClient.askChatQuestion(chatId, userQuestion);
        
        if (error) {
          // Handle API errors
          const newMessages = [...updatedMessages, { 
            role: "assistant", 
            content: `Sorry, I encountered an error: ${error}. Please try again.`,
            isError: true
          }];
          setMessages(newMessages);
        } else if (data && data.answer) {
          // Use backend AI response
          const newMessages = [...updatedMessages, { 
            role: "assistant", 
            content: data.answer
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
            role: "assistant", 
            content: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
            isError: true
          }];
          setMessages(newMessages);
        }
      } else if (comparisonData?.firstListing && comparisonData?.secondListing) {
        // Use /compare endpoint for AI chat questions (same as web frontend)
        // console.log('🤖 Using /compare endpoint for comparison question:', userQuestion);
        
        try {
          // Extract URLs from listing objects
          const firstUrl = comparisonData.firstListing.listing_url || comparisonData.firstListing.link || comparisonData.firstListing.url;
          const secondUrl = comparisonData.secondListing.listing_url || comparisonData.secondListing.link || comparisonData.secondListing.url;
          
          // console.log('🔍 First listing URL:', firstUrl);
          // console.log('🔍 Second listing URL:', secondUrl);
          
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
              role: "assistant", 
              content: errorMessage,
              isError: true
            }];
            setMessages(newMessages);
          } else if (data && data.answer) {
            // Use backend AI response from /compare endpoint
            const newMessages = [...updatedMessages, { 
              role: "assistant", 
              content: data.answer
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
            role: "assistant", 
            content: "I'm sorry, I couldn't process your question. Please try rephrasing it.",
            isError: true
          }];
          setMessages(newMessages);
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
          
          // Fallback to local AI response after a short delay
          setTimeout(async () => {
            const comparisonDataForLocal = {
              firstListing: comparisonData?.firstListing,
              secondListing: comparisonData?.secondListing,
              answer: comparisonResult.answer,
              question: comparisonData?.question
            };
            
            const aiResponse = generateAIResponse(userQuestion, comparisonDataForLocal);
            const fallbackMessages = [...errorMessages, { 
              role: "assistant", 
              content: aiResponse
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
        // Use local AI response for comparison questions
        
        const comparisonData = {
          firstListing: comparisonData?.firstListing,
          secondListing: comparisonData?.secondListing,
          answer: comparisonResult.answer,
          question: comparisonData?.question
        };
        
        const aiResponse = generateAIResponse(userQuestion, comparisonData);
        const newMessages = [...updatedMessages, { 
          role: "assistant", 
          content: aiResponse
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
      
      // Auto-scroll to bottom after bot response
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
    } catch (error) {
      // console.error('AI Chat Error:', error);
      // Fallback to local response if API fails
      const comparisonData = {
        firstListing: comparisonData?.firstListing,
        secondListing: comparisonData?.secondListing,
        answer: comparisonResult.answer,
        question: comparisonData?.question
      };
      const fallbackResponse = generateAIResponse(userQuestion, comparisonData);
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: fallbackResponse
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

  const loadComparisonResult = async () => {
    if (!comparisonData) {
      Alert.alert('Error', 'No comparison data available');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      let comparisonAnswer = null;
      let firstListing = null;
      let secondListing = null;
      
      if (comparisonData.source === 'local' && comparisonData.answer) {
        // Show local comparison result
        comparisonAnswer = comparisonData.answer;
        firstListing = comparisonData.scan1 || comparisonData.firstListing;
        secondListing = comparisonData.scan2 || comparisonData.secondListing;
        setComparisonResult({ answer: comparisonAnswer });
        
      } else if (comparisonData.source === 'backend' && comparisonData.chatId) {
        // Set chatId for AI assistant
        if (comparisonData.chatId) {
          setChatId(comparisonData.chatId);
        }
        
        // Load backend comparison chat
        const { data: chatData, error } = await apiClient.getChat(comparisonData.chatId);
        if (!error && chatData?.messages) {
          // Find the assistant message with the comparison result
          const comparisonMessage = chatData.messages.find(msg => msg.role === 'assistant');
          if (comparisonMessage) {
            comparisonAnswer = comparisonMessage.content;
            // Try to get listing data from chatData
            firstListing = chatData.scan1 || comparisonData.scan1 || comparisonData.firstListing;
            secondListing = chatData.scan2 || comparisonData.scan2 || comparisonData.secondListing;
            setComparisonResult({ answer: comparisonAnswer });
          } else {
            Alert.alert('Error', 'No comparison result found in chat history');
          }
        } else {
          Alert.alert('Error', 'Could not load comparison from chat history');
        }
      } else {
        Alert.alert('Error', 'Invalid comparison data');
      }
      
      // Add messages to display comparison result (matching web app and CompareScreen)
      if (comparisonAnswer && firstListing && secondListing) {
        const userMessage = {
          role: "user",
          content: comparisonData.question 
            ? `Compare: ${firstListing.listing_title || firstListing.location} vs ${secondListing.listing_title || secondListing.location}. ${comparisonData.question}`
            : `Compare: ${firstListing.listing_title || firstListing.location} vs ${secondListing.listing_title || secondListing.location}`,
          messageType: "compare"
        };
        
        const assistantMessage = {
          role: "assistant",
          content: comparisonAnswer,
          isComparison: true,
          comparedScans: {
            scan1: firstListing,
            scan2: secondListing
          }
        };
        
        const postCompareMessage = {
          role: "assistant",
          content: "Do you have any questions about this comparison? Feel free to ask anything..."
        };
        
        setMessages([userMessage, assistantMessage, postCompareMessage]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load comparison details');
    } finally {
      setLoading(false);
    }
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

  // Render message (matching web app format)
  const renderMessage = (message, index) => {
    const isUser = message.role === "user";
    const isError = message.isError;
    const isComparison = message.isComparison && message.comparedScans;
    
    return (
      <View key={index} style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.assistantMessageBubble,
          isError && styles.errorMessageBubble
        ]}>
          {!isUser && !isError && isComparison ? (
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.container}>
          {/* Header */}
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
            
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading comparison result...</Text>
            </View>
          )}

          {/* Messages Area - Display comparison results as messages (matching web app and CompareScreen) */}
          {!loading && messages.length > 0 && (
            <View style={styles.messagesArea}>
              <ScrollView 
                style={styles.messagesScrollView}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
                ref={flatListRef}
                onContentSizeChange={() => scrollToBottom()}
                onLayout={() => scrollToBottom()}
                keyboardShouldPersistTaps="handled"
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

          {/* No Result State */}
          {!loading && !comparisonResult && messages.length === 0 && (
            <View style={styles.noResultContainer}>
              <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
              <Text style={styles.noResultTitle}>No Result Available</Text>
              <Text style={styles.noResultText}>
                The comparison result could not be loaded. Please try again.
              </Text>
            </View>
          )}

          {/* Input Area - Same as CompareScreen (same as web app) */}
          {!loading && messages.length > 0 && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
              <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="Scan or Ask Anything…"
                    placeholderTextColor="#999"
                    multiline
                    maxLength={1000}
                    editable={!isAsking && scanBalance?.remaining > 0}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, (!question.trim() || isAsking || scanBalance?.remaining <= 0) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!question.trim() || isAsking || scanBalance?.remaining <= 0}
                    activeOpacity={0.7}
                  >
                    {isAsking ? (
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
          )}
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 65,
    position: 'relative',
  },
  backButtonContainer: {
    position: 'absolute',
    left: 20,
    top: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  logo: {
    width: 45,
    height: 45,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 28,
  },
  comparisonDate: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  resultContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  resultFormatted: {
    marginTop: 8,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingLeft: 8,
    alignItems: 'flex-start',
  },
  bulletText: {
    fontSize: 20,
    color: '#000000',
    fontWeight: 'bold',
    marginRight: 12,
    marginTop: 2,
  },
  bulletContent: {
    flex: 1,
    fontSize: 17,
    color: '#374151',
    lineHeight: 26,
    fontWeight: '400',
  },
  resultText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  noResultContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Chat Toggle Styles - Beautiful Button
  chatToggleContainer: {
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 20,
  },
  chatToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000', // Black background for premium look
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
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
  // Messages Area Styles (matching CompareScreen)
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
    maxWidth: '85%',
    borderRadius: 16,
    padding: 16,
  },
  userMessageBubble: {
    backgroundColor: "#f3f4f6",
  },
  assistantMessageBubble: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e9e8ea",
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
  // Input Area Styles (matching CompareScreen)
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1e162a",
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ComparisonResultScreen;
