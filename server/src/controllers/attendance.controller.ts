import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AttendanceSession } from '../models/Attendance';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { getFaceEmbedding } from '../services/facenet.service';
import { getIO } from '../socket';
import { cosineSimilarity } from '../utils/math';
import { createAuditLog } from '../utils/auditLogger';

// Face matching threshold (cosine similarity) - higher threshold for FaceNet embeddings
const FACE_MATCH_THRESHOLD = 0.6;

// Rate limiting for session creation
const sessionCreationTimes = new Map<string, number>();
const SESSION_CREATION_COOLDOWN = 1000; // 1 second

// Find best matching student for a face embedding
async function findMatchingStudent(
  faceEmbedding: number[],
  enrolledStudents: any[]
): Promise<{ student: any; confidence: number } | null> {
  let bestMatch = null;
  let bestConfidence = 0;

  console.log('🔍 Finding matching student using FaceNet embeddings...');
  console.log('Input embedding length:', faceEmbedding.length);
  console.log('Enrolled students count:', enrolledStudents.length);

  for (const student of enrolledStudents) {
    // Check both embeddings and legacy faceDescriptor
    const embeddings = student.embeddings || [];
    const legacyDescriptor = student.faceDescriptor || [];

    if (embeddings.length === 0 && legacyDescriptor.length === 0) {
      console.log(`⚠️ Student ${student.name} has no face data`);
      continue;
    }

    // Try FaceNet embeddings first, then fall back to legacy descriptor
    const faceDataArray = embeddings.length > 0 ? embeddings : [legacyDescriptor];

    for (const storedEmbedding of faceDataArray) {
      if (!storedEmbedding || storedEmbedding.length === 0) continue;

      const similarity = cosineSimilarity(faceEmbedding, storedEmbedding);
      console.log(`📊 Comparing with ${student.name}: similarity = ${similarity.toFixed(4)}`);

      if (similarity > bestConfidence && similarity >= FACE_MATCH_THRESHOLD) {
        bestConfidence = similarity;
        bestMatch = student;
        console.log(`✅ New best match: ${student.name} with confidence ${similarity.toFixed(4)}`);
      }
    }
  }

  console.log(`🎯 Final result: ${bestMatch ? `Match found: ${bestMatch.name} (${bestConfidence.toFixed(4)})` : 'No match found'}`);
  return bestMatch ? { student: bestMatch, confidence: bestConfidence } : null;
}

// Start attendance session
export async function startAttendanceSession(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { subject, section, sessionType, hours, location } = req.body;

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Rate limiting check
    const rateLimitKey = `${facultyId}-${subject}-${section}`;
    const lastCreationTime = sessionCreationTimes.get(rateLimitKey);
    const now = Date.now();

    if (lastCreationTime && (now - lastCreationTime) < SESSION_CREATION_COOLDOWN) {
      res.status(429).json({
        message: 'Please wait before creating another session',
        retryAfter: Math.ceil((SESSION_CREATION_COOLDOWN - (now - lastCreationTime)) / 1000)
      });
      return;
    }

    sessionCreationTimes.set(rateLimitKey, now);

    if (!subject || !section || !sessionType || !hours || !Array.isArray(hours)) {
      res.status(400).json({ message: 'subject, section, sessionType, and hours are required' });
      return;
    }

    // Check if session already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingSession = await AttendanceSession.findOne({
      facultyId: new mongoose.Types.ObjectId(facultyId),
      subject,
      section,
      sessionType,
      date: today
    });

    if (existingSession) {
      res.status(200).json({
        message: 'Attendance session already exists for today',
        sessionId: existingSession._id,
        totalStudents: existingSession.totalStudents,
        students: existingSession.records.map(r => ({
          id: r.studentId,
          name: r.studentName,
          rollNumber: r.rollNumber,
          isPresent: r.isPresent
        }))
      });
      return;
    }

    // Get enrolled students for this subject/section
    const enrolledStudents = await Student.find({
      'enrollments.subject': subject,
      'enrollments.section': section,
      'enrollments.facultyId': new mongoose.Types.ObjectId(facultyId)
    }).select('name rollNumber faceDescriptor embeddings');

    if (enrolledStudents.length === 0) {
      res.status(404).json({
        message: 'No students enrolled in this subject/section',
        hint: 'Please register students for this subject/section first'
      });
      return;
    }

    // Create attendance session

    const attendanceSession = await AttendanceSession.create({
      facultyId: new mongoose.Types.ObjectId(facultyId),
      subject,
      section,
      sessionType,
      hours,
      date: today,
      totalStudents: enrolledStudents.length,
      presentStudents: 0,
      absentStudents: enrolledStudents.length,
      location: location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        accuracy: location.accuracy
      } : undefined,
      records: enrolledStudents.map(student => ({
        studentId: student._id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        isPresent: false,
        markedAt: new Date()
      }))
    });

    // Emit socket event for real-time dashboard updates
    try {
      getIO().to(`faculty_${facultyId}`).emit('attendance_updated', {
        type: 'session_started',
        subject,
        section
      });
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    res.status(201).json({
      message: 'Attendance session started',
      sessionId: attendanceSession._id,
      totalStudents: enrolledStudents.length,
      students: enrolledStudents.map(s => ({
        id: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        hasFaceDescriptor: !!(s.faceDescriptor && s.faceDescriptor.length > 0),
        hasFaceNetEmbeddings: !!(s.embeddings && s.embeddings.length > 0)
      }))
    });

  } catch (error) {
    console.error('Start attendance session error:', error);
    res.status(500).json({ message: 'Failed to start attendance session' });
  }
}

