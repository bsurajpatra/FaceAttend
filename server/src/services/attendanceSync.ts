import { AttendanceSession } from '../models/Attendance';
import redisClient from '../config/redis';

/**
 * Periodically flushes active attendance from Redis to MongoDB
 * Implementable with Solution #1
 */
export async function syncAttendanceToDb() {
  console.log('🔄 background-job: Syncing Redis attendance to MongoDB...');

  try {
    // Find all active live attendance sessions in Redis
    const keys = await redisClient.keys('attendance:live:*');
    
    for (const key of keys) {
      const sessionId = key.split(':')[2];
      
      // Get all marked student IDs from Redis set
      const studentIds = await redisClient.sMembers(key);
      
      if (studentIds.length === 0) continue;

      // Update AttendanceSession in MongoDB
      const session = await AttendanceSession.findById(sessionId);
      if (!session) continue;

      let modified = false;

      for (const studentId of studentIds) {
        const recordIndex = session.records.findIndex(
          r => String(r.studentId) === String(studentId)
        );

        if (recordIndex !== -1 && !session.records[recordIndex].isPresent) {
          session.records[recordIndex].isPresent = true;
          session.records[recordIndex].markedAt = session.records[recordIndex].markedAt || new Date();
          modified = true;
        }
      }

      if (modified) {
        // Recalculate totals
        session.presentStudents = session.records.filter(r => r.isPresent).length;
        session.absentStudents = Math.max(0, session.totalStudents - session.presentStudents);
        
        await session.save();
        console.log(`✅ Synced ${studentIds.length} students for session ${sessionId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error during attendance sync:', error);
  }
}

// Run every 60 seconds
export function startAttendanceSyncJob() {
  setInterval(syncAttendanceToDb, 60000);
  console.log('🚀 Attendance background sync job started (60s interval)');
}
