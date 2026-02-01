import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles/timetable-view-styles';
import { TIME_SLOTS, getTimeRange, getSessionDuration } from '@/utils/timeSlots';
import { Sidebar } from './sidebar';

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

type TimetableViewProps = {
  timetable: TimetableDay[];
  onBack?: () => void;
  onLogout?: () => void;
};


export default function TimetableView({ timetable, onBack, onLogout }: TimetableViewProps) {
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hasTimetable = () => {
    if (!timetable || !Array.isArray(timetable)) return false;
    return timetable.some(day => day?.sessions?.length > 0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRoute="/timetable"
        onLogout={onLogout}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => setSidebarOpen(true)}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="menu" size={24} color="white" />
        </Pressable>
        <Text style={styles.title}>Your Schedule</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View style={{ marginHorizontal: 20, marginTop: 16, marginBottom: 8, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' }}>
          <Text style={{ fontSize: 13, color: '#1E40AF', lineHeight: 18 }}>
            To update or modify your timetable, please visit the <Text style={{ fontWeight: '700' }}>ERP Portal</Text>.
          </Text>
        </View>

        {!hasTimetable() ? (
          <View style={styles.emptyState}>
            <View style={{ backgroundColor: '#F1F5F9', padding: 32, borderRadius: 40, marginBottom: 24 }}>
              <Ionicons name="calendar-outline" size={80} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Schedule Found</Text>
            <Text style={styles.emptySubtitle}>
              Please set up your teaching hours in the ERP Portal.
            </Text>
          </View>
        ) : (
          <View style={styles.timetableContainer}>
            {timetable.map((day) => day.sessions?.length > 0 && (
              <View key={day.day} style={styles.dayContainer}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{day.day}</Text>
                  <View style={styles.sessionCount}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#2563EB' }}>
                      {day.sessions.length} SESSIONS
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionsContainer}>
                  {day.sessions.map((session, sessionIndex) => (
                    <View key={sessionIndex} style={styles.sessionCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <Text style={styles.subjectName}>{session.subject}</Text>
                        <View style={styles.sessionTypeBadge}>
                          <Text style={styles.sessionTypeText}>{session.sessionType.toUpperCase()}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="people-outline" size={14} color="#64748B" />
                          <Text style={styles.sectionText}>{session.section}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="location-outline" size={14} color="#64748B" />
                          <Text style={styles.roomText}>Room {session.roomNumber}</Text>
                        </View>
                      </View>

                      <View style={styles.timeText}>
                        <Ionicons name="time-outline" size={16} color="#2563EB" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>
                          {getTimeRange(session.hours)}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#64748B', marginLeft: 8 }}>
                          ({getSessionDuration(session.hours)})
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
