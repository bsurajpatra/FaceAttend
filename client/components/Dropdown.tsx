import React from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';

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
    <View style={{ marginBottom: 16 }}>
      <Text style={{ marginBottom: 6, fontWeight: '600', color: '#111827' }}>{label}</Text>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ pressed }) => ({
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 8,
          backgroundColor: disabled ? '#F3F4F6' : '#FFFFFF',
          opacity: pressed ? 0.95 : 1,
        })}
      >
        <Text style={{ color: value ? '#111827' : '#6B7280' }}>{value ? selectedLabel : placeholder}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setOpen(false)}>
          <View style={{ marginTop: '30%', marginHorizontal: 20, backgroundColor: 'white', borderRadius: 12, padding: 12 }}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 8, opacity: pressed ? 0.9 : 1 })}
                >
                  <Text style={{ color: '#111827' }}>{item.label}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}


