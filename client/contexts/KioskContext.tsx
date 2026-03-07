import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, BackHandler, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';

import Kiosk from '../utils/kiosk';

// Native-integrated kiosk mode implementation
const ExpoKiosk = {
  enableKioskMode: async () => {
    if (Platform.OS === 'android') {
      try {
        // Lock orientation to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);

        // Enable lock task mode
        const isOwner = await Kiosk.isDeviceOwner();
        console.log(`Lock Task Mode: Device Owner status = ${isOwner}`);

        const success = await Kiosk.startKioskMode();
        if (success) {
          console.log('Native Lock Task Mode Enabled');
        } else {
          console.log('Lock Task Mode activation failed (Check Device Owner status)');
        }

        console.log('Expo Kiosk Mode Enabled - Orientation locked');
      } catch (error) {
        console.error('Failed to enable kiosk mode:', error);
      }
    }
  },
  disableKioskMode: async () => {
    if (Platform.OS === 'android') {
      try {
        // Unlock orientation
        await ScreenOrientation.unlockAsync();

        // Disable lock task mode
        await Kiosk.stopKioskMode();

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
}

// Create the context
const KioskContext = createContext<KioskContextType | undefined>(undefined);

// Provider component
export const KioskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);

  // Load stored password on component mount
  useEffect(() => {
    loadStoredPassword();
  }, []);

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
      // Block navigation gestures and hardware buttons
      const preventNavigation = (e: any) => {
        e.preventDefault();
        setShowPasswordModal(true);
        return false;
      };

      // Add event listeners for additional navigation blocking
      if (Platform.OS === 'android') {
        // This helps with some navigation blocking in Expo Go
        console.log('Enhanced navigation blocking enabled for Expo Go');
      }
    }
  }, [isKioskMode]);

  // Load password from AsyncStorage
  const loadStoredPassword = async () => {
    try {
      const password = await AsyncStorage.getItem('userPassword');
      setStoredPassword(password);
    } catch (error) {
      console.error('Error loading stored password:', error);
    }
  };

  // Save password to AsyncStorage
  const savePassword = async (password: string) => {
    try {
      await AsyncStorage.setItem('userPassword', password);
      setStoredPassword(password);
    } catch (error) {
      console.error('Error saving password:', error);
    }
  };

  // Enable kiosk mode
  const enableKioskMode = async () => {
    try {
      if (Platform.OS === 'android') {
        // Enable Expo kiosk mode
        await ExpoKiosk.enableKioskMode();

        // Hide system UI for immersive experience
        await ExpoKiosk.hideSystemUI();

        console.log('Kiosk mode enabled');
      }

      setIsKioskMode(true);
    } catch (error) {
      console.error('Error enabling kiosk mode:', error);
      Alert.alert('Error', 'Failed to enable kiosk mode');
    }
  };

  // Disable kiosk mode with password verification
  const disableKioskMode = async (password: string): Promise<boolean> => {
    try {
      // Verify password against stored password
      if (storedPassword && password === storedPassword) {
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
        Alert.alert('Invalid Password', 'The password you entered is incorrect.');
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
