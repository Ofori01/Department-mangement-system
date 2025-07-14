import { Router } from 'express';
import { getStudents, getStudent, createStudent, updateStudent, deleteStudent } from '../controllers/studentController.js';

const studentRouter = Router();
studentRouter.get('/', getStudents);
studentRouter.get('/:id', getStudent);
studentRouter.post('/', createStudent);
studentRouter.put('/:id', updateStudent);
studentRouter.delete('/:id', deleteStudent);

export default studentRouter;