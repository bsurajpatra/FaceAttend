import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { styles } from './styles/dashboard-styles';
import { HourSelectModal } from './hour-select-modal';
import AttendanceReports from './attendance-reports';
import { TimetableDay as ApiTimetableDay, Session as ApiSession } from '@/api/timetable';
import { TIME_SLOTS, getCurrentSession } from '@/utils/timeSlots';
import { getStudentsApi } from '@/api/students';
import { checkAttendanceStatusApi, updateAttendanceLocationApi } from '@/api/attendance';

type User = {
  id: string;
  name: string;
  username: string;
};

type Session = {
  subject: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Practical' | 'Skill';
  section: string;
  roomNumber: string;
  hours: number[];
};

type TimetableDay = {
  day: string;
  sessions: Session[];
};

type DashboardProps = {
  user: User;
  timetable: ApiTimetableDay[];
  onLogout?: () => void;
  onTakeAttendance?: (hours: number[]) => void;
  onTimetablePress?: () => void;
  onViewReports?: () => void;
};


export default function Dashboard({ 
  user, 
  timetable,
  onLogout, 
  onTakeAttendance, 
  onTimetablePress,
  onViewReports
}: DashboardProps) {
  const [isHoursModalVisible, setHoursModalVisible] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [hasRegisteredStudents, setHasRegisteredStudents] = useState<boolean | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [isCheckingStudents, setIsCheckingStudents] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [isCheckingAttendance, setIsCheckingAttendance] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);

  // Format location to show both address and coordinates
  const formatLocation = (location: any) => {
    if (!location) return 'Location unavailable';
    
    const hasAddress = location.address && location.address.trim() !== '';
    const hasCoordinates = location.latitude && location.longitude;
    
    if (hasAddress && hasCoordinates) {
      return `${location.address} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
    } else if (hasAddress) {
      return location.address;
    } else if (hasCoordinates) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    } else {
      return 'Location unavailable';
    }
  };

  // Check if students are registered for the current session
  const checkRegisteredStudents = async (session: any) => {
    if (!session) {
      setHasRegisteredStudents(null);
      return;
    }

    setIsCheckingStudents(true);
    try {
      const response = await getStudentsApi(session.subject, session.section);
      const count = response.students.length;
      setRegisteredCount(count);
      setHasRegisteredStudents(count > 0);
      // If we already have attendance status, align totalStudents to latest registered count for display
      setAttendanceStatus((prev: any) => {
        if (!prev) return prev;
        return { ...prev, totalStudents: count };
      });
    } catch (error: any) {
      // Handle 401 errors (logged out) gracefully
      if (error?.response?.status === 401) {
        console.log('User not authenticated, skipping student check');
        setHasRegisteredStudents(false);
      } else {
        console.error('Failed to check registered students:', error);
        setHasRegisteredStudents(false);
      }
    } finally {
      setIsCheckingStudents(false);
    }
  };

  // Check if attendance has been taken for today's session
  const checkAttendanceStatus = async (session: any) => {
    if (!session) {
      setAttendanceStatus(null);
      return;
    }

    setIsCheckingAttendance(true);
    try {
      const response = await checkAttendanceStatusApi(session.subject, session.section, session.sessionType);
      // Merge latest registered count (if known) so totals reflect newly registered students
      setAttendanceStatus((prev: any) => {
        const merged = registeredCount != null ? { ...response, totalStudents: registeredCount } : response;
        // Preserve last known location if server doesn't provide one
        if (prev?.location && !merged.location) {
          merged.location = prev.location;
        }
        return merged;
      });
    } catch (error: any) {
      // Handle 401 errors (logged out) gracefully
      if (error?.response?.status === 401) {
        console.log('User not authenticated, skipping attendance status check');
        setAttendanceStatus(null);
      } else {
        console.error('Failed to check attendance status:', error);
        setAttendanceStatus(null);
      }
    } finally {
      setIsCheckingAttendance(false);
    }
  };

  // Sync and show current device location on the card
  const syncCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let addressText = '';
      try {
        const geocodes = await Location.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        const first = geocodes && geocodes[0];
        if (first) {
          const parts = [first.name, first.street, first.district, first.city, first.region, first.postalCode]
            .filter(Boolean)
            .join(', ');
          addressText = parts;
        }
      } catch {}

      const loc = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        address: addressText,
      };
      // Store location separately so it displays even when attendance is not taken
      setCurrentLocation(loc);
      setAttendanceStatus((prev: any) => ({ ...(prev || {}), location: loc }));
      // Persist location to current session if known
      try {
        if (attendanceStatus?.sessionId) {
          await updateAttendanceLocationApi(attendanceStatus.sessionId, loc);
        }
      } catch {}
    } catch (e) {
      // Ignore location errors for silent UX
    }
  };

  // Update current session when timetable changes
  useEffect(() => {
    const session = getCurrentSession(timetable);
    setCurrentSession(session);
    checkRegisteredStudents(session);
    checkAttendanceStatus(session);
    // Sync location automatically when session changes
    if (session) {
      syncCurrentLocation();
    }
  }, [timetable]);

  // Update current session every 30 seconds to handle time changes and student updates
  useEffect(() => {
    const interval = setInterval(() => {
      const session = getCurrentSession(timetable);
      setCurrentSession(session);
      checkRegisteredStudents(session);
      checkAttendanceStatus(session);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [timetable]);

  // Check for students and attendance status whenever dashboard comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentSession) {
        checkRegisteredStudents(currentSession);
        checkAttendanceStatus(currentSession);
        syncCurrentLocation();
      }
    }, [currentSession])
  );
  return (
    <View style={styles.container}>
      {/* Header with logo, app name, and logout */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
            accessibilityLabel="FaceAttend logo"
          />
          <Text style={styles.appName}>FaceAttend</Text>
        </View>
        <Pressable
          onPress={() => {
            try {
              // @ts-ignore using expo-router link via global import
              require('expo-router').router.push('/settings');
            } catch {}
          }}
          style={({ pressed }) => [styles.headerLogoutButton, pressed && styles.headerLogoutButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Text style={styles.headerLogoutText}>Settings</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        {/* Welcome Message */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeGreeting}>Welcome back,</Text>
          <Text style={styles.welcomeName}>{user.name}</Text>
        </View>

        {/* Current Session Card */}
        {(() => {
          if (currentSession) {
            return (
              <View style={styles.currentSessionCard}>
                <Text style={styles.currentSessionLabel}>Current Session</Text>
                <View style={styles.currentSessionContent}>
                  <View style={styles.sessionMainInfo}>
                    <Text style={styles.subjectText}>{currentSession.subject}</Text>
                    <View style={styles.sessionTypeBadge}>
                      <Text style={styles.sessionTypeText}>{currentSession.sessionType}</Text>
                    </View>
                    {/* Refresh Button - Top Right */}
                    <Pressable
                      onPress={() => {
                        checkRegisteredStudents(currentSession);
                        checkAttendanceStatus(currentSession);
                        syncCurrentLocation();
                      }}
                      style={({ pressed }) => [
                        styles.refreshButton,
                        pressed && styles.refreshButtonPressed
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Refresh student and attendance status"
                    >
                      <Text style={styles.refreshButtonText}>🔄</Text>
                    </Pressable>
                  </View>
                  <View style={styles.sessionDetails}>
                    <Text style={styles.detailText}>Section: {currentSession.section}</Text>
                    <Text style={styles.detailText}>Room: {currentSession.roomNumber}</Text>
                    <Text style={styles.detailText}>Time: {currentSession.timeSlot}</Text>
                    <Text style={styles.detailText}>Location: {formatLocation(currentLocation || attendanceStatus?.location)} 
                    </Text>
                  </View>
                  {(() => {
                    if (hasRegisteredStudents === false) {
                      return (
                        <View style={[styles.takeAttendanceButton, styles.disabledButton]}>
                          <Text style={styles.takeAttendanceButtonText}>No Students Registered</Text>
                        </View>
                      );
                    }
                    
                    if (attendanceStatus?.hasAttendance) {
                      const attendancePercentage = Math.round((attendanceStatus.presentStudents / attendanceStatus.totalStudents) * 100);
                      const attendanceTime = new Date(attendanceStatus.updatedAt).toLocaleTimeString();
                      return (
                        <View style={styles.attendanceTakenContainer}>
                          <View style={styles.attendanceTakenInfo}>
                            <Text style={styles.attendanceTakenButtonText}>✅ Attendance Taken</Text>
                            <Text style={styles.attendanceDetailsText}>
                              {attendanceStatus.presentStudents}/{attendanceStatus.totalStudents} present ({attendancePercentage}%)
                            </Text>
                            <Text style={styles.attendanceTimeText}>Completed at {attendanceTime}</Text>
                          </View>
                          <Pressable
                            onPress={() => setHoursModalVisible(true)}
                            style={({ pressed }) => [
                              styles.retakeAttendanceButton,
                              pressed && styles.retakeAttendanceButtonPressed
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Retake attendance for missed students"
                          >
                            <Text style={styles.retakeAttendanceButtonText}>Retake Attendance</Text>
                          </Pressable>
                        </View>
                      );
                    }
                    
                    return (
                      <Pressable
                        onPress={() => setHoursModalVisible(true)}
                        style={({ pressed }) => [
                          styles.takeAttendanceButton,
                          pressed && styles.takeAttendanceButtonPressed
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Take attendance for current session"
                      >
                        <Text style={styles.takeAttendanceButtonText}>Take Attendance</Text>
                      </Pressable>
                    );
                  })()}
                </View>
                {isHoursModalVisible && (
                  <HourSelectModal
                    visible={isHoursModalVisible}
                    onClose={() => setHoursModalVisible(false)}
                    onSelectHour={(hours) => {
                      setHoursModalVisible(false);
                      onTakeAttendance && onTakeAttendance(hours);
                    }}
                    hours={currentSession.hours}
                    timeSlots={TIME_SLOTS}
                    subject={currentSession.subject}
                    section={currentSession.section}
                    sessionType={currentSession.sessionType}
                  />
                )}
              </View>
            );
          }
          return (
            <View style={styles.noSessionCard}>
              <Text style={styles.noSessionText}>No ongoing session at the moment</Text>
              <Text style={styles.noSessionSubtext}>Check your timetable for upcoming sessions</Text>
            </View>
          );
        })()}

      <View style={styles.actionsContainer}>

        <Pressable
          onPress={onTimetablePress}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Timetable"
        >
          <Text style={styles.actionButtonText}>Timetable</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            // Navigate to student registration screen
            try {
              // @ts-ignore using expo-router link via global import
              require('expo-router').router.push('/student-registration');
            } catch {}
          }}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Register Student"
        >
          <Text style={styles.actionButtonText}>Register Student</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            try {
              // @ts-ignore using expo-router link via global import
              require('expo-router').router.push('/attendance-reports');
            } catch {}
          }}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="View Reports"
        >
          <Text style={styles.actionButtonText}>View Attendance Reports</Text>
        </Pressable>
      </View>
      </ScrollView>

    </View>
  );
}
