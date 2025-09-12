import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { StyleSheet } from 'react-native';

type HourSelectModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectHour: (hours: number[]) => void;
  hours: number[];
  timeSlots: Array<{ hour: number; time: string; }>;
};

export function HourSelectModal({ visible, onClose, onSelectHour, hours, timeSlots }: HourSelectModalProps) {
  const [selectedHours, setSelectedHours] = useState<number[]>([]);

  const toggleHour = (hour: number) => {
    setSelectedHours(prev => 
      prev.includes(hour) 
        ? prev.filter(h => h !== hour)
        : [...prev, hour]
    );
  };

  const handleSubmit = () => {
    if (selectedHours.length > 0) {
      onSelectHour(selectedHours);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Hours</Text>
          <Text style={styles.modalSubtitle}>Select one or multiple hours</Text>
          
          {hours.map((hour) => {
            const timeSlot = timeSlots.find(slot => slot.hour === hour);
            if (!timeSlot) return null;
            
            const isSelected = selectedHours.includes(hour);
            
            return (
              <Pressable
                key={hour}
                style={styles.hourItem}
                onPress={() => toggleHour(hour)}
              >
                <View style={styles.checkboxContainer}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>
                <View style={styles.hourInfo}>
                  <Text style={styles.hourText}>Hour {hour}</Text>
                  <Text style={styles.timeText}>{timeSlot.time}</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.submitButton, selectedHours.length === 0 && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={selectedHours.length === 0}
            >
              <Text style={[
                styles.buttonText,
                styles.submitButtonText,
                selectedHours.length === 0 && styles.buttonTextDisabled
              ]}>
                Take Attendance
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  hourItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
  },
  checkboxSelected: {
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hourInfo: {
    flex: 1,
  },
  hourText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  submitButton: {
    backgroundColor: '#dc3545',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  submitButtonText: {
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#666',
  },
});
