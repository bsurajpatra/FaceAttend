import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { getHuman, imageBase64ToTensor } from '../services/human';

export async function registerStudent(req: Request, res: Response): Promise<void> {
  console.log('=== STUDENT REGISTRATION REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Faculty ID:', req.userId);
  
  try {
    const facultyId = req.userId;
    if (!facultyId || !mongoose.isValidObjectId(facultyId)) {
      console.log('❌ Invalid faculty ID:', facultyId);
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    
    console.log('✅ Faculty ID valid:', facultyId);

    const { name, rollNumber, subject, section, sessionType, faceDescriptor, faceImageBase64 } = req.body as {
      name: string;
      rollNumber: string;
      subject: string;
      section: string;
      sessionType: 'Lecture' | 'Tutorial' | 'Practical' | 'Skill';
      faceDescriptor?: number[]; // Client-processed face descriptor (preferred)
      faceImageBase64?: string; // Fallback: base64 image for server processing
    };

    if (!name || !rollNumber || !subject || !section || !sessionType) {
      console.log('❌ Missing required fields:', { name: !!name, rollNumber: !!rollNumber, subject: !!subject, section: !!section, sessionType: !!sessionType });
      res.status(400).json({ message: 'name, rollNumber, subject, section and sessionType are required' });
      return;
    }
    
    console.log('✅ All required fields present');

    // Face data is MANDATORY for student registration
    if ((!faceDescriptor || faceDescriptor.length === 0) && !faceImageBase64) {
      console.log('❌ No face data provided - face processing is mandatory');
      res.status(400).json({ 
        message: 'Face data is required for student registration',
        hint: 'Please capture a face image using the camera. The app will process it automatically.'
      });
      return;
    }
    
    let finalDescriptor: number[] = [];
    
    if (faceDescriptor && faceDescriptor.length > 0) {
      // Use client-provided face descriptor
      console.log('✅ Using client-provided face descriptor, length:', faceDescriptor.length);
      finalDescriptor = faceDescriptor;
    } else if (faceImageBase64) {
      // Process face on server as fallback
      console.log('🔄 Processing face image on server (fallback)...');
      try {
        const human = await getHuman();
        console.log('✅ Human library loaded');
        const tensor = await imageBase64ToTensor(faceImageBase64);
        console.log('✅ Image converted to tensor');
        const result = await human.detect(tensor);
        console.log('✅ Face detection completed, faces found:', result.face?.length || 0);
        
        if (!result.face || result.face.length === 0) {
          console.log('❌ No faces detected in image');
          res.status(400).json({ 
            message: 'No face detected in the provided image',
            hint: 'Please ensure the image contains a clear face and try again'
          });
          return;
        }
        
        const first = result.face[0];
        if (!first?.embedding) {
          console.log('❌ No face embedding found');
          res.status(400).json({ 
            message: 'Could not extract face features from the image',
            hint: 'Please ensure the face is clearly visible and well-lit'
          });
          return;
        }
        
        finalDescriptor = Array.from(first.embedding);
        console.log('✅ Face descriptor computed on server, length:', finalDescriptor.length);
      } catch (error: any) {
        console.error('❌ Server-side face processing error:', error);
        res.status(500).json({ 
          message: 'Failed to process face image on server',
          hint: 'Please try capturing the image again with better lighting'
        });
        return;
      } finally {
        // Tensor disposal is handled in the try block
      }
    }
    
    console.log('✅ Final descriptor length:', finalDescriptor.length);

    // Verify subject/section/sessionType exists in faculty timetable
    console.log('🔍 Verifying timetable for faculty:', facultyId);
    const faculty = await Faculty.findById(facultyId).select('timetable');
    if (!faculty) {
      console.log('❌ Faculty not found');
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    console.log('✅ Faculty found, timetable sessions:', faculty.timetable?.length || 0);
    
    // Check if faculty has any timetable data
    if (!faculty.timetable || faculty.timetable.length === 0) {
      console.log('⚠️ Faculty has no timetable - allowing registration for testing');
      // For now, allow registration even without timetable for testing
    } else {
      const isValidOffering = (faculty.timetable || []).some((day) =>
        (day.sessions || []).some((s) => s.subject === subject && s.section === section && s.sessionType === sessionType)
      );

      if (!isValidOffering) {
        console.log('❌ Invalid offering - not in timetable');
        res.status(400).json({ 
          message: 'Selected subject/section/sessionType is not in your timetable. Please set up your timetable first.',
          hint: 'Go to the Timetable section in the app to add this subject/section/sessionType combination.'
        });
        return;
      }
      
      console.log('✅ Offering verified in timetable');
    }

    // Upsert by rollNumber; add enrollment if not present
    console.log('🔍 Checking for existing student with roll number:', rollNumber);
    const existing = await Student.findOne({ rollNumber });
    const enrollmentKey = `${subject}::${section}::${facultyId}`;

    if (existing) {
      console.log('✅ Student exists, updating...');
      const hasEnrollment = (existing.enrollments || []).some((e) =>
        e.subject === subject && e.section === section && String(e.facultyId) === String(facultyId)
      );

      if (!hasEnrollment) {
        console.log('➕ Adding new enrollment');
        existing.enrollments.push({ subject, section, facultyId: new mongoose.Types.ObjectId(facultyId) });
      } else {
        console.log('ℹ️ Enrollment already exists');
      }

      // Update faceDescriptor with latest capture
      existing.faceDescriptor = finalDescriptor;

      await existing.save();
      console.log('✅ Student updated successfully');
      res.status(200).json({ message: 'Student updated', studentId: existing.id });
      return;
    }

    console.log('➕ Creating new student...');
    const created = await Student.create({
      name,
      rollNumber,
      enrollments: [{ subject, section, facultyId: new mongoose.Types.ObjectId(facultyId) }],
      faceDescriptor: finalDescriptor,
    });

    console.log('✅ Student created successfully with ID:', created.id);
    res.status(201).json({ message: 'Student registered', studentId: created.id });
  } catch (error) {
    console.error('❌ Student registration error:', error);
    res.status(500).json({ message: 'Failed to register student' });
  }
}


