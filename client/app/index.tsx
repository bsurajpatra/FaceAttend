import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { SafeAreaView, View, Text, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { styles } from '@/components/styles/welcome-styles';
import Login from '@/components/login';
import Dashboard from '@/components/dashboard';
import { loginApi } from '@/api/auth';

export default function WelcomeScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const loginOpacity = useRef(new Animated.Value(0)).current;
  const loginTranslateY = useRef(new Animated.Value(0)).current;

  // Check for saved login state on app start
  useEffect(() => {
    const checkLoginState = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        const savedToken = await AsyncStorage.getItem('token');
        
        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.log('Error loading saved login state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginState();
  }, []);

  useEffect(() => {
    if (isLoading) return; // Don't show animation while loading
    
    const delayMs = 2000; // keep logo centered for 2 seconds
    const shiftUpBy = 0;
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: shiftUpBy,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(headerScale, {
          toValue: 0.7,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(loginOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(loginTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, delayMs);
  }, [headerTranslateY, headerScale, loginOpacity, loginTranslateY, isLoading]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (isLoggedIn && user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <Dashboard
          user={user}
          onLogout={async () => {
            // Clear saved login state
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('token');
            setIsLoggedIn(false);
            setUser(null);
            setErrorMessage(null);
          }}
          onTakeAttendance={() => {
            console.log('Take Attendance pressed');
          }}
          onViewReports={() => {
            console.log('View Reports pressed');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.select({ ios: 60, default: 24 }) }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentInsetAdjustmentBehavior="never"
        >
          <View style={styles.content}>
            <Animated.View style={[
          styles.headerContainer,
          { transform: [{ translateY: headerTranslateY }, { scale: headerScale }] },
        ]}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="FaceAttend logo"
          />
          <View style={styles.messageContainer}>
            <Text style={styles.appName}>FaceAttend</Text>
          </View>
            </Animated.View>

            <Animated.View style={[styles.loginContainer, { opacity: loginOpacity, transform: [{ translateY: loginTranslateY }] }]}>
              <Login
                onSubmit={async ({ username, password }) => {
                  setErrorMessage(null);
                  setIsSubmitting(true);
                  try {
                    const { token, user } = await loginApi({ username, password });
                    // Save login state to AsyncStorage
                    await AsyncStorage.setItem('user', JSON.stringify(user));
                    await AsyncStorage.setItem('token', token);
                    console.log('Logged in:', user.username, token.substring(0, 12) + '...');
                    setUser(user);
                    setIsLoggedIn(true);
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || 'Login failed';
                    setErrorMessage(msg);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                onRegisterPress={() => {}}
                onForgotPasswordPress={() => {}}
                isSubmitting={isSubmitting}
                errorMessage={errorMessage}
              />
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


