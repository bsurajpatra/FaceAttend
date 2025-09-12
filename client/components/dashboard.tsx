import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { styles } from './styles/dashboard-styles';
import { HourSelectModal } from './hour-select-modal';

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
  timetable: TimetableDay[];
  onLogout?: () => void;
  onTakeAttendance?: (hours: number[]) => void;
  onTimetablePress?: () => void;
};

const TIME_SLOTS = [
  { hour: 1, time: '7:10 - 8:00' },
  { hour: 2, time: '8:00 - 8:50' },
  { hour: 3, time: '9:20 - 10:10' },
  { hour: 4, time: '10:10 - 11:00' },
  { hour: 5, time: '11:10 - 12:00' },
  { hour: 6, time: '12:00 - 12:50' },
  { hour: 7, time: '12:55 - 1:45' },
  { hour: 8, time: '1:50 - 2:40' },
  { hour: 9, time: '2:40 - 3:30' },
  { hour: 10, time: '3:50 - 4:40' },
  { hour: 11, time: '4:40 - 5:30' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Dashboard({ 
  user, 
  timetable,
  onLogout, 
  onTakeAttendance, 
  onTimetablePress
}: DashboardProps) {
  const [isHoursModalVisible, setHoursModalVisible] = useState(false);

  const getCurrentSession = () => {
    const now = new Date();
    const currentDay = DAYS[now.getDay()];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find today's schedule
    const todaySchedule = timetable.find(day => day.day === currentDay);
    if (!todaySchedule) return null;

    // Helper function to convert time string to minutes since midnight
    const timeToMinutes = (timeStr: string) => {
      const [start] = timeStr.split(' - ');
      const [hours, minutes] = start.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Current time in minutes since midnight
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Find current session
    for (const session of todaySchedule.sessions) {
      const timeSlots = session.hours.map(hour => TIME_SLOTS[hour - 1]).filter(Boolean);
      if (timeSlots.length === 0) continue;

      // Get combined time range
      const firstSlot = timeSlots[0];
      const lastSlot = timeSlots[timeSlots.length - 1];
      if (!firstSlot || !lastSlot) continue;

      const sessionStartTime = timeToMinutes(firstSlot.time);
      const [, endTime] = lastSlot.time.split(' - ');
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const sessionEndTime = endHour * 60 + endMinute;

      if (currentTimeInMinutes >= sessionStartTime && currentTimeInMinutes <= sessionEndTime) {
        const timeRange = `${firstSlot.time.split(' - ')[0]} - ${endTime}`;
        return {
          ...session,
          timeSlot: timeRange,
          timeSlots: timeSlots,
        };
      }
    }

    return null;
  };
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
          onPress={onLogout}
          style={({ pressed }) => [styles.headerLogoutButton, pressed && styles.headerLogoutButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Text style={styles.headerLogoutText}>Logout</Text>
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
          const currentSession = getCurrentSession();
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
                  </View>
                  <View style={styles.sessionDetails}>
                    <Text style={styles.detailText}>Section: {currentSession.section}</Text>
                    <Text style={styles.detailText}>Room: {currentSession.roomNumber}</Text>
                    <Text style={styles.detailText}>Time: {currentSession.timeSlot}</Text>
                  </View>
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
                </View>
                {isHoursModalVisible && (
                  <HourSelectModal
                    visible={isHoursModalVisible}
                    onClose={() => setHoursModalVisible(false)}
                    onSelectHour={(hour) => {
                      setHoursModalVisible(false);
                      onTakeAttendance && onTakeAttendance(hour);
                    }}
                    hours={currentSession.hours}
                    timeSlots={TIME_SLOTS}
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
          onPress={() => {
            const currentSession = getCurrentSession();
            if (currentSession) {
              setHoursModalVisible(true);
            }
          }}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Take Attendance"
        >
          <Text style={styles.actionButtonText}>Take Attendance</Text>
        </Pressable>

        <Pressable
          onPress={onTimetablePress}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Timetable"
        >
          <Text style={styles.actionButtonText}>Timetable</Text>
        </Pressable>
      </View>
      </ScrollView>
    </View>
  );
}
