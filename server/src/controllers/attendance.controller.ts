import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AttendanceSession } from '../models/Attendance';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { getFaceEmbedding } from '../services/facenet.service';

// Face matching threshold (cosine similarity) - higher threshold for FaceNet embeddings
const FACE_MATCH_THRESHOLD = 0.6;

// Rate limiting for session creation
const sessionCreationTimes = new Map<string, number>();
const SESSION_CREATION_COOLDOWN = 1000; // 1 second

// Calculate cosine similarity between two face descriptors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

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

    // Get absent students: those enrolled but not marked present
    // First, try to get from records (for students with records but marked absent)
    const absentFromRecords = session.records
      .filter(record => !record.isPresent)
      .map(record => ({
        id: record.studentId,
        name: record.studentName,
        rollNumber: record.rollNumber
      }));

    // Also include enrolled students who aren't in present list (handles cases where enrollment changed)
    const absentStudentIds = new Set(absentFromRecords.map(s => String(s.id)));
    enrolledStudents.forEach(student => {
      const studentId = String(student._id);
      if (!presentStudentIds.has(studentId) && !absentStudentIds.has(studentId)) {
        absentFromRecords.push({
          id: student._id,
          name: student.name,
          rollNumber: student.rollNumber
        });
        absentStudentIds.add(studentId);
      }
    });

    const absentStudents = absentFromRecords;

    res.json({
      session: {
        id: session._id,
        subject: session.subject,
        section: session.section,
        sessionType: session.sessionType,
        hours: session.hours,
        date: session.date,
        totalStudents: session.totalStudents,
        presentStudents: session.presentStudents,
        absentStudents: session.absentStudents,
        attendancePercentage: session.totalStudents > 0 
          ? Math.round((session.presentStudents / session.totalStudents) * 100) 
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
          record.studentId.toString() === student._id.toString()
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
        studentId: student._id,
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
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }
    
    const sessions = await AttendanceSession.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(100); // Limit to prevent large responses
    
    res.json({
      sessions: sessions.map(session => {
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

        const absentStudents = session.records
          .filter(record => !record.isPresent)
          .map(record => ({
            id: record.studentId,
            name: record.studentName,
            rollNumber: record.rollNumber
          }));

        return {
          id: session._id,
          subject: session.subject,
          section: session.section,
          sessionType: session.sessionType,
          hours: session.hours,
          date: session.date,
          totalStudents: session.totalStudents,
          presentStudents: session.presentStudents,
          absentStudents: session.absentStudents,
          attendancePercentage: session.totalStudents > 0 
            ? Math.round((session.presentStudents / session.totalStudents) * 100) 
            : 0,
          location: session.location ? {
            latitude: session.location.latitude,
            longitude: session.location.longitude,
            address: session.location.address,
            accuracy: session.location.accuracy
          } : null,
          createdAt: session.createdAt,
          // Detailed student lists
          presentStudentsList: presentStudents,
          absentStudentsList: absentStudents
        };
      })
    });
    
  } catch (error) {
    console.error('Get attendance reports error:', error);
    res.status(500).json({ message: 'Failed to get attendance reports' });
  }
}
