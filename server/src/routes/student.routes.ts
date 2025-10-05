import { Router } from 'express';
import { registerStudent } from '../controllers/student.controller';
import { verifyFacultyToken } from '../middleware/auth';

export const studentRouter = Router();

studentRouter.post('/register', verifyFacultyToken, registerStudent);


