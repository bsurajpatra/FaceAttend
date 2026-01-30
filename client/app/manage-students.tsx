import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { getStudentsApi, deleteStudentApi, updateStudentApi } from '@/api/students';
import { getFacultySubjectsApi } from '@/api/auth';
import EditStudentModal from '@/components/edit-student-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Sidebar } from '../components/sidebar';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Student = {
  id: string;
  name: string;
  rollNumber: string;
  subject: string;
  section: string;
  sessionType: string;
  createdAt: string;
};

export default function ManageStudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSessionType, setSelectedSessionType] = useState<string>('');
  const [facultySubjects, setFacultySubjects] = useState<string[]>([]);
  const [subjectSections, setSubjectSections] = useState<{ [key: string]: string[] }>({});
  const [subjectSessionTypes, setSubjectSessionTypes] = useState<{ [key: string]: string[] }>({});

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const insets = useSafeAreaInsets();

  type ActiveDropdown = 'subject' | 'section' | 'sessionType' | null;
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);

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
    const loadFacultySubjects = async () => {
      try {
        const response = await getFacultySubjectsApi();
        setFacultySubjects(response.subjects);
        setSubjectSections(response.subjectSections);
        setSubjectSessionTypes(response.subjectSessionTypes);
      } catch (error) {
        console.error('Failed to load faculty subjects:', error);
        Alert.alert('Error', 'Failed to load faculty subjects');
      }
    };
    loadFacultySubjects();
  }, []);

  const loadStudents = async () => {
    try {
      if (!selectedSubject || !selectedSection || !selectedSessionType) {
        setStudents([]);
        return;
      }

      const response = await getStudentsApi(selectedSubject, selectedSection);
      setStudents(response.students);
    } catch (err: any) {
      console.error('Failed to load students:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load students');
    }
  };

  useEffect(() => {
    if (selectedSubject && selectedSection && selectedSessionType) {
      loadStudents();
    }
  }, [selectedSubject, selectedSection, selectedSessionType]);

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedSection('');
    setSelectedSessionType('');
    setActiveDropdown(null);
  };

  const handleSectionSelect = (section: string) => {
    setSelectedSection(section);
    setSelectedSessionType('');
    setActiveDropdown(null);
  };

  const handleSessionTypeSelect = (sessionType: string) => {
    setSelectedSessionType(sessionType);
    setActiveDropdown(null);
  };

  const openSubjectDropdown = () => {
    setActiveDropdown('subject');
  };

  const openSectionDropdown = () => {
    if (selectedSubject) {
      setActiveDropdown('section');
    }
  };

  const openSessionTypeDropdown = () => {
    if (selectedSection) {
      setActiveDropdown('sessionType');
    }
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (studentId: string, data: { name?: string; rollNumber?: string; faceImageBase64?: string }) => {
    try {
      await updateStudentApi(studentId, data);
      Alert.alert('Success', 'Student updated successfully');
      loadStudents();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to update student';
      Alert.alert('Error', errorMessage);
      throw error; // Re-throw to let the modal handle it
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${studentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudentApi(studentId);
              Alert.alert('Success', 'Student deleted successfully');
              loadStudents();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete student');
            }
          }
        }
      ]
    );
  };

  const SingleDropdownModal = () => {
    if (!activeDropdown) {
      return null;
    }

    const getModalData = () => {
      switch (activeDropdown) {
        case 'subject':
          return {
            title: 'Select Subject',
            options: facultySubjects,
            onSelect: handleSubjectSelect
          };
        case 'section':
          return {
            title: 'Select Section',
            options: subjectSections[selectedSubject] || [],
            onSelect: handleSectionSelect
          };
        case 'sessionType':
          return {
            title: 'Select Session Type',
            options: subjectSessionTypes[selectedSubject] || [],
            onSelect: handleSessionTypeSelect
          };
        default:
          return null;
      }
    };

    const modalData = getModalData();

    if (!modalData) {
      return null;
    }

    return (
      <Modal
        visible={!!activeDropdown}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
        statusBarTranslucent={true}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={closeDropdown}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{modalData.title}</Text>
            <ScrollView style={styles.modalOptions} showsVerticalScrollIndicator={false}>
              {modalData.options.length > 0 ? (
                modalData.options.map((option, index) => (
                  <Pressable
                    key={`${activeDropdown}-${option}-${index}`}
                    onPress={() => modalData.onSelect(option)}
                    style={({ pressed }) => [
                      styles.modalOption,
                      pressed && styles.modalOptionPressed
                    ]}
                  >
                    <Text style={styles.modalOptionText}>{option}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyModalState}>
                  <Text style={styles.emptyModalTitle}>
                    {activeDropdown === 'subject' ? 'No Subjects Found' :
                      activeDropdown === 'section' ? 'No Sections Found' :
                        'No Session Types Found'}
                  </Text>
                  <Text style={styles.emptyModalSubtitle}>
                    {activeDropdown === 'subject' ? 'Go to dashboard to setup timetable.' :
                      activeDropdown === 'section' ? 'Please select a subject first to view available sections.' :
                        'Please select a subject and section first to view session types.'}
                  </Text>
                </View>
              )}
            </ScrollView>
            <Pressable
              onPress={closeDropdown}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.modalCloseButtonPressed
              ]}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const containerStyle = styles.container;

  return (
    <SafeAreaView style={containerStyle} edges={['left', 'right', 'bottom']}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRoute="/manage-students"
        onLogout={handleLogout}
      />

      {/* Header */}
      <View style={[
        styles.header,
        { paddingTop: insets.top > 0 ? insets.top : 12 }
      ]}>
        <Pressable
          onPress={() => setSidebarOpen(true)}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed
          ]}
        >
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Students</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Selection Controls */}
      <View style={styles.selectionWrapper}>
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionTitle}>Select Class</Text>

          {/* Subject Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>Subject</Text>
            <Pressable
              onPress={openSubjectDropdown}
              style={({ pressed }) => [
                styles.dropdownButton,
                pressed && styles.dropdownButtonPressed
              ]}
            >
              <Text style={styles.dropdownButtonText}>
                {selectedSubject || 'Select Subject'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </Pressable>
          </View>

          {/* Section Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>Section</Text>
            <Pressable
              onPress={openSectionDropdown}
              disabled={!selectedSubject}
              style={({ pressed }) => [
                styles.dropdownButton,
                !selectedSubject && styles.dropdownButtonDisabled,
                pressed && selectedSubject && styles.dropdownButtonPressed
              ]}
            >
              <Text style={[
                styles.dropdownButtonText,
                !selectedSubject && styles.dropdownButtonTextDisabled
              ]}>
                {selectedSection || 'Select Section'}
              </Text>
              <Text style={[
                styles.dropdownArrow,
                !selectedSubject && styles.dropdownArrowDisabled
              ]}>▼</Text>
            </Pressable>
          </View>

          {/* Session Type Dropdown */}
          <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>Session Type</Text>
            <Pressable
              onPress={openSessionTypeDropdown}
              disabled={!selectedSection}
              style={({ pressed }) => [
                styles.dropdownButton,
                !selectedSection && styles.dropdownButtonDisabled,
                pressed && selectedSection && styles.dropdownButtonPressed
              ]}
            >
              <Text style={[
                styles.dropdownButtonText,
                !selectedSection && styles.dropdownButtonTextDisabled
              ]}>
                {selectedSessionType || 'Select Session Type'}
              </Text>
              <Text style={[
                styles.dropdownArrow,
                !selectedSection && styles.dropdownArrowDisabled
              ]}>▼</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Class Info */}
      {selectedSubject && selectedSection && selectedSessionType && (
        <View style={styles.classInfo}>
          <View style={styles.classInfoLeft}>
            <Text style={styles.classInfoText}>
              {selectedSubject} - Section {selectedSection} - {selectedSessionType}
            </Text>
            <Text style={styles.studentCount}>{students.length} students</Text>
          </View>
          <Pressable
            onPress={() => router.push({
              pathname: '/student-details',
              params: {
                subject: selectedSubject,
                section: selectedSection,
                sessionType: selectedSessionType
              }
            })}
            style={({ pressed }) => [
              styles.viewButton,
              pressed && styles.viewButtonPressed
            ]}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </Pressable>
        </View>
      )}

      {/* Empty State when no class selected */}
      {!selectedSubject || !selectedSection || !selectedSessionType ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Select a class to view students</Text>
          <Text style={styles.emptySubtext}>
            Choose subject, section, and session type to get started
          </Text>
        </View>
      ) : null}

      <SingleDropdownModal />

      {/* Edit Student Modal */}
      <EditStudentModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingStudent(null);
        }}
        onSave={handleUpdateStudent}
        onDelete={handleDeleteStudent}
        student={editingStudent}
      />

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
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  backButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  selectionWrapper: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  selectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  selectionTitle: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  dropdownWrapper: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    minHeight: 56,
  },
  dropdownButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  dropdownButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  dropdownButtonTextDisabled: {
    color: '#94A3B8',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 8,
  },
  dropdownArrowDisabled: {
    color: '#CBD5E1',
  },
  classInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFF6FF',
  },
  classInfoLeft: {
    flex: 1,
  },
  classInfoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  studentCount: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '700',
  },
  viewButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 12,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  viewButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#1D4ED8',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
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
    maxHeight: '70%',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOptions: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalOptionPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
  },
  modalCloseButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseButtonPressed: {
    backgroundColor: '#E2E8F0',
  },
  modalCloseButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyModalState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyModalSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
  },
});