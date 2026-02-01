import { Router } from 'express';
import { registerStudent, getStudents, updateStudent, deleteStudent, initiateStudentRegistration, uploadStudentFace } from '../controllers/student.controller';
import { verifyFacultyToken } from '../middleware/auth';

export const studentRouter = Router();

studentRouter.post('/register', verifyFacultyToken, registerStudent);
studentRouter.post('/initiate', verifyFacultyToken, initiateStudentRegistration);
studentRouter.post('/:studentId/face', verifyFacultyToken, uploadStudentFace);
studentRouter.get('/', verifyFacultyToken, getStudents);
studentRouter.put('/:studentId', verifyFacultyToken, updateStudent);
studentRouter.delete('/:studentId', verifyFacultyToken, deleteStudent);


