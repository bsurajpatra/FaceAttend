import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { AttendanceSession } from '../models/Attendance';
import { Student } from '../models/Student';
import { getFaceEmbedding } from '../services/facenet.service';
import { getIO } from '../socket';
import { cosineSimilarity } from '../utils/math';
import { env } from '../config/env';
import redisClient from '../config/redis';

// Thresholds same as controller
const FACE_MATCH_THRESHOLD = 0.6;
const DETECTION_THRESHOLD = 2; // Tuned for faster detection

// Helper function from controller
async function findMatchingStudent(faceEmbedding: number[], enrolledStudents: any[]) {
  let bestMatch = null;
  let bestConfidence = 0;
  for (const student of enrolledStudents) {
    const embeddings = student.embeddings || [];
    const faceDataArray = embeddings.length > 0 ? embeddings : [student.faceDescriptor];
    for (const storedEmbedding of faceDataArray) {
      if (!storedEmbedding || storedEmbedding.length === 0) continue;
      const similarity = cosineSimilarity(faceEmbedding, storedEmbedding);
      if (similarity > bestConfidence && similarity >= FACE_MATCH_THRESHOLD) {
        bestConfidence = similarity;
        bestMatch = student;
      }
    }
  }
  return bestMatch ? { student: bestMatch, confidence: bestConfidence } : null;
}

export const attendanceWorker = new Worker('attendance-processing', async (job: Job) => {
  const { sessionId, faceImageBase64, facultyId } = job.data;
  const waitTime = Date.now() - job.timestamp;

  console.log(`👷 Worker: Processing job ${job.id} for session ${sessionId} | Wait time: ${waitTime}ms`);

  try {
    const session = await AttendanceSession.findById(sessionId);
    if (!session) return;

    // 1. Face Recognition Cache (Hash Check)
    const imageHash = crypto.createHash('md5').update(faceImageBase64).digest('hex');
    const cacheKey = `face:cache:${imageHash}`;
    let match: any = null;

    const cachedMatch = await redisClient.get(cacheKey);
    if (cachedMatch) {
      match = JSON.parse(cachedMatch);
    } else {
      const faceEmbedding = await getFaceEmbedding(faceImageBase64);
      const enrolledStudents = await Student.find({
        'enrollments.subject': session.subject,
        'enrollments.section': session.section,
        'enrollments.facultyId': session.facultyId
      }).select('_id name rollNumber faceDescriptor embeddings');

      match = await findMatchingStudent(faceEmbedding, enrolledStudents);
      if (match) await redisClient.setEx(cacheKey, 10, JSON.stringify(match));
    }

    if (!match) {
      getIO().to(`faculty_${facultyId}`).emit('attendance_error', { message: 'Face not recognized', jobId: job.id });
      return;
    }

    const studentId = String(match.student._id);
    
    // 2. Cooldown Check (Prevents redundant processing immediately after marking)
    const cooldownKey = `attendance:cooldown:${studentId}`;
    const isInCooldown = await redisClient.exists(cooldownKey);
    if (isInCooldown) {
      console.log(`⏳ Worker: Student ${match.student.name} is in cooldown. Ignored.`);
      return; 
    }

    const liveSetKey = `attendance:live:${sessionId}`;

    // 3. Already Marked Check
    const isMarked = await redisClient.sIsMember(liveSetKey, studentId);
    if (isMarked) {
      getIO().to(`faculty_${facultyId}`).emit('attendance_duplicate', { 
        studentName: match.student.name,
        rollNumber: match.student.rollNumber // Include ID here
      });
      return;
    }

    // 4. Confidence Window
    const detectKey = `detect:${sessionId}:${studentId}`;
    const count = await redisClient.incr(detectKey);
    if (count === 1) await redisClient.expire(detectKey, 3); // Reduced TTL to 3 seconds for speed

    if (count < DETECTION_THRESHOLD) {
      getIO().to(`faculty_${facultyId}`).emit('attendance_recognizing', {
        studentName: match.student.name,
        count,
        threshold: DETECTION_THRESHOLD
      });
      return;
    }

    // 5. Mark Attendance & Set Cooldown
    await redisClient.setEx(cooldownKey, 20, '1'); // TTL 20 seconds cooldown
    await redisClient.sAdd(liveSetKey, studentId);
    
    // We update DB here or let the batch job handle it. 
    // For reactive UX, we'll update DB and emit success immediately.
    const recordIndex = session.records.findIndex(r => String(r.studentId) === studentId);
    if (recordIndex !== -1 && !session.records[recordIndex].isPresent) {
      session.records[recordIndex].isPresent = true;
      session.records[recordIndex].markedAt = new Date();
      session.presentStudents += 1;
      session.absentStudents -= 1;
      await session.save();
    }

    // 5. Success Notification
    getIO().to(`faculty_${facultyId}`).emit('attendance_result', {
      status: 'success',
      studentName: match.student.name,
      rollNumber: match.student.rollNumber,
      studentId,
      attendance: {
        present: session.presentStudents,
        absent: session.absentStudents,
        total: session.totalStudents
      }
    });

  } catch (error: any) {
    console.error(`❌ Worker Error in job ${job.id}:`, error);
    // Notify client of failure so the UI doesn't get stuck on an old message
    try {
      getIO().to(`faculty_${facultyId}`).emit('attendance_error', { 
        message: error.message || 'Face detection failed',
        jobId: job.id
      });
    } catch (e) {}
  }
}, {
  connection: {
    url: env.redisUrl
  },
  concurrency: 20 // Process 20 faces in parallel!
});

attendanceWorker.on('error', (err) => {
  console.error('👷 BullMQ: Worker Error:', err.message);
});

console.log('👷 BullMQ: Attendance Worker started');