// Mark attendance using face detection
export async function markAttendance(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { sessionId, faceImageBase64 } = req.body;

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
      res.status(400).json({ message: 'Valid sessionId is required' });
      return;
    }

    if (!faceImageBase64) {
      res.status(400).json({
        message: 'Face image is required',
        hint: 'Please provide faceImageBase64'
      });
      return;
    }

    // Get attendance session
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Attendance session not found' });
      return;
    }

    // Verify faculty owns this session
    if (String(session.facultyId) !== String(facultyId)) {
      res.status(403).json({ message: 'Unauthorized to access this session' });
      return;
    }

    // Generate FaceNet embedding from the image
    console.log('🔄 Processing face image with FaceNet...');
    let faceEmbedding: number[];

    try {
      faceEmbedding = await getFaceEmbedding(faceImageBase64);
      console.log('✅ FaceNet embedding generated, length:', faceEmbedding.length);
    } catch (error: any) {
      console.error('❌ FaceNet processing error:', error);
      res.status(400).json({
        message: error.message || 'Failed to process face image',
        hint: 'Please ensure the image contains a clear face and try again'
      });
      return;
    }

    // Get enrolled students for matching
    const enrolledStudents = await Student.find({
      'enrollments.subject': session.subject,
      'enrollments.section': session.section,
      'enrollments.facultyId': session.facultyId
    }).select('_id name rollNumber faceDescriptor embeddings');

    // Find matching student
    const match = await findMatchingStudent(faceEmbedding, enrolledStudents);

    if (!match) {
      res.status(404).json({
        message: 'No matching student found',
        hint: 'Face does not match any enrolled student. Please ensure the student is registered for this subject/section.'
      });
      return;
    }

    // Update attendance record
    console.log('🔍 Looking for student in session records...');
    console.log('Match student ID:', match.student._id);
    console.log('Session records count:', session.records.length);
    console.log('Session records:', session.records.map(r => ({ id: r.studentId, name: r.studentName })));

    const recordIndex = session.records.findIndex(
      record => String(record.studentId) === String(match.student._id)
    );

    console.log('Record index found:', recordIndex);

    if (recordIndex === -1) {
      console.log('❌ Student not found in attendance session records');
      console.log('🔄 Attempting to refresh session with latest enrolled students...');

      // Try to refresh the session with latest enrolled students
      const latestEnrolledStudents = await Student.find({
        'enrollments.subject': session.subject,
        'enrollments.section': session.section,
        'enrollments.facultyId': session.facultyId
      }).select('_id name rollNumber faceDescriptor embeddings');

      // Check if the student exists in the latest enrollment
      const studentExists = latestEnrolledStudents.find(s => String(s._id) === String(match.student._id));

      if (studentExists) {
        console.log('✅ Student found in latest enrollment, adding to session...');

        // Add the student to the session records
        session.records.push({
          studentId: match.student._id,
          studentName: match.student.name,
          rollNumber: match.student.rollNumber,
          isPresent: false,
          markedAt: new Date()
        });

        session.totalStudents += 1;
        session.absentStudents += 1;

        await session.save();

        // Now proceed with marking attendance
        const newRecordIndex = session.records.length - 1;
        const record = session.records[newRecordIndex];

        record.isPresent = true;
        record.markedAt = new Date();
        record.confidence = Math.min(1.0, Math.max(0.0, match.confidence));

        session.presentStudents += 1;
        session.absentStudents -= 1;

        await session.save();

        // Emit socket event for real-time dashboard updates
        try {
          getIO().to(`faculty_${facultyId}`).emit('attendance_updated', {
            type: 'attendance_marked',
            studentName: match.student.name
          });
        } catch (err) {
          console.error('Socket emit error:', err);
        }

        res.json({
          message: 'Attendance marked successfully (student added to session)',
          student: {
            id: match.student._id,
            name: match.student.name,
            rollNumber: match.student.rollNumber,
            confidence: match.confidence
          },
          attendance: {
            present: session.presentStudents,
            absent: session.absentStudents,
            total: session.totalStudents
          }
        });
        return;
      } else {
        res.status(404).json({
          message: 'Student not found in attendance session',
          hint: 'The student may have been registered after the session was created. Please restart the attendance session.'
        });
        return;
      }
    }

    const record = session.records[recordIndex];
    const wasPresent = record.isPresent;

    if (!wasPresent) {
      // Mark as present
      record.isPresent = true;
      record.markedAt = new Date();
      // Clamp confidence to prevent floating-point precision issues
      record.confidence = Math.min(1.0, Math.max(0.0, match.confidence));

      session.presentStudents += 1;
      session.absentStudents -= 1;

      await session.save();

      // Emit socket event for real-time dashboard updates
      try {
        getIO().to(`faculty_${facultyId}`).emit('attendance_updated', {
          type: 'attendance_marked',
          studentName: match.student.name
        });
      } catch (err) {
        console.error('Socket emit error:', err);
      }

      res.json({
        message: 'Attendance marked successfully',
        student: {
          id: match.student._id,
          name: match.student.name,
          rollNumber: match.student.rollNumber,
          confidence: match.confidence
        },
        attendance: {
          present: session.presentStudents,
          absent: session.absentStudents,
          total: session.totalStudents
        }
      });
    } else {
      res.json({
        message: 'Student already marked present',
        student: {
          id: match.student._id,
          name: match.student.name,
          rollNumber: match.student.rollNumber
        },
        attendance: {
          present: session.presentStudents,
          absent: session.absentStudents,
          total: session.totalStudents
        }
      });
    }

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
}

