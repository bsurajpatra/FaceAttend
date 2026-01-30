import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, Alert, Platform, Image, Linking, StyleSheet, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { getTimetableApi, TimetableDay } from '@/api/timetable';
import Dropdown from '@/components/Dropdown';
import { registerStudentApi } from '@/api/students';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Sidebar } from '../components/sidebar';

export default function StudentRegistrationScreen() {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [timetable, setTimetable] = useState<TimetableDay[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(true);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [faceImageBase64, setFaceImageBase64] = useState<string | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const faceReady = (!!faceDescriptor && faceDescriptor.length > 0) || !!faceImageBase64;

  const [cameraOpen, setCameraOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      router.replace('/');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

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
    if (!subject || !section || !sessionType) {
      Alert.alert('Select Class Context', 'Please select Subject, Section, and Component first.');
      return;
    }
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) return;
    }
    setCountdown(3);
    setCameraOpen(true);
  };

  const uploadPhoto = async () => {
    if (!subject || !section || !sessionType) {
      Alert.alert('Select Class Context', 'Please select Subject, Section, and Component first.');
      return;
    }
    try {
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!currentPermission.granted) {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library access is required to upload photos.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          setFaceImageBase64(asset.base64);
          setFaceDescriptor(null);
          setCapturedImageUri(`data:image/jpeg;base64,${asset.base64}`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo.');
    }
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
      const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.8 });
      if (!photo?.base64) throw new Error('No frame');
      setFaceImageBase64(photo.base64);
      setFaceDescriptor(null);
      setCapturedImageUri(`data:image/jpeg;base64,${photo.base64}`);
      setCameraOpen(false);
    } catch (e) {
      setCameraOpen(false);
      Alert.alert('Capture Failed', 'Could not take the picture.');
    }
  };

  const canSubmit = name && rollNumber && subject && section && sessionType && faceReady;

  useEffect(() => {
    if (subject && section && sessionType) {
      const timer = setTimeout(() => setContextExpanded(false), 500);
      return () => clearTimeout(timer);
    }
  }, [subject, section, sessionType]);

  const onRegister = async () => {
    if (!canSubmit || !subject || !section || !sessionType || !faceReady) return;
    try {
      setLoading(true);
      await registerStudentApi({
        name,
        rollNumber,
        subject,
        section,
        sessionType: sessionType as any,
        faceDescriptor: faceDescriptor || [],
        faceImageBase64: faceImageBase64 || undefined,
      });
      Alert.alert('Success', 'Student registered successfully!');
      setName('');
      setRollNumber('');
      setFaceDescriptor(null);
      setFaceImageBase64(null);
      setCapturedImageUri(null);
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRoute="/student-registration"
        onLogout={handleLogout}
      />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => setSidebarOpen(true)}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Register Student</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Pressable
            onPress={() => setContextExpanded(!contextExpanded)}
            style={styles.cardHeader}
          >
            <View>
              <Text style={styles.stepTitle}>STEP 1</Text>
              <Text style={styles.cardTitle}>Class Context</Text>
            </View>
            <Ionicons
              name={contextExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#3B82F6"
            />
          </Pressable>

          {contextExpanded || (!subject || !section || !sessionType) ? (
            <View style={styles.cardBody}>
              <Dropdown label="SUBJECT" value={subject} onChange={(v) => { setSubject(v); setSection(null); setSessionType(null); }} options={subjectOptions} />
              <Dropdown label="SECTION" value={section} onChange={(v) => { setSection(v); setSessionType(null); }} options={sectionOptions} disabled={!subject} />
              <Dropdown label="COMPONENT" value={sessionType} onChange={setSessionType} options={sessionOptions} disabled={!subject || !section} />
            </View>
          ) : (
            <View style={styles.minimizedContext}>
              <View style={styles.contextBadge}>
                <Ionicons name="book-outline" size={14} color="#2563EB" />
                <Text style={styles.contextText}>{subject}</Text>
              </View>
              <View style={styles.contextBadge}>
                <Ionicons name="people-outline" size={14} color="#2563EB" />
                <Text style={styles.contextText}>SEC {section}</Text>
              </View>
              <View style={styles.contextBadge}>
                <Ionicons name="layers-outline" size={14} color="#2563EB" />
                <Text style={styles.contextText}>{sessionType}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.stepTitle}>STEP 2</Text>
              <Text style={styles.cardTitle}>Student Details</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, (!subject || !section || !sessionType) && styles.disabledLabel]}>STUDENT NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ex. John Doe"
                placeholderTextColor="#94A3B8"
                editable={!!subject && !!section && !!sessionType}
                style={[styles.input, (!subject || !section || !sessionType) && styles.disabledInput]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, (!subject || !section || !sessionType) && styles.disabledLabel]}>ROLL NUMBER</Text>
              <TextInput
                value={rollNumber}
                onChangeText={setRollNumber}
                placeholder="Ex. CS101"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                editable={!!subject && !!section && !!sessionType}
                style={[styles.input, (!subject || !section || !sessionType) && styles.disabledInput]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, (!subject || !section || !sessionType) && styles.disabledLabel]}>FACE PHOTO</Text>
              <View style={styles.photoActions}>
                <Pressable
                  onPress={openCamera}
                  disabled={!subject || !section || !sessionType}
                  style={({ pressed }) => [
                    styles.photoButton,
                    styles.cameraButton,
                    (!subject || !section || !sessionType) && styles.disabledPhotoButton,
                    pressed && styles.buttonPressed
                  ]}
                >
                  <Ionicons name="camera" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.photoButtonText}>CAPTURE</Text>
                </Pressable>

                <Pressable
                  onPress={uploadPhoto}
                  disabled={!subject || !section || !sessionType}
                  style={({ pressed }) => [
                    styles.photoButton,
                    styles.uploadButton,
                    (!subject || !section || !sessionType) && styles.disabledPhotoButton,
                    pressed && styles.buttonPressed
                  ]}
                >
                  <Ionicons name="image" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.photoButtonText}>UPLOAD</Text>
                </Pressable>
              </View>
            </View>

            {faceReady && (
              <View style={styles.previewContainer}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.readyText}>Photo Ready</Text>
                </View>
                {capturedImageUri && (
                  <Image source={{ uri: capturedImageUri }} style={styles.thumbnail} />
                )}
              </View>
            )}

            <Pressable
              onPress={onRegister}
              disabled={!canSubmit || !!loading}
              style={({ pressed }) => [
                styles.registerButton,
                !canSubmit && styles.disabledRegisterButton,
                pressed && styles.buttonPressed
              ]}
            >
              {loading ? (
                <Text style={styles.registerButtonText}>REGISTERING...</Text>
              ) : (
                <>
                  <Ionicons name="person-add" size={22} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.registerButtonText}>REGISTER STUDENT</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" />
          <Pressable
            onPress={() => setCameraOpen(false)}
            style={styles.closeCameraButton}
          >
            <Ionicons name="close" size={32} color="white" />
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  stepTitle: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  cardBody: {
    padding: 24,
  },
  minimizedContext: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F8F9FF',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 6,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  disabledLabel: {
    color: '#94A3B8',
  },
  input: {
    height: 56,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cameraButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
  },
  uploadButton: {
    backgroundColor: '#64748B',
    shadowColor: '#64748B',
  },
  disabledPhotoButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  checkIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#166534',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  registerButton: {
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginTop: 10,
  },
  disabledRegisterButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  countdownContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  countdownText: {
    color: 'white',
    fontSize: 80,
    fontWeight: '900',
    opacity: 0.8,
  },
  closeCameraButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  }
});


