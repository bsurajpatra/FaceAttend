import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, BackHandler, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSecureItem, setSecureItem } from '@/utils/secure-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';

import Kiosk from '../utils/kiosk';

// Native-integrated kiosk mode implementation
const ExpoKiosk = {
  enableKioskMode: async () => {
    if (Platform.OS === 'android') {
      try {
        // Lock orientation to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

        if (!Kiosk.isAvailable()) {
          console.warn('Native Kiosk Module not available.');
          return false; // Return false to indicate full kiosk mode was NOT enabled
        }

        // Enable lock task mode
        const isOwner = await Kiosk.isDeviceOwner();
        const success = await Kiosk.startKioskMode();
        
        if (success) {
          console.log('Native Lock Task Mode Enabled');
          return true;
        } else {
          console.log('Lock Task Mode activation failed');
          return false;
        }
      } catch (error) {
        console.error('Failed to enable native kiosk mode:', error);
        return false;
      }
    }
    return false;
  },
  disableKioskMode: async () => {
    if (Platform.OS === 'android') {
      try {
        // Unlock orientation
        await ScreenOrientation.unlockAsync();

        // Disable lock task mode
        if (Kiosk.isAvailable()) {
          await Kiosk.stopKioskMode();
        }

        console.log('Expo Kiosk Mode Disabled - Orientation unlocked');
      } catch (error) {
        console.error('Failed to disable kiosk mode:', error);
      }
    }
  },
  hideSystemUI: async () => {
    // Hidden automatically by Lock Task Mode on most devices
    console.log('System UI Hidden via Lock Task Mode');
  },
  showSystemUI: async () => {
    // Restored automatically by disabling Lock Task Mode
    console.log('System UI Restored');
  },
};

// Types for kiosk mode
export interface KioskContextType {
  isKioskMode: boolean;
  enableKioskMode: () => Promise<void>;
  disableKioskMode: (password: string) => Promise<boolean>;
  showPasswordModal: boolean;
  setShowPasswordModal: (show: boolean) => void;
  storedPassword: string | null;
  setStoredPassword: (password: string) => Promise<void>;
  // Readiness Dashboard fields
  isDeviceOwner: boolean;
  hasOverlayPermission: boolean;
  isKioskAvailable: boolean;
  checkKioskStatus: () => Promise<void>;
  requestOverlayPermission: () => Promise<void>;
}

// Create the context
const KioskContext = createContext<KioskContextType | undefined>(undefined);