// Check if attendance has been taken for today's session
export async function checkAttendanceStatus(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { subject, section, sessionType } = req.query;

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!subject || !section || !sessionType) {
      res.status(400).json({ message: 'subject, section, and sessionType are required' });
      return;
    }

    // Check if session exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingSession = await AttendanceSession.findOne({
      facultyId: new mongoose.Types.ObjectId(facultyId),
      subject: subject as string,
      section: section as string,
      sessionType: sessionType as string,
      date: today
    });

    if (existingSession) {
      // Reconcile totals with latest enrollment so DB and reports stay accurate
      const enrolledStudents = await Student.find({
        'enrollments.subject': subject as string,
        'enrollments.section': section as string,
        'enrollments.facultyId': new mongoose.Types.ObjectId(facultyId)
      }).select('_id');

      const latestTotal = enrolledStudents.length;
      const presentCount = existingSession.records.filter(r => r.isPresent).length;
      const reconciledAbsent = Math.max(0, latestTotal - presentCount);

      let didChange = false;
      if (existingSession.totalStudents !== latestTotal) {
        existingSession.totalStudents = latestTotal;
        didChange = true;
      }
      if (existingSession.presentStudents !== presentCount) {
        existingSession.presentStudents = presentCount;
        didChange = true;
      }
      if (existingSession.absentStudents !== reconciledAbsent) {
        existingSession.absentStudents = reconciledAbsent;
        didChange = true;
      }
      if (didChange) {
        await existingSession.save();
      }

      res.status(200).json({
        hasAttendance: true,
        sessionId: existingSession._id,
        totalStudents: existingSession.totalStudents,
        presentStudents: existingSession.presentStudents,
        absentStudents: existingSession.absentStudents,
        location: existingSession.location ? {
          latitude: existingSession.location.latitude,
          longitude: existingSession.location.longitude,
          address: existingSession.location.address,
          accuracy: existingSession.location.accuracy
        } : null,
        createdAt: existingSession.createdAt,
        updatedAt: existingSession.updatedAt
      });
    } else {
      res.status(200).json({
        hasAttendance: false
      });
    }

  } catch (error) {
    console.error('Check attendance status error:', error);
    res.status(500).json({ message: 'Failed to check attendance status' });
  }
}

