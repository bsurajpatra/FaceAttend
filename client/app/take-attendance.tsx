import React, { useLayoutEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import CameraView from '../components/camera-view';
import { useKiosk } from '@/contexts/KioskContext';

const TakeAttendancePage = () => {
  const params = useLocalSearchParams<{ subject: string; hours: string }>();
  const hours = params.hours ? JSON.parse(params.hours) : [];
  const navigation = useNavigation();
  const { isKioskMode, setShowPasswordModal } = useKiosk();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Take Attendance',
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (isKioskMode) {
              setShowPasswordModal(true);
            } else {
              // @ts-ignore - type mismatch between expo-router and RN types
              navigation.goBack();
            }
          }}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ fontSize: 16, color: 'white' }}>←Back                </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isKioskMode, setShowPasswordModal]);
  
  return (
    <CameraView
      subjectCode={params.subject || ''}
      hours={hours}
    />
  );
};

export default TakeAttendancePage;
