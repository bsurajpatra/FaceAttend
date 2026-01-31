import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, Alert, ActivityIndicator, Pressable } from 'react-native';
import LiveAttendance from '../components/live-attendance';
import { startAttendanceSessionApi } from '@/api/attendance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getDeviceName } from '@/utils/device';

const TakeAttendancePage = () => {
  const params = useLocalSearchParams<{ subject: string; hours: string; section: string; sessionType: string }>();

  // Stabilize hours array to prevent infinite loops in useEffect
  const hours: number[] = React.useMemo(() => {
    try {
      return params.hours ? JSON.parse(params.hours) : [];
    } catch (e) {
      return [];
    }
  }, [params.hours]);

  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingAttendance, setExistingAttendance] = useState<any>(null);
  const [isSessionCreating, setIsSessionCreating] = useState(false);

  useEffect(() => {
    const startSession = async () => {
      // If we already have a session or are creating one, or if there's already an error, don't proceed
      if (isSessionCreating || sessionId || error) return;

      try {
        setIsSessionCreating(true);
        setLoading(true);

        console.log('Starting attendance session for:', params.subject, hours);

        // Get faculty info
        const userRaw = await AsyncStorage.getItem('user');
        if (!userRaw) {
          setError('User not logged in');
          return;
        }

        const user = JSON.parse(userRaw);

        // Get current location
        let locationData = undefined;
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            // Get address from coordinates
            const addressResponse = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });

            const address = addressResponse[0];
            const addressString = [
              address?.street,
              address?.city,
              address?.region,
              address?.country
            ].filter(Boolean).join(', ');

            locationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              address: addressString,
              accuracy: location.coords.accuracy || undefined
            };
          }
        } catch (locationError) {
          console.warn('Failed to get location:', locationError);
          // Continue without location data
        }

        // Start attendance session
        const result = await startAttendanceSessionApi({
          subject: params.subject || '',
          section: params.section || '',
          sessionType: (params.sessionType as any) || 'Lecture',
          hours: hours,
          location: locationData
        });

        setSessionId(result.sessionId);

        // Check if this is an existing session with attendance data
        if (result.presentStudents !== undefined && result.absentStudents !== undefined) {
          setExistingAttendance({
            presentStudents: result.presentStudents,
            absentStudents: result.absentStudents,
            markedStudents: result.students.map((student: any) => ({
              id: student.id,
              name: student.name,
              rollNumber: student.rollNumber,
              isPresent: student.isPresent || false
            }))
          });
        }

        console.log('Attendance session started:', result);

      } catch (err: any) {
        console.error('Failed to start attendance session:', err);
        const serverError = err?.response?.data;
        if (serverError?.code === 'DEVICE_NOT_TRUSTED') {
          setError('DEVICE_NOT_TRUSTED');
        } else {
          setError(serverError?.message || 'Failed to start attendance session');
        }
      } finally {
        setLoading(false);
        setIsSessionCreating(false);
      }
    };

    startSession();
  }, [params.subject, params.section, params.sessionType, hours]); // Removed isSessionCreating from deps

  const handleAttendanceMarked = (data: any) => {
    console.log('Attendance marked:', data);
    // You can add additional logic here, like showing notifications
  };

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>
          Starting attendance session...
        </Text>
      </View>
    );
  }

  if (error) {
    // Check for different types of errors
    const isNoStudentsError = error.includes('No students enrolled') || error.includes('No students registered');
    const isRateLimitError = error.includes('Please wait before creating another session') || error.includes('429');
    const isUntrustedError = error === 'DEVICE_NOT_TRUSTED' || error.includes('not trusted') || error.includes('Attendance operations are restricted');

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20 }}>
        <Text style={{ fontSize: 20, color: isUntrustedError ? '#EF4444' : isNoStudentsError ? '#6B7280' : isRateLimitError ? '#F59E0B' : '#EF4444', textAlign: 'center', marginBottom: 16, fontWeight: '800', fontStyle: 'italic', textTransform: 'uppercase' }}>
          {isUntrustedError ? 'Device Not Trusted' :
            isNoStudentsError ? 'No Students Registered' :
              isRateLimitError ? 'Please Wait' :
                'Operation Failed'}
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 20, fontWeight: '500' }}>
          {isUntrustedError
            ? 'This device is currently untrusted. Sensitive attendance operations are blocked for security.'
            : isNoStudentsError
              ? `No students are registered for ${params.subject} - Section ${params.section} - ${params.sessionType}`
              : isRateLimitError
                ? 'Please wait a moment before trying to start attendance again.'
                : error
          }
        </Text>

        {isUntrustedError && (
          <View style={{ backgroundColor: '#FEE2E2', padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#FCA5A5', marginTop: 10, marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#B91C1C', textAlign: 'center', fontWeight: '700' }}>
              HOW TO FIX:
            </Text>
            <Text style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', marginTop: 4 }}>
              1. Log in to the ERP Web Portal{'\n'}
              2. Go to "My Devices" section{'\n'}
              3. Click "Trust This Device" for: {getDeviceName()}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <Pressable
            onPress={() => {
              setError(null);
              // startSession is defined inside useEffect, so we need to trigger the effect.
              // Actually, we can move startSession out or just use a ref/state to re-trigger.
              // For now, simpler to just use router.back() or just re-run the logic.
              router.replace({
                pathname: "/take-attendance",
                params: params as any
              });
            }}
            style={{ backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '800', textTransform: 'uppercase' }}>Retry Connection</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#4B5563', fontWeight: '800', textTransform: 'uppercase' }}>Go Back</Text>
          </Pressable>
        </View>
        {isNoStudentsError && (
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }}>
            Please register students for this course first.
          </Text>
        )}
        {isRateLimitError && (
          <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }}>
            This prevents creating duplicate sessions too quickly.
          </Text>
        )}
      </View>
    );
  }

  if (!sessionId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <Text style={{ fontSize: 18, color: '#6B7280' }}>
          Session not found
        </Text>
      </View>
    );
  }

  return (
    <LiveAttendance
      sessionId={sessionId}
      subject={params.subject || ''}
      section={params.section || ''}
      sessionType={params.sessionType || 'Lecture'}
      hours={hours}
      totalStudents={0} // Will be updated by the session
      onAttendanceMarked={handleAttendanceMarked}
      onClose={handleClose}
      existingAttendance={existingAttendance}
    />
  );
};

export default TakeAttendancePage;