// Get attendance session details
export async function getAttendanceSession(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { sessionId } = req.params;

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
      res.status(400).json({ message: 'Valid sessionId is required' });
      return;
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Attendance session not found' });
      return;
    }

    // Verify faculty owns this session
    if (String(session.facultyId) !== String(facultyId)) {
      res.status(403).json({ message: 'Unauthorized to access this session' });
      return;
    }

    // Get current enrolled students to reconcile with records
    const enrolledStudents = await Student.find({
      'enrollments.subject': session.subject,
      'enrollments.section': session.section,
      'enrollments.facultyId': session.facultyId
    }).select('_id name rollNumber');

    // Create a map of present student IDs from records
    const presentStudentIds = new Set(
      session.records
        .filter(record => record.isPresent)
        .map(record => String(record.studentId))
    );

    // Separate present and absent students
    const presentStudents = session.records
      .filter(record => record.isPresent)
      .map(record => ({
        id: record.studentId,
        name: record.studentName,
        rollNumber: record.rollNumber,
        markedAt: record.markedAt,
        confidence: record.confidence,
        markedVia: 'Face Detection'
      }));

    // Get all unique student IDs from records (in case enrollment query misses some)
    const allRecordStudentIds = new Set(
      session.records.map(record => String(record.studentId))
    );

    // Get all unique enrolled student IDs
    const enrolledStudentIds = new Set(
      enrolledStudents.map(student => String(student._id))
    );

    // Combine both sets to get complete list of students (enrolled OR in records)
    const allStudentIds = new Set([...enrolledStudentIds, ...allRecordStudentIds]);

    // Get absent students: those enrolled but NOT marked present
    // Build absent list from enrolled students, excluding those marked present
    const absentStudents: Array<{
      id: any;
      name: string;
      rollNumber: string;
    }> = [];

    // For each enrolled student, check if they're present
    enrolledStudents.forEach(student => {
      const studentId = String(student._id);

      // If student is NOT in present list, they are absent
      if (!presentStudentIds.has(studentId)) {
        // Try to get name/roll from records if available (for consistency)
        const record = session.records.find(r => String(r.studentId) === studentId);

        absentStudents.push({
          id: student._id,
          name: record ? record.studentName : student.name,
          rollNumber: record ? record.rollNumber : student.rollNumber
        });
      }
    });

    // Also add any students from records who are not enrolled and not present (orphaned records)
    session.records.forEach(record => {
      const studentId = String(record.studentId);
      if (!presentStudentIds.has(studentId) && !enrolledStudentIds.has(studentId)) {
        absentStudents.push({
          id: record.studentId,
          name: record.studentName,
          rollNumber: record.rollNumber
        });
      }
    });

    // Recalculate totals: use MAX of enrolled count and students in records
    // This ensures total is never less than present count
    const actualTotalStudents = Math.max(enrolledStudents.length, allStudentIds.size);
    const actualPresentStudents = presentStudents.length;
    const actualAbsentStudents = absentStudents.length;

    // Update session totals if they don't match (reconciliation)
    if (session.totalStudents !== actualTotalStudents ||
      session.presentStudents !== actualPresentStudents ||
      session.absentStudents !== actualAbsentStudents) {
      session.totalStudents = actualTotalStudents;
      session.presentStudents = actualPresentStudents;
      session.absentStudents = actualAbsentStudents;
      await session.save();
    }

    res.json({
      session: {
        id: session._id,
        subject: session.subject,
        section: session.section,
        sessionType: session.sessionType,
        hours: session.hours,
        date: session.date,
        totalStudents: actualTotalStudents,
        presentStudents: actualPresentStudents,
        absentStudents: actualAbsentStudents,
        attendancePercentage: actualTotalStudents > 0
          ? Math.round((actualPresentStudents / actualTotalStudents) * 100)
          : 0,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      },
      // Detailed student lists
      presentStudentsList: presentStudents,
      absentStudentsList: absentStudents,
      // Legacy records format for backward compatibility
      records: session.records.map(record => ({
        studentId: record.studentId,
        studentName: record.studentName,
        rollNumber: record.rollNumber,
        isPresent: record.isPresent,
        markedAt: record.markedAt,
        confidence: record.confidence
      }))
    });

  } catch (error) {
    console.error('Get attendance session error:', error);
    res.status(500).json({ message: 'Failed to get attendance session' });
  }
}
// Update attendance session location
export async function updateAttendanceLocation(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { sessionId } = req.params;
    const { latitude, longitude, address, accuracy } = req.body || {};

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
      res.status(400).json({ message: 'Valid sessionId is required' });
      return;
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ message: 'latitude and longitude are required' });
      return;
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      res.status(404).json({ message: 'Attendance session not found' });
      return;
    }
    if (String(session.facultyId) !== String(facultyId)) {
      res.status(403).json({ message: 'Unauthorized to update this session' });
      return;
    }

    session.location = {
      latitude,
      longitude,
      address,
      accuracy,
    } as any;
    await session.save();

    res.status(200).json({ message: 'Location updated', location: session.location });
  } catch (error) {
    console.error('Update attendance location error:', error);
    res.status(500).json({ message: 'Failed to update location' });
  }
}

