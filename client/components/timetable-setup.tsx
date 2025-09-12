import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { styles } from './styles/timetable-setup-styles';

type Session = {
  subject: string;
  sessionType: 'Lecture' | 'Tutorial' | 'Practical' | 'Skill';
  section: string;
  hours: number[];
};

type TimetableDay = {
  day: string;
  sessions: Session[];
};

type TimetableSetupProps = {
  onSubmit?: (timetable: TimetableDay[]) => Promise<void> | void;
  onSkip?: () => void;
  isSubmitting?: boolean;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SESSION_TYPES = ['Lecture', 'Tutorial', 'Practical', 'Skill'] as const;

// College time slots (11 working hours)
const TIME_SLOTS = [
  { hour: 1, time: '7:10 - 8:00', duration: '50 mins' },
  { hour: 2, time: '8:00 - 8:50', duration: '50 mins' },
  { hour: 3, time: '9:20 - 10:10', duration: '50 mins' },
  { hour: 4, time: '10:10 - 11:00', duration: '50 mins' },
  { hour: 5, time: '11:10 - 12:00', duration: '50 mins' },
  { hour: 6, time: '12:00 - 12:50', duration: '50 mins' },
  { hour: 7, time: '12:55 - 1:45', duration: '50 mins' },
  { hour: 8, time: '1:50 - 2:40', duration: '50 mins' },
  { hour: 9, time: '2:40 - 3:30', duration: '50 mins' },
  { hour: 10, time: '3:50 - 4:40', duration: '50 mins' },
  { hour: 11, time: '4:40 - 5:30', duration: '50 mins' },
];

export default function TimetableSetup({ onSubmit, onSkip, isSubmitting = false }: TimetableSetupProps) {
  const [timetable, setTimetable] = useState<TimetableDay[]>(
    DAYS.map(day => ({ day, sessions: [] }))
  );

  const addSession = (dayIndex: number) => {
    const newSession: Session = {
      subject: '',
      sessionType: 'Lecture',
      section: '',
      hours: []
    };
    
    const updatedTimetable = [...timetable];
    updatedTimetable[dayIndex].sessions.push(newSession);
    setTimetable(updatedTimetable);
  };

  const updateSession = (dayIndex: number, sessionIndex: number, field: keyof Session, value: any) => {
    const updatedTimetable = [...timetable];
    updatedTimetable[dayIndex].sessions[sessionIndex] = {
      ...updatedTimetable[dayIndex].sessions[sessionIndex],
      [field]: value
    };
    setTimetable(updatedTimetable);
  };

  const removeSession = (dayIndex: number, sessionIndex: number) => {
    const updatedTimetable = [...timetable];
    updatedTimetable[dayIndex].sessions.splice(sessionIndex, 1);
    setTimetable(updatedTimetable);
  };

  const toggleHour = (dayIndex: number, sessionIndex: number, hour: number) => {
    const updatedTimetable = [...timetable];
    const session = updatedTimetable[dayIndex].sessions[sessionIndex];
    const hours = session.hours.includes(hour)
      ? session.hours.filter(h => h !== hour)
      : [...session.hours, hour].sort();
    
    updateSession(dayIndex, sessionIndex, 'hours', hours);
  };

  const getSessionDuration = (hours: number[]) => {
    if (hours.length === 1) return '1 hour (50 mins)';
    if (hours.length === 2) return '2 hours (100 mins)';
    return `${hours.length} hours`;
  };

  const validateConsecutiveHours = (hours: number[]) => {
    if (hours.length === 0) return true;
    const sorted = [...hours].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        return false;
      }
    }
    return true;
  };

  const getTimeRange = (hours: number[]) => {
    if (hours.length === 0) return '';
    const sorted = [...hours].sort((a, b) => a - b);
    const startSlot = TIME_SLOTS.find(slot => slot.hour === sorted[0]);
    const endSlot = TIME_SLOTS.find(slot => slot.hour === sorted[sorted.length - 1]);
    if (startSlot && endSlot) {
      return `${startSlot.time.split(' - ')[0]} - ${endSlot.time.split(' - ')[1]}`;
    }
    return '';
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(timetable);
      return;
    }

    // Basic validation
    const hasSessions = timetable.some(day => day.sessions.length > 0);
    if (!hasSessions) {
      Alert.alert('No Sessions', 'Please add at least one session to your timetable.');
      return;
    }

    console.log('Timetable data:', timetable);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Up Your Timetable</Text>
      <Text style={styles.subtitle}>Add your teaching sessions for each day</Text>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {timetable.map((day, dayIndex) => (
          <View key={day.day} style={styles.dayContainer}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day.day}</Text>
              <Pressable
                onPress={() => addSession(dayIndex)}
                style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Add session for ${day.day}`}
              >
                <Text style={styles.addButtonText}>+ Add Session</Text>
              </Pressable>
            </View>

            {day.sessions.map((session, sessionIndex) => (
              <View key={sessionIndex} style={styles.sessionContainer}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionNumber}>Session {sessionIndex + 1}</Text>
                  <Pressable
                    onPress={() => removeSession(dayIndex, sessionIndex)}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Remove session"
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </Pressable>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Subject</Text>
                  <TextInput
                    value={session.subject}
                    onChangeText={(value) => updateSession(dayIndex, sessionIndex, 'subject', value)}
                    placeholder="e.g., Mathematics"
                    style={styles.input}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Session Type</Text>
                  <View style={styles.sessionTypeContainer}>
                    {SESSION_TYPES.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => updateSession(dayIndex, sessionIndex, 'sessionType', type)}
                        style={({ pressed }) => [
                          styles.sessionTypeButton,
                          session.sessionType === type && styles.sessionTypeButtonSelected,
                          pressed && styles.sessionTypeButtonPressed
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={type}
                      >
                        <Text style={[
                          styles.sessionTypeText,
                          session.sessionType === type && styles.sessionTypeTextSelected
                        ]}>
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Section</Text>
                  <TextInput
                    value={session.section}
                    onChangeText={(value) => updateSession(dayIndex, sessionIndex, 'section', value)}
                    placeholder="e.g., A, B, C"
                    style={styles.input}
                    editable={!isSubmitting}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Time Slots (Select consecutive hours)</Text>
                  <Text style={styles.durationText}>
                    Duration: {getSessionDuration(session.hours)}
                    {session.hours.length > 0 && ` • ${getTimeRange(session.hours)}`}
                  </Text>
                  {session.hours.length > 0 && !validateConsecutiveHours(session.hours) && (
                    <Text style={styles.warningText}>
                      ⚠️ Please select consecutive hours only
                    </Text>
                  )}
                  <View style={styles.hoursContainer}>
                    {TIME_SLOTS.map((slot) => (
                      <Pressable
                        key={slot.hour}
                        onPress={() => toggleHour(dayIndex, sessionIndex, slot.hour)}
                        style={({ pressed }) => [
                          styles.hourButton,
                          session.hours.includes(slot.hour) && styles.hourButtonSelected,
                          pressed && styles.hourButtonPressed
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Hour ${slot.hour}: ${slot.time}`}
                      >
                        <Text style={[
                          styles.hourText,
                          session.hours.includes(slot.hour) && styles.hourTextSelected
                        ]}>
                          {slot.hour}
                        </Text>
                        <Text style={[
                          styles.timeText,
                          session.hours.includes(slot.hour) && styles.timeTextSelected
                        ]}>
                          {slot.time}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onSkip}
          style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Skip timetable setup"
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Save timetable"
        >
          <Text style={styles.submitButtonText}>Save Timetable</Text>
        </Pressable>
      </View>
    </View>
  );
}