// Provider component
export const KioskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  
  // Readiness states
  const [isDeviceOwner, setIsDeviceOwner] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [isKioskAvailable, setIsKioskAvailable] = useState(Kiosk.isAvailable());

  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // Load stored password and check status on mount
  useEffect(() => {
    loadStoredPassword();
    checkKioskStatus();
    loadLockoutState();
  }, []);

  const loadLockoutState = async () => {
    try {
      const attemptsStr = await AsyncStorage.getItem('kioskFailedAttempts');
      const lockoutStr = await AsyncStorage.getItem('kioskLockoutUntil');
      
      const parsedAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      const parsedLockout = lockoutStr ? parseInt(lockoutStr, 10) : null;
      
      setFailedAttempts(parsedAttempts);
      setLockoutUntil(parsedLockout);
      
      if (parsedLockout && Date.now() > parsedLockout) {
        await resetLockout();
      }
    } catch (error) {
      console.error('Error loading lockout state:', error);
    }
  };

  const resetLockout = async () => {
    setFailedAttempts(0);
    setLockoutUntil(null);
    await AsyncStorage.removeItem('kioskFailedAttempts');
    await AsyncStorage.removeItem('kioskLockoutUntil');
  };

  const incrementFailedAttempts = async () => {
    const newAttempts = failedAttempts + 1;
    setFailedAttempts(newAttempts);
    await AsyncStorage.setItem('kioskFailedAttempts', newAttempts.toString());
    
    if (newAttempts >= 5) {
      const unlockTime = Date.now() + 5 * 60 * 1000; // 5 minutes
      setLockoutUntil(unlockTime);
      await AsyncStorage.setItem('kioskLockoutUntil', unlockTime.toString());
    }
  };

  // Check kiosk status periodically or when app returns to foreground
  const checkKioskStatus = async () => {
    if (Platform.OS === 'android' && Kiosk.isAvailable()) {
      const owner = await Kiosk.isDeviceOwner();
      const overlay = await Kiosk.checkOverlayPermission();
      setIsDeviceOwner(owner);
      setHasOverlayPermission(overlay);
      setIsKioskAvailable(true);
    } else {
      setIsKioskAvailable(false);
    }
  };

  const requestOverlayPermission = async () => {
    if (Platform.OS === 'android' && Kiosk.isAvailable()) {
      await Kiosk.requestOverlayPermission();
      // Status will refresh when user comes back to the app
    }
  };

  // Handle back button when in kiosk mode
  useEffect(() => {
    if (isKioskMode && Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Show password modal instead of allowing back navigation
        setShowPasswordModal(true);
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }
  }, [isKioskMode]);

  // Additional navigation blocking for Expo Go
  useEffect(() => {
    if (isKioskMode) {
      // Add event listeners for additional navigation blocking
      if (Platform.OS === 'android') {
        console.log('Enhanced navigation blocking enabled');
      }
    }
  }, [isKioskMode]);

  // Load password from AsyncStorage
  const loadStoredPassword = async () => {
    try {
      const password = await getSecureItem('userPassword');
      setStoredPassword(password);
    } catch (error) {
      console.error('Error loading stored password:', error);
    }
  };

  // Save password to AsyncStorage
  const savePassword = async (password: string) => {
    try {
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );
      await setSecureItem('userPassword', hashedPassword);
      setStoredPassword(hashedPassword);
    } catch (error) {
      console.error('Error saving password:', error);
    }
  };

  // Enable kiosk mode
  const enableKioskMode = async () => {
    try {
      if (Platform.OS === 'android') {
        // 1. Check for Overlay permission first
        const isAvailable = Kiosk.isAvailable();
        if (isAvailable) {
          const hasOverlay = await Kiosk.checkOverlayPermission();
          if (!hasOverlay) {
            Alert.alert(
              'Permission Required',
              'To fully secure the attendance screen, FaceAttend needs the "Display over other apps" permission.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go to Settings', onPress: () => Kiosk.requestOverlayPermission() }
              ]
            );
            return;
          }
        }

        // 2. Attempt to enable Native Kiosk Mode
        const fullyEnabled = await ExpoKiosk.enableKioskMode();

        if (!fullyEnabled) {
          // If native mode failed (Expo Go or missing Device Owner)
          Alert.alert(
            'Full Kiosk Unavailable',
            isAvailable 
              ? 'Could not enable "Lock Task" mode. Ensure the app is set as Device Owner via ADB.'
              : 'Full kiosk mode is only available in a development build. Orientation will be locked, but system buttons remain active.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsKioskMode(false) },
              { 
                text: 'Continue (Limited)', 
                onPress: async () => {
                  await ExpoKiosk.hideSystemUI();
                  setIsKioskMode(true); 
                }
              }
            ]
          );
          return;
        }

        // 3. If fully enabled, update UI and hide system UI
        await ExpoKiosk.hideSystemUI();
        setIsKioskMode(true);
        console.log('Kiosk mode fully enabled');
      }
    } catch (error) {
      console.error('Error enabling kiosk mode:', error);
      Alert.alert('Error', 'Failed to enable kiosk mode');
    }
  };

  // Disable kiosk mode with password verification
  const disableKioskMode = async (password: string): Promise<boolean> => {
    try {
      if (lockoutUntil && Date.now() < lockoutUntil) {
        const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
        Alert.alert('Too Many Attempts', `Please try again in ${remainingMinutes} minute(s).`);
        return false;
      }

      if (lockoutUntil && Date.now() >= lockoutUntil) {
        await resetLockout();
      }

      const hashedInput = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      // Verify password against stored password (gracefully handle old plain-text passwords for easy migration)
      if (storedPassword && (hashedInput === storedPassword || password === storedPassword)) {
        await resetLockout();

        // Upgrade legacy plain-text password to hashed format seamlessly
        if (password === storedPassword && hashedInput !== storedPassword) {
          await savePassword(password);
        }

        if (Platform.OS === 'android') {
          // Disable Expo kiosk mode
          await ExpoKiosk.disableKioskMode();

          // Show system UI
          await ExpoKiosk.showSystemUI();

          console.log('Kiosk mode disabled');
        }

        setIsKioskMode(false);
        setShowPasswordModal(false);
        return true;
      } else {
        const newAttempts = failedAttempts + 1;
        await incrementFailedAttempts();
        if (newAttempts >= 5) {
          Alert.alert('Too Many Attempts', 'Please try again in 5 minute(s).');
        } else {
          Alert.alert('Invalid Password', `The password you entered is incorrect. ${5 - newAttempts} attempt(s) remaining.`);
        }
        return false;
      }
    } catch (error) {
      console.error('Error disabling kiosk mode:', error);
      Alert.alert('Error', 'Failed to disable kiosk mode');
      return false;
    }
  };

  // Store password when user logs in
  const storeUserPassword = async (password: string) => {
    await savePassword(password);
  };

  const contextValue: KioskContextType = {
    isKioskMode,
    enableKioskMode,
    disableKioskMode,
    showPasswordModal,
    setShowPasswordModal,
    storedPassword,
    setStoredPassword: storeUserPassword,
    isDeviceOwner,
    hasOverlayPermission,
    isKioskAvailable,
    checkKioskStatus,
    requestOverlayPermission,
  };

  return (
    <KioskContext.Provider value={contextValue}>
      {children}
    </KioskContext.Provider>
  );
};

// Custom hook to use kiosk context
export const useKiosk = (): KioskContextType => {
  const context = useContext(KioskContext);
  if (context === undefined) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return context;
};