// Get student attendance data for a specific subject/section/sessionType
export async function getStudentAttendanceData(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { subject, section, sessionType } = req.query;

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!subject || !section || !sessionType) {
      res.status(400).json({ message: 'subject, section, and sessionType are required' });
      return;
    }

    // Get all attendance sessions for this subject/section/sessionType
    const sessions = await AttendanceSession.find({
      facultyId: new mongoose.Types.ObjectId(facultyId),
      subject: subject as string,
      section: section as string,
      sessionType: sessionType as string
    }).sort({ date: -1 }); // Most recent first

    // Get all students for this subject/section
    const students = await Student.find({
      'enrollments.subject': subject as string,
      'enrollments.section': section as string,
      'enrollments.facultyId': new mongoose.Types.ObjectId(facultyId)
    }).select('name rollNumber');

    // Calculate attendance for each student
    const studentAttendanceData = students.map(student => {
      let totalSessions = 0;
      let presentSessions = 0;
      let lastPresentDate: Date | null = null;
      let lastPresentSessionHours: string | null = null;

      sessions.forEach(session => {
        totalSessions++;
        const studentRecord = session.records.find(record =>
          record.studentId.toString() === (student as any)._id.toString()
        );
        if (studentRecord && studentRecord.isPresent) {
          presentSessions++;
          // Update last present date if this session is more recent
          if (!lastPresentDate || session.date > lastPresentDate) {
            lastPresentDate = session.date;
            // Store session hours for display
            lastPresentSessionHours = session.hours.map(hour => `H${hour}`).join(', ');
          }
        }
      });

      const attendancePercentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

      return {
        studentId: (student as any)._id,
        name: student.name,
        rollNumber: student.rollNumber,
        totalSessions,
        presentSessions,
        absentSessions: totalSessions - presentSessions,
        attendancePercentage,
        lastAttendanceDate: lastPresentDate,
        lastPresentSessionHours: lastPresentSessionHours
      };
    });

    res.status(200).json({
      students: studentAttendanceData,
      totalSessions: sessions.length,
      dateRange: sessions.length > 0 ? {
        from: sessions[sessions.length - 1].date,
        to: sessions[0].date
      } : null
    });

  } catch (error) {
    console.error('Get student attendance data error:', error);
    res.status(500).json({ message: 'Failed to get student attendance data' });
  }
}

