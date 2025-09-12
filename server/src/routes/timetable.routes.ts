import { Router } from 'express';
import { updateTimetable, getTimetable } from '../controllers/timetable.controller';

export const timetableRouter = Router();

timetableRouter.put('/:facultyId', updateTimetable);
timetableRouter.get('/:facultyId', getTimetable);
