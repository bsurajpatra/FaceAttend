import { Request, Response } from 'express';
import { Faculty } from '../models/Faculty';

export async function updateTimetable(req: Request, res: Response): Promise<void> {
  try {
    const { facultyId } = req.params;
    const { timetable } = req.body;

    if (!timetable || !Array.isArray(timetable)) {
      res.status(400).json({ message: 'Timetable data is required' });
      return;
    }

    // Validate timetable structure
    for (const day of timetable) {
      if (!day.sessions) continue;
      
      for (const session of day.sessions) {
        if (!session.subject?.trim()) {
          res.status(400).json({ 
            message: `Subject is required for a session on ${day.day}`,
            field: 'subject'
          });
          return;
        }
        if (!session.section?.trim()) {
          res.status(400).json({ 
            message: `Section is required for ${session.subject} on ${day.day}`,
            field: 'section'
          });
          return;
        }
        if (!session.sessionType || !['Lecture', 'Tutorial', 'Practical', 'Skill'].includes(session.sessionType)) {
          res.status(400).json({ 
            message: `Invalid session type for ${session.subject} on ${day.day}`,
            field: 'sessionType'
          });
          return;
        }
        if (!session.hours || session.hours.length === 0) {
          res.status(400).json({ 
            message: `Time slots are required for ${session.subject} on ${day.day}`,
            field: 'hours'
          });
          return;
        }
      }
    }

    const faculty = await Faculty.findByIdAndUpdate(
      facultyId,
      { timetable },
      { new: true, runValidators: true }
    );

    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    res.json({
      message: 'Timetable updated successfully',
      timetable: faculty.timetable
    });
  } catch (err) {
    const error = err as any;
    console.error('Timetable update error:', error);
    
    if (error.name === 'ValidationError' && error.errors) {
      // Extract the first validation error message
      const errorField = Object.keys(error.errors)[0];
      const errorMessage = error.errors[errorField].message;
      res.status(400).json({ 
        message: errorMessage,
        field: errorField.split('.').pop() // Get the last part of the path
      });
    } else {
      res.status(500).json({ message: 'Failed to update timetable' });
    }
  }
}

export async function getTimetable(req: Request, res: Response): Promise<void> {
  try {
    const { facultyId } = req.params;

    const faculty = await Faculty.findById(facultyId).select('timetable');
    
    if (!faculty) {
      res.status(404).json({ message: 'Faculty not found' });
      return;
    }

    res.json({ timetable: faculty.timetable });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ message: 'Failed to get timetable' });
  }
}