// Get attendance reports
export async function getAttendanceReports(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { subject, section, startDate, endDate } = req.query;

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Build query
    const query: any = { facultyId: new mongoose.Types.ObjectId(facultyId) };

    if (subject) query.subject = subject;
    if (section) query.section = section;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setUTCHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setUTCHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const sessions = await AttendanceSession.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(100); // Limit to prevent large responses

    // Process sessions and reconcile totals
    const processedSessions = await Promise.all(sessions.map(async (session) => {
      // Get current enrolled students to reconcile with records
      const enrolledStudents = await Student.find({
        'enrollments.subject': session.subject,
        'enrollments.section': session.section,
        'enrollments.facultyId': session.facultyId
      }).select('_id name rollNumber');

      // Create a map of present student IDs from records
      const presentStudentIds = new Set(
        session.records
          .filter(record => record.isPresent)
          .map(record => String(record.studentId))
      );

      // Separate present and absent students
      const presentStudents = session.records
        .filter(record => record.isPresent)
        .map(record => ({
          id: record.studentId,
          name: record.studentName,
          rollNumber: record.rollNumber,
          markedAt: record.markedAt,
          confidence: record.confidence,
          markedVia: 'Face Detection' // All attendance is marked via face detection
        }));

      // Get all unique student IDs from records (in case enrollment query misses some)
      const allRecordStudentIds = new Set(
        session.records.map(record => String(record.studentId))
      );

      // Get all unique enrolled student IDs
      const enrolledStudentIds = new Set(
        enrolledStudents.map(student => String(student._id))
      );

      // Combine both sets to get complete list of students (enrolled OR in records)
      const allStudentIds = new Set([...enrolledStudentIds, ...allRecordStudentIds]);

      // Get absent students: those enrolled but NOT marked present
      const absentStudents: Array<{
        id: any;
        name: string;
        rollNumber: string;
      }> = [];

      // For each enrolled student, check if they're present
      enrolledStudents.forEach(student => {
        const studentId = String(student._id);

        // If student is NOT in present list, they are absent
        if (!presentStudentIds.has(studentId)) {
          // Try to get name/roll from records if available (for consistency)
          const record = session.records.find(r => String(r.studentId) === studentId);

          absentStudents.push({
            id: student._id,
            name: record ? record.studentName : student.name,
            rollNumber: record ? record.rollNumber : student.rollNumber
          });
        }
      });

      // Also add any students from records who are not enrolled and not present (orphaned records)
      session.records.forEach(record => {
        const studentId = String(record.studentId);
        if (!presentStudentIds.has(studentId) && !enrolledStudentIds.has(studentId)) {
          absentStudents.push({
            id: record.studentId,
            name: record.studentName,
            rollNumber: record.rollNumber
          });
        }
      });

      // Recalculate totals: use MAX of enrolled count and students in records
      // This ensures total is never less than present count
      const actualTotalStudents = Math.max(enrolledStudents.length, allStudentIds.size);
      const actualPresentStudents = presentStudents.length;
      const actualAbsentStudents = absentStudents.length;

      // Update session totals if they don't match (reconciliation)
      if (session.totalStudents !== actualTotalStudents ||
        session.presentStudents !== actualPresentStudents ||
        session.absentStudents !== actualAbsentStudents) {
        session.totalStudents = actualTotalStudents;
        session.presentStudents = actualPresentStudents;
        session.absentStudents = actualAbsentStudents;
        await session.save();
      }

      return {
        id: session._id,
        subject: session.subject,
        section: session.section,
        sessionType: session.sessionType,
        hours: session.hours,
        date: session.date,
        totalStudents: actualTotalStudents,
        presentStudents: actualPresentStudents,
        absentStudents: actualAbsentStudents,
        attendancePercentage: actualTotalStudents > 0
          ? Math.round((actualPresentStudents / actualTotalStudents) * 100)
          : 0,
        location: session.location ? {
          latitude: session.location.latitude,
          longitude: session.location.longitude,
          address: session.location.address,
          accuracy: session.location.accuracy
        } : null,
        isMissed: session.isMissed,
        missedReason: session.missedReason,
        missedNote: session.missedNote,
        missedAt: session.missedAt,
        createdAt: session.createdAt,
        // Detailed student lists
        presentStudentsList: presentStudents,
        absentStudentsList: absentStudents
      };
    }));

    res.json({
      sessions: processedSessions
    });

  } catch (error) {
    console.error('Get attendance reports error:', error);
    res.status(500).json({ message: 'Failed to get attendance reports' });
  }
}

