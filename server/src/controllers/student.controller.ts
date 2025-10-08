import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { getHuman, imageBase64ToTensor } from '../services/human';

export async function registerStudent(req: Request, res: Response): Promise<void> {
  try {
    const facultyId = req.userId;
    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { name, rollNumber, subject, section, sessionType, faceDescriptor, faceImageBase64 } = req.body as {
      name: string;
      rollNumber: string;
      subject: string;
      section: string;
      sessionType: 'Lecture' | 'Tutorial' | 'Practical' | 'Skill';
      faceDescriptor?: number[];
      faceImageBase64?: string;
    };

    if (!name || !rollNumber || !subject || !section || !sessionType) {
      res.status(400).json({ message: 'name, rollNumber, subject, section and sessionType are required' });
      return;
    }

    // If client can't compute descriptor (Expo Go), compute on server from base64
    let computedDescriptor: number[] | undefined = undefined;
    if ((!faceDescriptor || faceDescriptor.length === 0) && faceImageBase64) {
      const human = await getHuman();
      const tensor = await imageBase64ToTensor(faceImageBase64);
      try {
        const result = await human.detect(tensor);
        const first = result.face?.[0];
        if (!first?.embedding) {
          res.status(400).json({ message: 'No face embedding found in the provided image' });
          return;
        }
        computedDescriptor = Array.from(first.embedding);
      } finally {
        tensor.dispose();
      }
    }

    const finalDescriptor = (faceDescriptor && faceDescriptor.length > 0) ? faceDescriptor : computedDescriptor;
    if (!finalDescriptor || finalDescriptor.length === 0) {
      res.status(400).json({ message: 'faceDescriptor or faceImageBase64 is required' });
      return;
    }

    // Verify subject/section/sessionType exists in faculty timetable
    const faculty = await Faculty.findById(facultyId).select('timetable');
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    const isValidOffering = (faculty.timetable || []).some((day) =>
      (day.sessions || []).some((s) => s.subject === subject && s.section === section && s.sessionType === sessionType)
    );

    if (!isValidOffering) {
      res.status(400).json({ message: 'Selected subject/section/sessionType is not in your timetable' });
      return;
    }

    // Upsert by rollNumber; add enrollment if not present
    const existing = await Student.findOne({ rollNumber });
    const enrollmentKey = `${subject}::${section}::${facultyId}`;

    if (existing) {
      const hasEnrollment = (existing.enrollments || []).some((e) =>
        e.subject === subject && e.section === section && String(e.facultyId) === String(facultyId)
      );

      if (!hasEnrollment) {
        existing.enrollments.push({ subject, section, facultyId: new mongoose.Types.ObjectId(facultyId) });
      }

      // Optionally update faceDescriptor if provided; prefer latest capture
      if (Array.isArray(finalDescriptor) && finalDescriptor.length > 0) {
        existing.faceDescriptor = finalDescriptor;
      }

      await existing.save();
      res.status(200).json({ message: 'Student updated', studentId: existing.id });
      return;
    }

    const created = await Student.create({
      name,
      rollNumber,
      enrollments: [{ subject, section, facultyId: new mongoose.Types.ObjectId(facultyId) }],
      faceDescriptor: finalDescriptor,
    });

    res.status(201).json({ message: 'Student registered', studentId: created.id });
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ message: 'Failed to register student' });
  }
}


