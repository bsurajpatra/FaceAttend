import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type HourSelectModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectHour: (hours: number[]) => void;
  hours: number[];
  timeSlots: Array<{ hour: number; time: string; }>;
  subject: string;
  section?: string;
  sessionType?: string;
};

export function HourSelectModal({ visible, onClose, onSelectHour, hours, timeSlots, subject, section, sessionType }: HourSelectModalProps) {
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const router = useRouter();

  const toggleHour = (hour: number) => {
    setSelectedHours(prev =>
      prev.includes(hour)
        ? prev.filter(h => h !== hour)
        : [...prev, hour]
    );
  };

  const handleSubmit = async () => {
    if (selectedHours.length > 0) {
      await router.push({
        pathname: '/take-attendance',
        params: {
          hours: JSON.stringify(selectedHours),
          subject: subject,
          section: section || 'S11',
          sessionType: sessionType || 'Lecture'
        }
      });
      onClose();
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="time" size={32} color="#2563EB" />
            </View>
            <Text style={styles.title}>Select Hours</Text>
            <Text style={styles.subtitle}>Choose one or multiple sessions</Text>
          </View>

          <View style={styles.listContainer}>
            {hours.map((hour) => {
              const timeSlot = timeSlots.find(slot => slot.hour === hour);
              if (!timeSlot) return null;
              const isSelected = selectedHours.includes(hour);

              return (
                <Pressable
                  key={hour}
                  style={({ pressed }) => [
                    styles.hourCard,
                    isSelected && styles.hourCardSelected,
                    pressed && styles.pressed
                  ]}
                  onPress={() => toggleHour(hour)}
                >
                  <View style={styles.hourCardLeft}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                    <View style={styles.hourInfo}>
                      <Text style={[styles.hourText, isSelected && styles.hourTextSelected]}>
                        Hour {hour}
                      </Text>
                      <Text style={styles.timeText}>{timeSlot.time}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.submitButton,
                selectedHours.length === 0 && styles.buttonDisabled,
                pressed && selectedHours.length > 0 && styles.pressed
              ]}
              onPress={handleSubmit}
              disabled={selectedHours.length === 0}
            >
              <Text style={styles.submitButtonText}>CONTINUE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 8,
  },
  hourCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  hourCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  hourCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'white',
  },
  checkboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  hourInfo: {
    flex: 1,
  },
  hourText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  hourTextSelected: {
    color: '#1E40AF',
  },
  timeText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  buttonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
