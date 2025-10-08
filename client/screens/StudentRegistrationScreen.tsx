import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, Alert, Platform, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getTimetableApi, TimetableDay } from '@/api/timetable';
import Dropdown from '@/components/Dropdown';
import { registerStudentApi } from '@/api/students';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StudentRegistrationScreen() {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [timetable, setTimetable] = useState<TimetableDay[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [faceImageBase64, setFaceImageBase64] = useState<string | null>(null);
  const faceReady = !!faceDescriptor || !!faceImageBase64;

  const [cameraOpen, setCameraOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const userRaw = await AsyncStorage.getItem('user');
        if (!userRaw) return;
        const user = JSON.parse(userRaw) as { id: string };
        const res = await getTimetableApi(user.id);
        setTimetable(res.timetable || []);
      } catch (e) {
        console.error('Failed to fetch timetable', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    timetable.forEach((d) => d.sessions.forEach((s) => set.add(s.subject)));
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [timetable]);

  const sectionOptions = useMemo(() => {
    if (!subject) return [] as { label: string; value: string }[];
    const set = new Set<string>();
    timetable.forEach((d) => d.sessions.filter((s) => s.subject === subject).forEach((s) => set.add(s.section)));
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [timetable, subject]);

  const sessionOptions = useMemo(() => {
    if (!subject || !section) return [] as { label: string; value: string }[];
    const set = new Set<string>();
    timetable.forEach((d) => d.sessions.filter((s) => s.subject === subject && s.section === section).forEach((s) => set.add(s.sessionType)));
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [timetable, subject, section]);

  const openCamera = async () => {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) return;
    }
    setCountdown(3);
    setCameraOpen(true);
  };

  useEffect(() => {
    if (!cameraOpen) return;
    if (countdown <= 0) {
      captureFrame();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cameraOpen, countdown]);

  const captureFrame = async () => {
    try {
      console.log('[StudentRegistration] requesting picture...');
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.8 });
      console.log('[StudentRegistration] picture taken?', !!photo, 'base64?', !!photo?.base64, 'size:', photo?.width, 'x', photo?.height);
      if (!photo?.base64) throw new Error('No frame');
      // Store base64 for server-side embedding (Expo Go compatible)
      setFaceImageBase64(photo.base64);
      // Clear any previous descriptor (we rely on server computation)
      setFaceDescriptor(null);
      setCameraOpen(false);
      Alert.alert('Face captured', 'Image captured successfully. You can now register.');
    } catch (e) {
      console.error('Capture failed', e);
      Alert.alert('Capture failed', String(e));
      Alert.alert('Capture failed', 'Try again');
    }
  };

  const canSubmit = name && rollNumber && subject && section && sessionType && faceReady;

  const onRegister = async () => {
    if (!canSubmit || !subject || !section || !sessionType || !faceReady) return;
    try {
      setLoading(true);
      const res = await registerStudentApi({
        name,
        rollNumber,
        subject,
        section,
        sessionType: sessionType as any,
        // Prefer descriptor if present, else send base64 for server-side embedding
        ...(faceDescriptor ? { faceDescriptor } : {}),
        ...(faceImageBase64 ? { faceImageBase64 } : {}),
      });
      Alert.alert('Success', 'Student registered');
      setName('');
      setRollNumber('');
      setSubject(null);
      setSection(null);
      setSessionType(null);
      setFaceDescriptor(null);
      setFaceImageBase64(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#F9FAFB' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Student Registration</Text>

      <Text style={{ marginBottom: 6, fontWeight: '600' }}>Student Name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Enter name" style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12 }} />

      <Text style={{ marginBottom: 6, fontWeight: '600' }}>Roll Number</Text>
      <TextInput value={rollNumber} onChangeText={setRollNumber} placeholder="Enter roll number" autoCapitalize="characters" style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12 }} />

      <Dropdown label="Subject" value={subject} onChange={setSubject} options={subjectOptions} />
      <Dropdown label="Section" value={section} onChange={setSection} options={sectionOptions} disabled={!subject} />
      <Dropdown label="Session Type" value={sessionType} onChange={setSessionType} options={sessionOptions} disabled={!subject || !section} />

      <Pressable
        onPress={openCamera}
        style={({ pressed }) => ({ backgroundColor: '#111827', paddingVertical: 12, borderRadius: 8, alignItems: 'center', opacity: pressed ? 0.9 : 1, marginBottom: 12 })}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>{faceReady ? 'Retake Face' : 'Capture Face'}</Text>
      </Pressable>

      {faceReady && (
        <Text style={{ color: '#059669', fontWeight: '600', marginBottom: 12 }}>Face captured ✔</Text>
      )}

      {faceImageBase64 && (
        <View style={{ marginBottom: 12 }}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${faceImageBase64}` }}
            style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#10B981' }}
          />
        </View>
      )}

      <Pressable
        onPress={onRegister}
        disabled={!canSubmit || !!loading}
        style={({ pressed }) => ({ backgroundColor: !canSubmit ? '#9CA3AF' : '#2563EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center', opacity: pressed ? 0.95 : 1 })}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>{loading ? 'Registering...' : 'Register'}</Text>
      </Pressable>

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <View style={{ position: 'absolute', top: Platform.OS === 'android' ? 32 : 56, left: 0, right: 0, alignItems: 'center', zIndex: 2 }}>
            <Text style={{ color: 'white', fontSize: 32, fontWeight: '800' }}>{countdown}</Text>
          </View>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
        </View>
      </Modal>
    </View>
  );
}


