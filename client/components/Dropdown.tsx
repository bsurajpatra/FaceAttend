import React from 'react';
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Option = { label: string; value: string };

type DropdownProps = {
  label: string;
  value: string | null;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function Dropdown({ label, value, options, placeholder = 'Select', onChange, disabled }: DropdownProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : '';
  }, [value, options]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.triggerPressed
        ]}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value ? selectedLabel : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? "#CBD5E1" : "#64748B"}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    item.value === value && styles.optionSelected,
                    pressed && styles.optionPressed
                  ]}
                >
                  <Text style={[
                    styles.optionText,
                    item.value === value && styles.optionTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
    marginLeft: 4,
  },
  labelDisabled: {
    color: '#94A3B8',
  },
  trigger: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  triggerDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  triggerPressed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  valueText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionPressed: {
    backgroundColor: '#F8FAFC',
  },
  optionText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#1E40AF',
    fontWeight: '800',
  },
});


