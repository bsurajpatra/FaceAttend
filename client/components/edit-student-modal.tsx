import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import FaceCaptureModal from './face-capture-modal';

type Student = {
  id: string;
  name: string;
  rollNumber: string;
  subject: string;
  section: string;
  sessionType: string;
  createdAt: string;
};

type EditStudentModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (studentId: string, data: { name?: string; rollNumber?: string; faceImageBase64?: string }) => Promise<void>;
  onDelete: (studentId: string, studentName: string) => void;
  student: Student | null;
};

export default function EditStudentModal({
  visible,
  onClose,
  onSave,
  onDelete,
  student
}: EditStudentModalProps) {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showFaceCapture, setShowFaceCapture] = useState(false);
  const [capturedFaceImage, setCapturedFaceImage] = useState<string | null>(null);

  React.useEffect(() => {
    if (student) {
      setName(student.name);
      setRollNumber(student.rollNumber);
      setCapturedFaceImage(null);
    }
  }, [student]);

  const handleSave = async () => {
    if (!student) return;

    const hasNameChange = name.trim() !== student.name;
    const hasRollNumberChange = rollNumber.trim() !== student.rollNumber;
    const hasFaceChange = capturedFaceImage !== null;

    if (!hasNameChange && !hasRollNumberChange && !hasFaceChange) {
      Alert.alert('No Changes', 'Please make at least one change before saving');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: { name?: string; rollNumber?: string; faceImageBase64?: string } = {};

      if (hasNameChange && name.trim()) updateData.name = name.trim();
      if (hasRollNumberChange && rollNumber.trim()) updateData.rollNumber = rollNumber.trim();
      if (hasFaceChange && capturedFaceImage) updateData.faceImageBase64 = capturedFaceImage;

      await onSave(student.id, updateData);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update student');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFaceCapture = (base64Image: string) => {
    setCapturedFaceImage(base64Image);
    setShowFaceCapture(false);
  };

  const uploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Library access is needed.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setCapturedFaceImage(result.assets[0].base64);
        Alert.alert('Success', 'Photo uploaded successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo.');
    }
  };

  const handleDelete = () => {
    if (!student) return;
    onDelete(student.id, student.name);
    onClose();
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  if (!student) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Edit Student</Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
              <View style={styles.form}>
                {/* Inputs */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>FULL NAME</Text>
                    {name.trim() !== student.name && <Text style={styles.modifiedBadge}>MODIFIED</Text>}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Student Name"
                    editable={!isSaving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>ROLL NUMBER</Text>
                    {rollNumber.trim() !== student.rollNumber && <Text style={styles.modifiedBadge}>MODIFIED</Text>}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={rollNumber}
                    onChangeText={setRollNumber}
                    placeholder="Roll Number"
                    editable={!isSaving}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Face Data */}
                <View style={styles.faceSection}>
                  <Text style={styles.label}>FACE DATA</Text>
                  <View style={styles.faceCard}>
                    {capturedFaceImage ? (
                      <View style={styles.previewContainer}>
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${capturedFaceImage}` }}
                          style={styles.facePreview}
                        />
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>NEW</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.previewContainer}>
                        <View style={styles.facePlaceholder}>
                          <Ionicons name="person" size={32} color="#CBD5E1" />
                        </View>
                      </View>
                    )}

                    <View style={styles.faceActions}>
                      <Pressable
                        style={({ pressed }) => [styles.faceBtn, styles.cameraBtn, pressed && styles.pressed]}
                        onPress={() => setShowFaceCapture(true)}
                      >
                        <Ionicons name="camera" size={20} color="white" />
                        <Text style={styles.faceBtnText}>CAPTURE</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.faceBtn, styles.uploadBtn, pressed && styles.pressed]}
                        onPress={uploadPhoto}
                      >
                        <Ionicons name="image" size={20} color="#2563EB" />
                        <Text style={[styles.faceBtnText, { color: '#2563EB' }]}>UPLOAD</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Class Info */}
                <View style={styles.classInfo}>
                  <Ionicons name="information-circle-outline" size={18} color="#64748B" />
                  <Text style={styles.classInfoText}>
                    {student.subject} • Section {student.section}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [styles.actionButton, styles.deleteBtn, pressed && styles.pressed]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </Pressable>

              <View style={styles.footerRight}>
                <Pressable
                  style={({ pressed }) => [styles.actionButton, styles.cancelBtn, pressed && styles.pressed]}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.saveBtn,
                    isSaving && styles.btnDisabled,
                    pressed && !isSaving && styles.pressed
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <FaceCaptureModal
        visible={showFaceCapture}
        onClose={() => setShowFaceCapture(false)}
        onCapture={handleFaceCapture}
        studentName={student.name}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
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
    maxWidth: 450,
    maxHeight: '85%',
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    maxHeight: 500,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 2,
  },
  modifiedBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: 'white',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  input: {
    height: 56,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  faceSection: {
    marginBottom: 24,
  },
  faceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  previewContainer: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  facePreview: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  facePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  badge: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  faceActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  faceBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraBtn: {
    backgroundColor: '#2563EB',
  },
  uploadBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  faceBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: 'white',
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
  },
  classInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  footer: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 56,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 1,
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});


