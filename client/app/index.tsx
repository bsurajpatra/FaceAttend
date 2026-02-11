import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { View, Text, Animated, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { styles } from '@/components/styles/welcome-styles';
import Login from '@/components/login';
import Dashboard from '@/components/dashboard';
import { loginApi, logoutApi } from '@/api/auth';
import { getTimetableApi, TimetableDay } from '@/api/timetable';
import { useKiosk } from '@/contexts/KioskContext';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDeviceId } from '@/utils/device';

export default function WelcomeScreen() {
  const { isLoggedIn, user, login, logout, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setStoredPassword } = useKiosk();
  // Initialize with proper empty timetable structure
  const getEmptyTimetable = (): TimetableDay[] => [
    { day: 'Monday', sessions: [] },
    { day: 'Tuesday', sessions: [] },
    { day: 'Wednesday', sessions: [] },
    { day: 'Thursday', sessions: [] },
    { day: 'Friday', sessions: [] },
    { day: 'Saturday', sessions: [] },
    { day: 'Sunday', sessions: [] }
  ];

  const [timetable, setTimetable] = useState<TimetableDay[]>(getEmptyTimetable());
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const loginOpacity = useRef(new Animated.Value(0)).current;
  const loginTranslateY = useRef(new Animated.Value(0)).current;

  // Check for saved login state on app start
  useEffect(() => {
    const fetchTimetable = async () => {
      if (isLoggedIn && user) {
        try {
          const response = await getTimetableApi(user.id);
          setTimetable(response.timetable || getEmptyTimetable());
        } catch (error) {
          setTimetable(getEmptyTimetable());
        }
      }
    };

    fetchTimetable();
  }, [isLoggedIn, user]);

  const { socket, isTrusted, setIsTrusted } = useSocket();

  useEffect(() => {
    if (!socket || !isLoggedIn || !user) return;

    const handleTimetableUpdate = (data: { timetable: TimetableDay[] }) => {
      console.log('Socket: Received timetable_updated event');
      setTimetable(data.timetable || getEmptyTimetable());
    };

    socket.on('timetable_updated', handleTimetableUpdate);

    socket.on('force_logout', async (data: { deviceId: string }) => {
      const deviceId = await getDeviceId();
      console.log(`WelcomeScreen: force_logout check - incoming: ${data.deviceId}, local: ${deviceId}`);

      if (data.deviceId.toLowerCase().trim() === deviceId.toLowerCase().trim()) {
        console.log('WelcomeScreen: ID match! Logging out...');
        await logout();
        setErrorMessage(null);
      }
    });

    return () => {
      socket.off('timetable_updated', handleTimetableUpdate);
      socket.off('force_logout');
    };
  }, [socket, isLoggedIn, user]);

  useEffect(() => {
    if (isAuthLoading) return; // Don't show animation while loading

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
  }, [headerTranslateY, headerScale, loginOpacity, loginTranslateY, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (isLoggedIn && user) {
    return (
      <Dashboard
        user={user}
        timetable={timetable}
        isTrusted={isTrusted ?? false}
        onLogout={async () => {
          // Call server-side logout for audit logging
          await logoutApi();
          await logout();
          setErrorMessage(null);
        }}
        onTakeAttendance={() => {
          // The HourSelectModal will handle navigation to camera
        }}
      />
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
                    const { token, user, isTrusted: trusted } = await loginApi({ username, password });
                    await login(user, token, trusted ?? false);
                    // Store password for kiosk mode
                    await setStoredPassword(password);
                    setIsTrusted(trusted ?? false);
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || 'Login failed';
                    setErrorMessage(msg);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
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
