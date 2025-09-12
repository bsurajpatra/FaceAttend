import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import CameraView from '../components/camera-view';

const TakeAttendancePage = () => {
  const params = useLocalSearchParams<{ subject: string; hours: string }>();
  const hours = params.hours ? JSON.parse(params.hours) : [];
  
  return (
    <CameraView
      subjectCode={params.subject || ''}
      hours={hours}
    />
  );
};

export default TakeAttendancePage;
