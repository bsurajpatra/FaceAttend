import { Router } from 'express';
import { updateTimetable, getTimetable } from '../controllers/timetable.controller';
import { verifyFacultyToken } from '../middleware/auth';

export const timetableRouter = Router();

timetableRouter.put('/:facultyId', verifyFacultyToken, updateTimetable);
timetableRouter.get('/:facultyId', verifyFacultyToken, getTimetable);
