import { cosineSimilarity } from '../utils/math';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface FaceMatchResult {
  student: any;
  confidence: number;
}

export interface FaceMatchOptions {
  threshold?: number;
  verbose?: boolean;
}

/**
 * Single Authoritative Face Matching Service
 * Compares an incoming 512-dim face embedding vector against a list of enrolled students.
 * Supports multiple embeddings per student, fallback to legacy descriptor, and tie-breaking by highest similarity.
 */
export async function findMatchingStudent(
  faceEmbedding: number[],
  enrolledStudents: any[],
  options?: FaceMatchOptions
): Promise<FaceMatchResult | null> {
  const threshold = options?.threshold ?? env.faceMatchThreshold;
  const verbose = options?.verbose ?? false;

  if (!faceEmbedding || faceEmbedding.length === 0 || !enrolledStudents || enrolledStudents.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestConfidence = 0;

  for (const student of enrolledStudents) {
    const embeddings = student.embeddings || [];
    const legacyDescriptor = student.faceDescriptor || [];

    if (embeddings.length === 0 && legacyDescriptor.length === 0) {
      continue;
    }

    const faceDataArray = embeddings.length > 0 ? embeddings : [legacyDescriptor];

    for (const storedEmbedding of faceDataArray) {
      if (!storedEmbedding || storedEmbedding.length === 0) continue;

      const similarity = cosineSimilarity(faceEmbedding, storedEmbedding);

      if (verbose) {
        logger.info(`Comparing face with ${student.name}: similarity = ${similarity.toFixed(4)}`);
      }

      if (similarity > bestConfidence && similarity >= threshold) {
        bestConfidence = similarity;
        bestMatch = student;
      }
    }
  }

  if (verbose && bestMatch) {
    logger.info(`Face match identified: ${bestMatch.name} (confidence ${bestConfidence.toFixed(4)})`);
  }

  return bestMatch ? { student: bestMatch, confidence: bestConfidence } : null;
}
