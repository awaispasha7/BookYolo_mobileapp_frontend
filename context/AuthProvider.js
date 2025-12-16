import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../lib/apiClient';
import notificationService from '../lib/notificationService';
import octopusEmailService from '../lib/octopusEmailService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [scanBalance, setScanBalance] = useState(null);

  // Check for existing auth token on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // First, check if backend is reachable
      const { data: healthData, error: healthError } = await apiClient.healthCheck();
      
      if (healthError) {
        // Continue with auth check even if health check fails
      }
      
      const token = await apiClient.getAuthToken();
      
      if (token) {
        const { data, error } = await apiClient.getCurrentUser();
        
        if (data && !error) {
          setUser(data.user);
          
          // Check if this is a new account first (before checking AsyncStorage)
          const totalLimit = data.limits?.total_limit || 50;
          const backendUsed = data.used || 0;
          const backendRemaining = data.remaining || (totalLimit - backendUsed);
          
          
          // Check if this is a new account (both used and remaining are 0)
          if (backendUsed === 0 && backendRemaining === 0) {
            // New account - give full 50 scans and store in AsyncStorage
            
            const newAccountBalance = {
              remaining: 50,
              used: 0,
              plan: data.plan || 'free',
              limits: data.limits || { total_limit: 50 },
              isNewAccount: true
            };
            
            // Store new account balance in AsyncStorage
            try {
              await AsyncStorage.setItem('user_scan_balance', JSON.stringify(newAccountBalance));
              // console.log('💾 Stored new account balance in AsyncStorage:', newAccountBalance);
            } catch (error) {
              // console.error('❌ Error storing new account balance:', error);
            }
            
            // Set the scan balance immediately and mark as new account
            setScanBalance(newAccountBalance);
            
            // Also store a flag to prevent override
            try {
              await AsyncStorage.setItem('is_new_account', 'true');
              // console.log('🏷️ Marked account as new to prevent override');
            } catch (error) {
              // console.error('❌ Error storing new account flag:', error);
            }
          } else {
            // Existing account - check AsyncStorage first, then fallback to backend
            try {
              // Check if this is a new account that should not be overridden
              const isNewAccount = await AsyncStorage.getItem('is_new_account');
              if (isNewAccount === 'true') {
                // console.log('🛡️ New account flag detected - preventing override');
                // Don't override new account balance
                return;
              }
              
              const localBalance = await AsyncStorage.getItem('user_scan_balance');
              if (localBalance) {
                const parsedBalance = JSON.parse(localBalance);
                // console.log('🔄 Initial load: Using local scan balance from AsyncStorage:', parsedBalance);
                
                // Cap used scans at the maximum limit to prevent overage display
                const totalLimit = parsedBalance.limits?.total_limit || 50;
                const cappedUsed = Math.min(totalLimit, parsedBalance.used || 0);
                const cappedRemaining = Math.max(0, totalLimit - cappedUsed);
                
                const cappedBalance = {
                  ...parsedBalance,
                  used: cappedUsed,
                  remaining: cappedRemaining
                };
                
                // console.log('🔒 Capped scan balance to prevent overage:', cappedBalance);
                setScanBalance(cappedBalance);
              } else {
                // No local balance - use backend data but cap at limits
                const finalUsed = Math.min(totalLimit, backendUsed);
                const finalRemaining = Math.max(0, Math.min(totalLimit, backendRemaining));
                
                setScanBalance({
                  remaining: finalRemaining,
                  used: finalUsed,
                  plan: data.plan || 'free',
                  limits: data.limits || { total_limit: 50 }
                });
              }
            } catch (storageError) {
              // console.log('⚠️ Error reading local balance, using backend data');
              const finalUsed = Math.min(totalLimit, backendUsed);
              const finalRemaining = Math.max(0, Math.min(totalLimit, backendRemaining));
              
              setScanBalance({
                remaining: finalRemaining,
                used: finalUsed,
                plan: data.plan || 'free',
                limits: data.limits || { total_limit: 50 }
              });
            }
          }
        } else {
          await apiClient.removeAuthToken();
        }
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setInitializing(false);
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    
    try {
      const { data, error } = await apiClient.login(email, password);
      
      if (error) {
        setLoading(false);
        return { data: null, error: { message: error } };
      }

      if (data && data.user) {
        setUser(data.user);
        
        // Create a new session identifier for this login session
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
          await AsyncStorage.setItem('current_login_session_id', sessionId);
        } catch (error) {
          // Silent error handling
        }
        
        // Clear compare chat data on login (chat should be empty on new login)
        try {
          await AsyncStorage.removeItem('current_compare_chat_id');
        } catch (error) {
          // Silent error handling
        }
        
        // Fetch scan balance after successful login
        try {
          const { data: userData, error: userError } = await apiClient.getCurrentUser();
          if (userData && !userError) {
            const totalLimit = userData.limits?.total_limit || 50;
            const backendUsed = userData.used || 0;
            const backendRemaining = userData.remaining || (totalLimit - backendUsed);
            
            // For new accounts, ensure they have the full scan allowance
            const cappedUsed = Math.min(totalLimit, backendUsed);
            const cappedRemaining = Math.max(0, Math.min(totalLimit, backendRemaining));
            
            setScanBalance({
              remaining: cappedRemaining,
              used: cappedUsed,
              plan: userData.plan || 'free',
              limits: userData.limits || { total_limit: 50 }
            });
          } else {
            // Set default scan balance for new accounts - give them full 50 scans
            setScanBalance({
              remaining: 50,
              used: 0,
              plan: 'free',
              limits: { total_limit: 50 }
            });
          }
        } catch (error) {
          // Set default scan balance for new accounts - give them full 50 scans
          setScanBalance({
            remaining: 50,
            used: 0,
            plan: 'free',
            limits: { total_limit: 50 }
          });
        }
        
        // Send welcome notification after successful login
        try {
          const userName = data.user.email?.split('@')[0] || 'User';
          await notificationService.sendWelcomeNotification(userName);
        } catch (error) {
          // Silent error handling for notifications
        }

        // Octopus integration disabled on login to prevent 404 errors
        // Users will be added to Octopus contacts during email verification instead
        // console.log('Login successful - Octopus integration handled during email verification');
        
        setLoading(false);
        return { data: { user: data.user }, error: null };
      } else {
        setLoading(false);
        return { data: null, error: { message: 'Login failed' } };
      }
    } catch (error) {
      setLoading(false);
      return { data: null, error: { message: error.message || 'Login failed' } };
    }
  };

  const signUp = async (email, password, firstName, referralCode = null) => {
    setLoading(true);
    
    try {
      // Web frontend sends: { firstName, email, password, confirmPassword }
      const { data, error } = await apiClient.signup(firstName, email, password, password);
      
      // Track referral if referral code exists (matching web frontend)
      if (referralCode && data?.user_id) {
        try {
          await apiClient.trackReferralSignup(referralCode, email, data.user_id);
        } catch (referralErr) {
          // Don't fail the signup if referral tracking fails (matching web frontend)
        }
      }
      
      if (error) {
        setLoading(false);
        // console.log('AuthProvider error:', error);
        // console.log('AuthProvider error type:', typeof error);
        
        // Handle different error types properly
        let errorMessage = 'Signup failed';
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && error.message) {
          errorMessage = error.message;
        } else if (error && typeof error === 'object') {
          // Try to extract message from error object
          errorMessage = error.detail || error.message || JSON.stringify(error);
        }
        
        // console.log('Final error message:', errorMessage);
        return { data: null, error: { message: errorMessage } };
      }

      // Store user info for later use during email verification
      // This ensures we have the user's name when they verify their email
      try {
        await apiClient.setUserInfo({ email, fullName: firstName, referralCode });
      } catch (error) {
        // console.warn('Failed to store user info:', error);
        // Don't fail signup if storing user info fails
      }

      // Signup successful, but user needs to verify email
      setLoading(false);
      return { data: { message: 'Please check your email to verify your account' }, error: null };
    } catch (error) {
      setLoading(false);
      // console.error('Signup error:', error);
      return { data: null, error: { message: error.message || 'Signup failed' } };
    }
  };

  const verifyEmail = async (token) => {
    setLoading(true);
    
    try {
      const { data, error } = await apiClient.verifyEmail(token);
      
      if (error) {
        setLoading(false);
        return { data: null, error: { message: error } };
      }

      // After successful email verification, add user to Octopus contacts
      try {
        // Extract user info from the verification response if available
        let userEmail = data?.user?.email || data?.email;
        let userName = data?.user?.fullName || data?.fullName || data?.user?.name || 'User';
        
        // If user info not in response, try to get it from stored data
        if (!userEmail || userName === 'User') {
          const storedUserInfo = await apiClient.getUserInfo();
          if (storedUserInfo) {
            userEmail = userEmail || storedUserInfo.email;
            userName = userName === 'User' ? storedUserInfo.fullName : userName;
          }
        }
        
        if (userEmail) {
          // Add user to Octopus contacts with "New User" tag
          const octopusResult = await octopusEmailService.addUserToContacts(
            userEmail, 
            userName, 
            data?.user?.id || null
          );
          
          if (octopusResult.success) {
            // console.log('User successfully added to Octopus contacts');
            // Clear stored user info after successful Octopus integration
            await apiClient.clearUserInfo();
          } else {
            // Check if it's a 404 error (endpoint not implemented)
            if (octopusResult.error && octopusResult.error.includes('404')) {
              // console.log('Octopus endpoints not implemented yet - user verification still successful');
            } else {
              // console.warn('Failed to add user to Octopus contacts:', octopusResult.error);
            }
            // Don't fail the verification if Octopus fails
          }
        }
      } catch (octopusError) {
        // Check if it's a 404 error (endpoint not implemented)
        if (octopusError.message && octopusError.message.includes('404')) {
          // console.log('Octopus endpoints not implemented yet - user verification still successful');
        } else {
          // console.warn('Octopus integration error:', octopusError);
        }
        // Don't fail the verification if Octopus fails
      }

      setLoading(false);
      return { data: { message: 'Email verified successfully' }, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error: { message: error.message || 'Email verification failed' } };
    }
  };

  // Mobile-specific email verification (uses same endpoint as web)
  const verifyEmailMobile = async (token) => {
    setLoading(true);
    
    try {
      const { data, error } = await apiClient.verifyEmailMobile(token);
      
      if (error) {
        setLoading(false);
        return { data: null, error: { message: error } };
      }

      // After successful email verification, add user to Octopus contacts
      try {
        // Extract user info from the verification response if available
        let userEmail = data?.user?.email || data?.email;
        let userName = data?.user?.fullName || data?.fullName || data?.user?.name || 'User';
        
        // If user info not in response, try to get it from stored data
        if (!userEmail || userName === 'User') {
          const storedUserInfo = await apiClient.getUserInfo();
          if (storedUserInfo) {
            userEmail = userEmail || storedUserInfo.email;
            userName = userName === 'User' ? storedUserInfo.fullName : userName;
          }
        }
        
        if (userEmail) {
          // Add user to Octopus contacts with "New User" tag
          const octopusResult = await octopusEmailService.addUserToContacts(
            userEmail, 
            userName, 
            data?.user?.id || null
          );
          
          if (octopusResult.success) {
            // console.log('User successfully added to Octopus contacts');
            // Clear stored user info after successful Octopus integration
            await apiClient.clearUserInfo();
          } else {
            // Check if it's a 404 error (endpoint not implemented)
            if (octopusResult.error && octopusResult.error.includes('404')) {
              // console.log('Octopus endpoints not implemented yet - user verification still successful');
            } else {
              // console.warn('Failed to add user to Octopus contacts:', octopusResult.error);
            }
            // Don't fail the verification if Octopus fails
          }
        }
      } catch (octopusError) {
        // Check if it's a 404 error (endpoint not implemented)
        if (octopusError.message && octopusError.message.includes('404')) {
          // console.log('Octopus endpoints not implemented yet - user verification still successful');
        } else {
          // console.warn('Octopus integration error:', octopusError);
        }
        // Don't fail the verification if Octopus fails
      }

      setLoading(false);
      return { data: { message: 'Email verified successfully' }, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error: { message: error.message || 'Email verification failed' } };
    }
  };

  const requestPasswordReset = async (email) => {
    setLoading(true);
    
    try {
      const { data, error } = await apiClient.requestPasswordReset(email);
      
      if (error) {
        setLoading(false);
        return { data: null, error: { message: error } };
      }

      setLoading(false);
      return { data: { message: 'Password reset email sent' }, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error: { message: error.message || 'Password reset request failed' } };
    }
  };


  const signOut = async () => {
    setLoading(true);
    
    try {
      await apiClient.logout();
      setUser(null);
      
      // Clear session-based notification keys on logout
      try {
        const sessionId = await AsyncStorage.getItem('current_login_session_id');
        if (sessionId) {
          // Clear upgrade screen notification for this session
          await AsyncStorage.removeItem(`upgrade_screen_notification_${sessionId}`);
          // Clear referral screen notification for this session
          await AsyncStorage.removeItem(`referral_screen_notification_${sessionId}`);
          // Clear the session ID itself
          await AsyncStorage.removeItem('current_login_session_id');
        }
      } catch (error) {
        // Silent error handling
      }
      
      setLoading(false);
      return { data: { success: true }, error: null };
    } catch (error) {
      setLoading(false);
      return { data: null, error: { message: error.message || 'Logout failed' } };
    }
  };

  const refreshUser = async () => {
    try {
      const { data, error } = await apiClient.getCurrentUser();
      if (data && !error) {
        setUser(data.user);
        
        // Check if this is a new account first (before checking AsyncStorage)
        const totalLimit = data.limits?.total_limit || 50;
        const backendUsed = data.used || 0;
        const backendRemaining = data.remaining || (totalLimit - backendUsed);
        
        
        // Check if this is a new account (both used and remaining are 0)
        if (backendUsed === 0 && backendRemaining === 0) {
          // New account - give full 50 scans and store in AsyncStorage
          // console.log('🆕 New account detected (refreshUser) - giving full 50 scans');
          
          const newAccountBalance = {
            remaining: 50,
            used: 0,
            plan: data.plan || 'free',
            limits: data.limits || { total_limit: 50 },
            isNewAccount: true
          };
          
          // Store new account balance in AsyncStorage
          try {
            await AsyncStorage.setItem('user_scan_balance', JSON.stringify(newAccountBalance));
            // console.log('💾 Stored new account balance in AsyncStorage (refreshUser):', newAccountBalance);
          } catch (error) {
            // console.error('❌ Error storing new account balance (refreshUser):', error);
          }
          
          // Set the scan balance immediately and mark as new account
          setScanBalance(newAccountBalance);
          
          // Also store a flag to prevent override
          try {
            await AsyncStorage.setItem('is_new_account', 'true');
            // console.log('🏷️ Marked account as new to prevent override (refreshUser)');
          } catch (error) {
            // console.error('❌ Error storing new account flag (refreshUser):', error);
          }
        } else {
          // Existing account - check AsyncStorage first, then fallback to backend
          try {
            // Check if this is a new account that should not be overridden
            const isNewAccount = await AsyncStorage.getItem('is_new_account');
            if (isNewAccount === 'true') {
              // console.log('🛡️ New account flag detected (refreshUser) - preventing override');
              // Don't override new account balance
              return;
            }
            
            const localBalance = await AsyncStorage.getItem('user_scan_balance');
            if (localBalance) {
              const parsedBalance = JSON.parse(localBalance);
              // console.log('🔄 Using local scan balance from AsyncStorage (refreshUser):', parsedBalance);
              
              // Cap used scans at the maximum limit to prevent overage display
              const totalLimit = parsedBalance.limits?.total_limit || 50;
              const cappedUsed = Math.min(totalLimit, parsedBalance.used || 0);
              const cappedRemaining = Math.max(0, totalLimit - cappedUsed);
              
              const cappedBalance = {
                ...parsedBalance,
                used: cappedUsed,
                remaining: cappedRemaining
              };
              
              // console.log('🔒 Capped scan balance in refreshUser:', cappedBalance);
              setScanBalance(cappedBalance);
            } else {
              // No local balance - use backend data but cap at limits
              const finalUsed = Math.min(totalLimit, backendUsed);
              const finalRemaining = Math.max(0, Math.min(totalLimit, backendRemaining));
              
              setScanBalance({
                remaining: finalRemaining,
                used: finalUsed,
                plan: data.plan || 'free',
                limits: data.limits || { total_limit: 50 }
              });
            }
          } catch (storageError) {
            // console.log('⚠️ Error reading local balance, using backend data');
            const finalUsed = Math.min(totalLimit, backendUsed);
            const finalRemaining = Math.max(0, Math.min(totalLimit, backendRemaining));
            
            setScanBalance({
              remaining: finalRemaining,
              used: finalUsed,
              plan: data.plan || 'free',
              limits: data.limits || { total_limit: 50 }
            });
          }
        }
        
        return { data: data.user, error: null };
      } else {
        return { data: null, error: error };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  };

  // Dedicated function to refresh only scan balance (without complex logic)
  const refreshScanBalance = async () => {
    try {
      const { data, error } = await apiClient.getCurrentUser();
      if (data && !error) {
        const totalLimit = data.limits?.total_limit || 50;
        const backendUsed = data.used || 0;
        const backendRemaining = data.remaining || (totalLimit - backendUsed);
        
        const cappedUsed = Math.min(totalLimit, backendUsed);
        const cappedRemaining = Math.max(0, Math.min(totalLimit, backendRemaining));
        
        // Create fresh scan balance
        const freshBalance = {
          remaining: cappedRemaining,
          used: cappedUsed,
          plan: data.plan || 'free',
          limits: data.limits || { total_limit: 50 }
        };
        
        // Update the scan balance context immediately
        setScanBalance(freshBalance);
        
        // Also update AsyncStorage with the fresh backend data
        await AsyncStorage.setItem('user_scan_balance', JSON.stringify(freshBalance));
        
        // console.log('✅ Scan balance refreshed directly:', freshBalance);
        return freshBalance;
      }
    } catch (error) {
      // console.error('❌ Error refreshing scan balance directly:', error);
      return null;
    }
  };

  const value = {
    user,
    scanBalance,
    loading,
    initializing,
    signIn,
    signUp,
    verifyEmail,
    verifyEmailMobile,
    requestPasswordReset,
    signOut,
    refreshUser,
    refreshScanBalance, // Add the new function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};