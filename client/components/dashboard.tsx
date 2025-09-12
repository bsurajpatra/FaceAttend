import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { styles } from './styles/dashboard-styles';

type User = {
  id: string;
  name: string;
  username: string;
};

type DashboardProps = {
  user: User;
  onLogout?: () => void;
  onTakeAttendance?: () => void;
  onTimetablePress?: () => void;
  onViewReports?: () => void;
};

export default function Dashboard({ 
  user, 
  onLogout, 
  onTakeAttendance, 
  onTimetablePress,
  onViewReports 
}: DashboardProps) {
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
        <View style={styles.welcomeSection}>
          <Text style={styles.welcome}>Welcome back!</Text>
          <Text style={styles.userName}>{user.name}</Text>
        </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Classes Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Students Present</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <Pressable
          onPress={onTakeAttendance}
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

        <Pressable
          onPress={onViewReports}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="View Reports"
        >
          <Text style={styles.actionButtonText}>View Reports</Text>
        </Pressable>

      </View>
      </ScrollView>
    </View>
  );
}
