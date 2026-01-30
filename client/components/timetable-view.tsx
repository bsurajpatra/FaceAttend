import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles/timetable-view-styles';
import { TIME_SLOTS, getTimeRange, getSessionDuration } from '@/utils/timeSlots';

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
  onEdit?: () => void;
  onAdd?: () => void;
  onBack?: () => void;
};


export default function TimetableView({ timetable, onEdit, onAdd, onBack }: TimetableViewProps) {
  const insets = useSafeAreaInsets();

  const hasTimetable = () => {
    if (!timetable || !Array.isArray(timetable)) return false;
    return timetable.some(day => day?.sessions?.length > 0);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="chevron-back" size={20} color="white" />
        </Pressable>
        <Text style={styles.title}>Your Schedule</Text>
        {hasTimetable() ? (
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [styles.headerEditButton, pressed && styles.headerEditButtonPressed]}
          >
            <Ionicons name="create-outline" size={20} color="#2563EB" />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {!hasTimetable() ? (
          <View style={styles.emptyState}>
            <View style={{ backgroundColor: '#EFF6FF', padding: 32, borderRadius: 40, marginBottom: 24 }}>
              <Ionicons name="calendar-outline" size={80} color="#2563EB" />
            </View>
            <Text style={styles.emptyTitle}>No Schedule Set</Text>
            <Text style={styles.emptySubtitle}>
              Add your teaching hours to see your schedule here.
            </Text>
            <Pressable
              onPress={onAdd}
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            >
              <Text style={styles.addButtonText}>+ Setup Timetable</Text>
            </Pressable>
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
