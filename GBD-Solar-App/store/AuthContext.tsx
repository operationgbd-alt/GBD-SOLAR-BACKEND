import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface AuthUser {
  id: string;
  username: string;
  role: 'master' | 'ditta' | 'tecnico';
  name: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
}

interface RegisterUserData {
  username: string;
  password: string;
  role: 'ditta' | 'tecnico';
  name: string;
  email: string;
  phone?: string;
  companyId: string;
  companyName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  hasValidToken: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerUser: (userData: RegisterUserData) => Promise<{ success: boolean; userId: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'solartech_auth_token';
const USER_KEY = 'solartech_user';
const REGISTERED_USERS_KEY = 'solartech_registered_users';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DEMO_ACCOUNTS: Record<string, { password: string; user: AuthUser }> = {
  gbd: {
    password: 'password',
    user: {
      id: '17ac45dc-2e12-4226-90f5-49db2d8ac92b',
      username: 'gbd',
      role: 'master',
      name: 'Amministratore Master',
      email: 'admin@gbd.it',
      companyId: null,
      companyName: null,
    },
  },
  ditta: {
    password: 'password',
    user: {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      username: 'ditta',
      role: 'ditta',
      name: 'Ditta GBD',
      email: 'info@gbd-ba.it',
      companyId: '11111111-1111-1111-1111-111111111111',
      companyName: 'GBD B&A S.r.l.',
    },
  },
  alex: {
    password: 'password',
    user: {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      username: 'alex',
      role: 'tecnico',
      name: 'Alessandro Tecnico',
      email: 'alex@gbd-ba.it',
      companyId: '11111111-1111-1111-1111-111111111111',
      companyName: 'GBD B&A S.r.l.',
    },
  },
  billo: {
    password: 'password',
    user: {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      username: 'billo',
      role: 'tecnico',
      name: 'Billo Tecnico',
      email: 'billo@gbd-ba.it',
      companyId: '11111111-1111-1111-1111-111111111111',
      companyName: 'GBD B&A S.r.l.',
    },
  },
  solarpro: {
    password: 'password',
    user: {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      username: 'solarpro',
      role: 'ditta',
      name: 'Solar Pro',
      email: 'info@solarpro.it',
      companyId: '22222222-2222-2222-2222-222222222222',
      companyName: 'Solar Pro S.r.l.',
    },
  },
  luca: {
    password: 'password',
    user: {
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      username: 'luca',
      role: 'tecnico',
      name: 'Luca Tecnico',
      email: 'luca@solarpro.it',
      companyId: '22222222-2222-2222-2222-222222222222',
      companyName: 'Solar Pro S.r.l.',
    },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<Record<string, { password: string; user: AuthUser }>>({});

  // Centralized handler for 401 responses - forces logout when token expires
  const handleUnauthorized = useCallback(async () => {
    console.log('[AUTH] Unauthorized response received - forcing logout');
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('[AUTH] Error clearing storage:', e);
    }
    api.setToken(null);
    setUser(null);
    setHasValidToken(false);
    setIsDemoMode(false);
  }, []);

  const loadStoredAuth = useCallback(async () => {
    try {
      // Register the 401 handler FIRST - this ensures any API call that returns 401
      // will trigger a logout, even during the initial load
      api.setOnUnauthorized(handleUnauthorized);
      
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      
      if (storedToken && storedUser) {
        console.log('[AUTH LOAD] Found stored token, setting up session...');
        api.setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setHasValidToken(true);
        setIsDemoMode(false);
        console.log('[AUTH LOAD] Session restored - token will be validated on first API call');
        // Note: If the token is invalid, the first API call will return 401
        // and handleUnauthorized will be called automatically
      } else if (storedUser && !storedToken) {
        // User exists but no token - this was a demo mode session
        // Force a fresh login to get a real token
        console.log('[AUTH LOAD] Found user but NO TOKEN - was demo mode, forcing login');
        await AsyncStorage.removeItem(USER_KEY);
        setUser(null);
        setHasValidToken(false);
        setIsDemoMode(false);
      } else {
        console.log('[AUTH LOAD] No stored auth found, user must login');
        setUser(null);
        setHasValidToken(false);
      }
      
      const storedRegisteredUsers = await AsyncStorage.getItem(REGISTERED_USERS_KEY);
      if (storedRegisteredUsers) {
        const parsed = JSON.parse(storedRegisteredUsers);
        console.log('[AUTH LOAD] Found registered users:', Object.keys(parsed));
        setRegisteredUsers(parsed);
      } else {
        console.log('[AUTH LOAD] No registered users found');
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const login = useCallback(async (username: string, password: string) => {
    console.log('[AUTH LOGIN] Attempting API login for:', username);
    
    // Always try API login first
    try {
      const result = await api.login(username, password);
      if (result.success && result.data) {
        const { token, user: userData } = result.data;
        
        // Validate that we have all required data
        if (!token || !userData || !userData.role) {
          console.log('[AUTH LOGIN] Invalid API response - missing token or user data');
          return { success: false, error: 'Risposta del server non valida. Riprova.' };
        }
        
        console.log('[AUTH LOGIN] API login successful, token received');
        console.log('[AUTH LOGIN] User data received:', JSON.stringify(userData));
        
        // Map backend response to our User type
        // Backend returns company: { id, name } but we need companyId and companyName
        const normalizedUser = {
          id: userData.id,
          username: userData.username,
          name: userData.name,
          email: userData.email,
          role: userData.role.toLowerCase() as 'master' | 'ditta' | 'tecnico',
          companyId: userData.company?.id || userData.companyId || null,
          companyName: userData.company?.name || userData.companyName || null,
        };
        console.log('[AUTH LOGIN] Normalized user:', JSON.stringify(normalizedUser));
        
        await AsyncStorage.setItem(TOKEN_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        api.setToken(token);
        setUser(normalizedUser);
        setIsDemoMode(false);
        setHasValidToken(true);
        return { success: true };
      } else {
        console.log('[AUTH LOGIN] API login failed:', result.error);
        // In production, return the actual error
        if (!__DEV__) {
          return { success: false, error: result.error || 'Login fallito. Verifica le credenziali.' };
        }
      }
    } catch (error: any) {
      console.log('[AUTH LOGIN] API login network error:', error);
      
      // In PRODUCTION mode, do NOT fallback to demo mode - show real error
      if (!__DEV__) {
        const errorMessage = error?.message || 'Impossibile connettersi al server. Verifica la connessione internet.';
        console.log('[AUTH LOGIN] Production mode - returning real error:', errorMessage);
        return { success: false, error: errorMessage };
      }
    }

    // Fallback to demo mode ONLY in development
    if (__DEV__) {
      console.log('[AUTH LOGIN] DEV MODE: Trying demo mode fallback...');
      
      const demoAccount = DEMO_ACCOUNTS[username.toLowerCase()];
      if (demoAccount && demoAccount.password === password) {
        console.log('[AUTH LOGIN] Demo account found, WARNING: no API token, limited functionality');
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(demoAccount.user));
        await AsyncStorage.removeItem(TOKEN_KEY);
        api.setToken(null);
        setUser(demoAccount.user);
        setIsDemoMode(true);
        setHasValidToken(false);
        return { success: true };
      }

      console.log('[AUTH LOGIN] Checking registered users for:', username.toLowerCase());
      console.log('[AUTH LOGIN] Available registered users:', Object.keys(registeredUsers));
      const registeredAccount = registeredUsers[username.toLowerCase()];
      if (registeredAccount && registeredAccount.password === password) {
        console.log('[AUTH LOGIN] Found registered user:', registeredAccount.user.username);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(registeredAccount.user));
        await AsyncStorage.removeItem(TOKEN_KEY);
        api.setToken(null);
        setUser(registeredAccount.user);
        setIsDemoMode(true);
        setHasValidToken(false);
        return { success: true };
      }
    }

    console.log('[AUTH LOGIN] No matching account found');
    return { success: false, error: 'Credenziali non valide o impossibile connettersi al server' };
  }, [registeredUsers]);

  const registerUser = useCallback(async (userData: RegisterUserData) => {
    const usernameKey = userData.username.toLowerCase();
    
    if (DEMO_ACCOUNTS[usernameKey] || registeredUsers[usernameKey]) {
      return { success: false, userId: '', error: 'Username già in uso' };
    }

    const userId = generateId();
    const newUser: AuthUser = {
      id: userId,
      username: userData.username.toLowerCase(),
      role: userData.role,
      name: userData.name,
      email: userData.email,
      companyId: userData.companyId,
      companyName: userData.companyName,
    };

    const updatedRegisteredUsers = {
      ...registeredUsers,
      [usernameKey]: {
        password: userData.password,
        user: newUser,
      },
    };

    try {
      console.log('[AUTH REGISTER] Saving user:', usernameKey, 'with companyId:', userData.companyId);
      await AsyncStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedRegisteredUsers));
      console.log('[AUTH REGISTER] User saved successfully');
      setRegisteredUsers(updatedRegisteredUsers);
      return { success: true, userId };
    } catch (error) {
      console.error('[AUTH REGISTER] Error registering user:', error);
      return { success: false, userId: '', error: 'Errore durante la registrazione' };
    }
  }, [registeredUsers]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      api.setToken(null);
      setUser(null);
      setIsDemoMode(false);
      setHasValidToken(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isDemoMode,
    hasValidToken,
    login,
    logout,
    registerUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
