import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import Papa from 'papaparse';

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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStudentAttendance = (studentId: string): StudentAttendanceData | null => {
    return attendanceData.find(att => att.studentId === studentId) || null;
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 80) return '#10B981';
    if (percentage >= 60) return '#F59E0B';
    return '#EF4444';
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

    const studentHeader = [['Student Details']];
    const studentRows = [['Name', 'Roll Number', 'Registered Date', 'Attendance %', 'Present Sessions', 'Total Sessions', 'Last Present Date'], ...(
      students.map((student) => {
        const attendance = getStudentAttendance(student.id);
        return [
          student.name,
          student.rollNumber,
          new Date(student.createdAt).toISOString(),
          attendance ? `${attendance.attendancePercentage}%` : 'N/A',
          attendance ? attendance.presentSessions.toString() : 'N/A',
          attendance ? attendance.totalSessions.toString() : 'N/A',
          attendance && attendance.lastAttendanceDate ? new Date(attendance.lastAttendanceDate).toISOString() : 'N/A'
        ];
      })
    )];

    const all = [
      ...headerSection,
      [],
      ...studentHeader,
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
      const attendanceColor = attendance ? getAttendanceColor(attendance.attendancePercentage) : '#6B7280';
      return `
        <tr>
          <td>${student.name}</td>
          <td>${student.rollNumber}</td>
          <td>${new Date(student.createdAt).toLocaleString()}</td>
          <td style="color: ${attendanceColor}; font-weight: 600;">
            ${attendance ? `${attendance.attendancePercentage}%` : 'N/A'}
          </td>
          <td>${attendance ? `${attendance.presentSessions}/${attendance.totalSessions}` : 'N/A'}</td>
          <td>${attendance && attendance.lastAttendanceDate ?
          new Date(attendance.lastAttendanceDate).toLocaleDateString() +
          (attendance.lastPresentSessionHours ? ` (${attendance.lastPresentSessionHours})` : '')
          : 'N/A'}</td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student List - ${classInfo.subject}</title>
           <style>
             body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
             h1 { color: #111827; }
             .class-info { background: #F3F4F6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
             .class-info div { margin-bottom: 8px; }
             .class-info div:last-child { margin-bottom: 0; }
             table { width: 100%; border-collapse: collapse; margin-top: 20px; }
             th, td { border: 1px solid #D1D5DB; padding: 12px; text-align: left; }
             th { background: #F9FAFB; font-weight: 600; }
             .pill { background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; }
             .attendance-good { color: #10B981; font-weight: 600; }
             .attendance-average { color: #F59E0B; font-weight: 600; }
             .attendance-poor { color: #EF4444; font-weight: 600; }
           </style>
        </head>
        <body>
          <h1>Student List with Attendance</h1>
          <div class="class-info">
            <div><strong>Subject:</strong> ${classInfo.subject}</div>
            <div><strong>Section:</strong> ${classInfo.section}</div>
            <div><strong>Session Type:</strong> ${classInfo.sessionType}</div>
            <div><strong>Total Students:</strong> <span class="pill">${students.length}</span></div>
            <div><strong>Export Date:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <h2>Student Details with Attendance</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll Number</th>
                <th>Registered Date</th>
                <th>Attendance %</th>
                <th>Sessions (Present/Total)</th>
                <th>Last Present Date</th>
              </tr>
            </thead>
            <tbody>
              ${studentRows || '<tr><td colspan="6">No students found</td></tr>'}
            </tbody>
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
      } else {
        Alert.alert('Saved', `PDF saved to: ${uri}`);
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
      const errorMessage = error?.response?.data?.message || 'Failed to update student';
      Alert.alert('Error', errorMessage);
      throw error;
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
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete student');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['left', 'right']}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>
          Loading student details...
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }]} edges={['left', 'right']}>
        <Text style={{ fontSize: 18, color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>
          {error}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backInlineButton,
            pressed && { opacity: 0.8 }
          ]}
        >
          <Text style={styles.backInlineButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={[
        styles.header,
        { paddingTop: insets.top > 0 ? insets.top : 12 }
      ]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed
          ]}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Student Details</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Class Info */}
      <View style={styles.classInfoCard}>
        <View style={styles.classInfoHeader}>
          <Text style={styles.classInfoTitle}>Class Information</Text>
          <Pressable
            onPress={() => setShowExportModal(true)}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && styles.exportButtonPressed
            ]}
          >
            <Text style={styles.exportButtonText}>Export</Text>
          </Pressable>
        </View>
        <Text style={styles.classInfoText}>
          {classInfo.subject} - Section {classInfo.section}
        </Text>
        <Text style={styles.sessionTypeText}>
          Session Type: {classInfo.sessionType}
        </Text>
        <Text style={styles.studentCountText}>
          Total Students: {students.length}
        </Text>
      </View>

      {/* Students List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students found</Text>
            <Text style={styles.emptySubtext}>
              Students registered for this class will appear here
            </Text>
          </View>
        ) : (
          students.map((student, index) => {
            const attendance = getStudentAttendance(student.id);
            return (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <Text style={styles.studentNumber}>#{index + 1}</Text>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Pressable
                    onPress={() => handleEditStudent(student)}
                    style={({ pressed }) => [
                      styles.editButton,
                      pressed && styles.editButtonPressed
                    ]}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                </View>
                <View style={styles.studentDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Roll Number:</Text>
                    <Text style={styles.detailValue}>{student.rollNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registered:</Text>
                    <Text style={styles.detailValue}>{formatDate(student.createdAt)}</Text>
                  </View>
                  {attendance && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Attendance:</Text>
                        <View style={styles.attendanceContainer}>
                          <Text style={[
                            styles.attendancePercentage,
                            { color: getAttendanceColor(attendance.attendancePercentage) }
                          ]}>
                            {attendance.attendancePercentage}%
                          </Text>
                          <Text style={styles.attendanceDetails}>
                            ({attendance.presentSessions}/{attendance.totalSessions} sessions)
                          </Text>
                        </View>
                      </View>
                      {attendance.lastAttendanceDate && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Last Present:</Text>
                          <Text style={styles.detailValue}>
                            {formatDateOnly(attendance.lastAttendanceDate)}
                            {attendance.lastPresentSessionHours && (
                              <Text style={styles.sessionHoursText}>
                                {' '}({attendance.lastPresentSessionHours})
                              </Text>
                            )}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

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

      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.exportOverlay}>
          <View style={styles.exportSheet}>
            <Text style={styles.exportTitle}>Export as</Text>
            <Pressable
              onPress={async () => {
                setShowExportModal(false);
                await exportAsPdf();
              }}
              style={({ pressed }) => [styles.exportOption, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.exportOptionText}>PDF</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                setShowExportModal(false);
                await exportAsCsv();
              }}
              style={({ pressed }) => [styles.exportOption, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.exportOptionText}>CSV</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowExportModal(false)}
              style={({ pressed }) => [styles.exportCancel, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.exportCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  backInlineButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backInlineButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  classInfoCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  classInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  exportButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exportButtonPressed: {
    opacity: 0.9,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  classInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sessionTypeText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  studentCountText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  studentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  editButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonPressed: {
    opacity: 0.9,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  studentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  sessionHoursText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  attendanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 2,
    justifyContent: 'flex-end',
  },
  attendancePercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  attendanceDetails: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportSheet: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  exportOption: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  exportOptionText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  exportCancel: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportCancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


