import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useKiosk } from '../contexts/KioskContext';

type FaceCaptureModalProps = {
  visible: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  studentName?: string;
};

export default function FaceCaptureModal({
  visible,
  onClose,
  onCapture,
  studentName = 'Student'
}: FaceCaptureModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [autoCaptureStarted, setAutoCaptureStarted] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isKioskMode } = useKiosk();

  const handleCapture = async () => {
    if (cameraRef.current && !isCapturing && cameraReady) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
          skipProcessing: true,
          exif: false,
        });

        if (photo?.base64) {
          onCapture(photo.base64);
          onClose();
        } else {
          Alert.alert('Error', 'Failed to capture image');
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const startAutoCapture = () => {
    if (autoCaptureStarted || !cameraReady) return;
    setAutoCaptureStarted(true);
    setCountdown(5);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          handleCapture();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopAutoCapture = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
    setAutoCaptureStarted(false);
  };

  const handleClose = () => {
    stopAutoCapture();
    if (isKioskMode) {
      Alert.alert('Kiosk Mode', 'Cannot exit during face capture');
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (visible && cameraReady && !autoCaptureStarted) {
      const timer = setTimeout(() => startAutoCapture(), 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, cameraReady, autoCaptureStarted]);

  useEffect(() => {
    return () => stopAutoCapture();
  }, []);

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.permissionText}>Initializing Camera...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centerOverlay}>
          <View style={styles.permissionCard}>
            <Ionicons name="camera" size={64} color="#2563EB" />
            <Text style={styles.permissionCardTitle}>Camera Access Required</Text>
            <Text style={styles.permissionCardSub}>To register faces, we need access to your camera.</Text>
            <Pressable style={styles.btnPrimary} onPress={requestPermission}>
              <Text style={styles.btnPrimaryText}>GRANT PERMISSION</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={handleClose}>
              <Text style={styles.btnSecondaryText}>CANCEL</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <StatusBar hidden />
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          onCameraReady={() => setCameraReady(true)}
        />

        <View style={styles.overlay}>
          <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="white" />
            </Pressable>
            <Text style={styles.headerTitle}>Position your face</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.guideContainer}>
            <View style={styles.faceGuide} />
          </View>

          {countdown > 0 && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownValue}>{countdown}</Text>
              <Text style={styles.countdownLabel}>CAPTURING IN...</Text>
            </View>
          )}

          {isCapturing && (
            <View style={styles.capturingOverlay}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  camera: {
    flex: 1,
  },
  centerOverlay: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  permissionCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionCardSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  btnSecondary: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: width * 0.7,
    height: width * 0.9,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderStyle: 'dashed',
  },
  countdownContainer: {
    marginBottom: 80,
    alignItems: 'center',
  },
  countdownValue: {
    fontSize: 80,
    fontWeight: '900',
    color: '#2563EB',
    textShadowColor: 'white',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 3,
    marginTop: -10,
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
});
