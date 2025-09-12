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
  } catch (error) {
    console.error('Timetable update error:', error);
    res.status(500).json({ message: 'Failed to update timetable' });
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