// Mark session as missed (post-lock)
export async function markSessionMissed(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    const { subject, section, sessionType, hours, date, reason, note } = req.body;

    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!subject || !section || !sessionType || !hours || !date || !reason) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const sessionDate = new Date(date);
    sessionDate.setUTCHours(0, 0, 0, 0);

    // Check if session exists
    let session = await AttendanceSession.findOne({
      facultyId: new mongoose.Types.ObjectId(facultyId),
      subject,
      section,
      sessionType,
      date: sessionDate,
      // We might need to match hours specifically, but usually subject/section/type/date is unique enough per faculty?
      // Actually, if a faculty has multiple sessions of same subject/section/type on same day (e.g. morning and afternoon), hours are critical.
      // But AttendanceSession schema doesn't seem to have hours in the query usually?
      // Wait, startAttendanceSession checks for `date: today` only... implying one session per day per subj/sec/type?
      // Line 95 in startAttendanceSession:
      // const existingSession = await AttendanceSession.findOne({ ... date: today });
      // So yes, currently the system assumes one session per subj/sec/type per day.
    });

    if (session) {
      // If attendance was taken (present students > 0), we can't mark as missed
      if (session.presentStudents > 0) {
        res.status(400).json({ message: 'Cannot mark as missed: Attendance has already been taken for this session.' });
        return;
      }

      // Update existing session
      session.isMissed = true;
      session.missedReason = reason;
      session.missedNote = note;
      session.missedAt = new Date();
      await session.save();
    } else {
      // Create new "Missed" session
      // We need enrolled students to populate absent count if we want reports to be accurate
      const enrolledStudents = await Student.find({
        'enrollments.subject': subject,
        'enrollments.section': section,
        'enrollments.facultyId': new mongoose.Types.ObjectId(facultyId)
      }).select('_id name rollNumber');

      session = await AttendanceSession.create({
        facultyId: new mongoose.Types.ObjectId(facultyId),
        subject,
        section,
        sessionType,
        hours,
        date: sessionDate,
        totalStudents: enrolledStudents.length,
        presentStudents: 0,
        absentStudents: enrolledStudents.length, // Everyone absent effectively? Or do we treat "Missed" differently?
        // If we set absentStudents = total, reports will show 0% attendance.
        // If isMissed is true, UI can handle it.
        records: [], // No records
        isMissed: true,
        missedReason: reason,
        missedNote: note,
        missedAt: new Date()
      });
    }

    // Audit Log
    await createAuditLog({
      action: 'Session Missed',
      details: `Marked "${reason}" for ${subject} (${section}) on ${sessionDate.toDateString()}`,
      req,
      facultyId,
      platform: 'Web'
    });

    res.status(200).json({
      message: 'Session marked as missed successfully',
      session
    });

  } catch (error) {
    console.error('Mark session missed error:', error);
    res.status(500).json({ message: 'Failed to mark session as missed' });
  }
}
