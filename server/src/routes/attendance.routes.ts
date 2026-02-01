import { Router } from 'express';
import {
  startAttendanceSession,
  markAttendance,
  getAttendanceSession,
  getAttendanceReports,
  checkAttendanceStatus,
  getStudentAttendanceData,
  updateAttendanceLocation,
  markSessionMissed
} from '../controllers/attendance.controller';
import { verifyFacultyToken } from '../middleware/auth';
import { verifyTrustedDevice } from '../middleware/trustedDevice';

export const attendanceRouter = Router();

// Start new attendance session
attendanceRouter.post('/start', verifyFacultyToken, verifyTrustedDevice, startAttendanceSession);

// Mark attendance using face detection
attendanceRouter.post('/mark', verifyFacultyToken, verifyTrustedDevice, markAttendance);

// Mark session as missed (Post-Lock)
attendanceRouter.post('/missed', verifyFacultyToken, markSessionMissed);

// Get attendance session details
attendanceRouter.get('/session/:sessionId', verifyFacultyToken, getAttendanceSession);

// Get attendance reports
attendanceRouter.get('/reports', verifyFacultyToken, getAttendanceReports);

// Check if attendance has been taken for today's session
attendanceRouter.get('/status', verifyFacultyToken, checkAttendanceStatus);

// Update session location
attendanceRouter.put('/session/:sessionId/location', verifyFacultyToken, updateAttendanceLocation);

// Get student attendance data for a specific subject/section/sessionType
attendanceRouter.get('/student-data', verifyFacultyToken, getStudentAttendanceData);
