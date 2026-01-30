import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';
import { Ionicons } from '@expo/vector-icons';

import EditStudentModal from '@/components/edit-student-modal';
import { getStudentsApi, updateStudentApi, deleteStudentApi } from '@/api/students';
import { getStudentAttendanceDataApi, StudentAttendanceData } from '@/api/attendance';

type Student = {
  id: string;
  name: string;
  rollNumber: string;
  subject: string;
  section: string;
  sessionType: string;
  createdAt: string;
};

export default function StudentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string; section?: string; sessionType?: string }>();
  const insets = useSafeAreaInsets();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);

  const subject = params.subject || '';
  const section = params.section || '';
  const sessionType = params.sessionType || '';

  const classInfo = useMemo(() => ({
    subject,
    section,
    sessionType,
  }), [subject, section, sessionType]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [studentsResponse, attendanceResponse] = await Promise.all([
        getStudentsApi(subject, section),
        getStudentAttendanceDataApi(subject, section, sessionType),
      ]);

      setStudents(studentsResponse.students);
      setAttendanceData(attendanceResponse.students);
    } catch (err: any) {
      console.error('Failed to load student details:', err);
      setError(err?.response?.data?.message || 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!subject || !section || !sessionType) {
      setError('Missing class information. Please select a class again.');
      setLoading(false);
      return;
    }
    loadData();
  }, [subject, section, sessionType]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStudentAttendance = (studentId: string): StudentAttendanceData | null => {
    return attendanceData.find(att => att.studentId === studentId) || null;
  };

  const getAttendanceColors = (percentage: number) => {
    if (percentage >= 80) return { bg: '#F0FDF4', text: '#166534', border: '#DCFCE7' };
    if (percentage >= 60) return { bg: '#FFFBEB', text: '#92400E', border: '#FEF3C7' };
    return { bg: '#FEF2F2', text: '#991B1B', border: '#FEE2E2' };
  };

  const buildCsv = () => {
    const headerSection = [[
      'Subject', 'Section', 'Session Type', 'Total Students', 'Export Date'
    ], [
      classInfo.subject,
      classInfo.section,
      classInfo.sessionType,
      students.length,
      new Date().toISOString()
    ]];

    const studentRows = [['Name', 'Roll Number', 'Registered Date', 'Attendance %', 'Present Sessions', 'Total Sessions'], ...(
      students.map((student) => {
        const attendance = getStudentAttendance(student.id);
        return [
          student.name,
          student.rollNumber,
          new Date(student.createdAt).toISOString(),
          attendance ? `${attendance.attendancePercentage}%` : 'N/A',
          attendance ? attendance.presentSessions.toString() : 'N/A',
          attendance ? attendance.totalSessions.toString() : 'N/A'
        ];
      })
    )];

    const all = [
      ...headerSection,
      [],
      ['Student Details'],
      ...studentRows,
    ];
    return Papa.unparse(all, { quotes: true });
  };

  const exportAsCsv = async () => {
    try {
      const csv = buildCsv();
      const fileName = `students_${classInfo.subject}_${classInfo.section}_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv);

      const Sharing = require('expo-sharing');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Students (CSV)' });
      } else {
        Alert.alert('Export Successful', `CSV file saved: ${fileName}`);
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export CSV file.');
    }
  };

  const buildHtml = () => {
    const studentRows = students.map(student => {
      const attendance = getStudentAttendance(student.id);
      const colors = attendance ? getAttendanceColors(attendance.attendancePercentage) : { text: '#64748B' };
      return `
        <tr>
          <td>${student.name}</td>
          <td>${student.rollNumber}</td>
          <td>${new Date(student.createdAt).toLocaleDateString()}</td>
          <td style="color: ${colors.text}; font-weight: bold;">
            ${attendance ? `${attendance.attendancePercentage}%` : 'N/A'}
          </td>
          <td>${attendance ? `${attendance.presentSessions}/${attendance.totalSessions}` : 'N/A'}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student List - ${classInfo.subject}</title>
          <style>
            body { font-family: -apple-system, sans-serif; margin: 40px; color: #1e293b; }
            h1 { color: #0f172a; margin-bottom: 20px; }
            .info { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background: #f1f5f9; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; }
            td { font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Student Report</h1>
          <div class="info">
            <div><strong>Subject:</strong> ${classInfo.subject}</div>
            <div><strong>Section:</strong> ${classInfo.section}</div>
            <div><strong>Type:</strong> ${classInfo.sessionType}</div>
          </div>
          <table>
            <thead>
              <tr><th>Name</th><th>Roll</th><th>Joined</th><th>Attendance</th><th>Sessions</th></tr>
            </thead>
            <tbody>${studentRows}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const exportAsPdf = async () => {
    try {
      const html = buildHtml();
      const Print = require('expo-print');
      const Sharing = require('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Students (PDF)' });
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export PDF.');
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (studentId: string, data: { name?: string; rollNumber?: string; faceImageBase64?: string }) => {
    try {
      await updateStudentApi(studentId, data);
      Alert.alert('Success', 'Student updated successfully');
      setShowEditModal(false);
      setEditingStudent(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to update student');
      throw error;
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    Alert.alert('Delete Student', `Delete ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStudentApi(studentId);
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete student');
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.backButtonInline}>
          <Text style={styles.backButtonInlineText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Class Details</Text>
        <Pressable
          onPress={() => setShowExportModal(true)}
          style={({ pressed }) => [styles.headerActionButton, pressed && styles.headerActionButtonPressed]}
        >
          <Ionicons name="share-outline" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Class Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>{classInfo.sessionType}</Text>
          </View>
          <Text style={styles.infoSubject}>{classInfo.subject}</Text>
          <Text style={styles.infoSection}>SECTION {classInfo.section}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={statStyles.statLabel}>STUDENTS</Text>
              <Text style={statStyles.statValue}>{students.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={statStyles.statLabel}>LAST EXPORT</Text>
              <Text style={statStyles.statValue}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>
        </View>

        {/* Students List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Enrolled Students</Text>
          <View style={styles.studentCountBadge}>
            <Text style={styles.studentCountBadgeText}>{students.length}</Text>
          </View>
        </View>

        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No students in this class</Text>
          </View>
        ) : (
          students.map((student, index) => {
            const attendance = getStudentAttendance(student.id);
            const colors = attendance ? getAttendanceColors(attendance.attendancePercentage) : null;

            return (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentCardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.studentMain}>
                    <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                    <Text style={styles.studentRoll}>{student.rollNumber}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleEditStudent(student)}
                    style={styles.editButton}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
                  </Pressable>
                </View>

                {attendance && (
                  <View style={[styles.attendanceBar, { backgroundColor: colors?.bg, borderColor: colors?.border }]}>
                    <View style={styles.attendanceLeft}>
                      <Text style={[styles.attendanceLabel, { color: colors?.text }]}>ATTENDANCE</Text>
                      <Text style={[styles.attendancePercent, { color: colors?.text }]}>{attendance.attendancePercentage}%</Text>
                    </View>
                    <View style={styles.attendanceRight}>
                      <Text style={styles.attendanceSessions}>{attendance.presentSessions}/{attendance.totalSessions} Sessions</Text>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${attendance.attendancePercentage}%`, backgroundColor: colors?.text }]} />
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                  <Text style={styles.footerDate}>Joined {formatDate(student.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowExportModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>EXPORT REPORT</Text>
            <View style={styles.exportOptions}>
              <Pressable
                onPress={async () => { setShowExportModal(false); await exportAsPdf(); }}
                style={({ pressed }) => [styles.exportOption, pressed && styles.exportOptionPressed]}
              >
                <View style={[styles.exportIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="document-text" size={24} color="#EF4444" />
                </View>
                <Text style={styles.exportOptionText}>PDF Document</Text>
              </Pressable>

              <Pressable
                onPress={async () => { setShowExportModal(false); await exportAsCsv(); }}
                style={({ pressed }) => [styles.exportOption, pressed && styles.exportOptionPressed]}
              >
                <View style={[styles.exportIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="grid" size={24} color="#10B981" />
                </View>
                <Text style={styles.exportOptionText}>CSV Spreadsheet</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setShowExportModal(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>CANCEL</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <EditStudentModal
        visible={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingStudent(null); }}
        onSave={handleUpdateStudent}
        onDelete={handleDeleteStudent}
        student={editingStudent}
      />
    </SafeAreaView>
  );
}

const statStyles = StyleSheet.create({
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
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
  headerActionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButtonPressed: {
    opacity: 0.7,
  },
  backButtonInline: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#2563EB',
    borderRadius: 16,
  },
  backButtonInlineText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  infoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoSubject: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  infoSection: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  studentCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2563EB',
  },
  studentMain: {
    flex: 1,
    marginLeft: 14,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  studentRoll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  editButton: {
    padding: 8,
  },
  attendanceBar: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  attendanceLeft: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  attendancePercent: {
    fontSize: 20,
    fontWeight: '900',
  },
  attendanceRight: {
    flex: 1,
    justifyContent: 'center',
  },
  attendanceSessions: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textAlign: 'right',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerDate: {
    fontSize: 12,
    fontWeight: '500',
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
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: 'center',
  },
  exportOptions: {
    gap: 12,
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  exportOptionPressed: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  exportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  exportOptionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalCloseButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 16,
  }
});


