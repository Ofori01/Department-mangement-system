import express from 'express';
import { createHod, deleteHod, getHod, updateHod } from '../controllers/hod/hodController.js';
import { assignLecturerToCourse, createCourse } from '../controllers/hod/hod.actions.controller.js';

const hodRouter = express.Router();


// Route to create a new HOD
hodRouter.post('/', createHod);

// Route to get HOD data
hodRouter.get('/:id', getHod);

// Route to update HOD data
hodRouter.put('/:id', updateHod);

// Route to delete HOD data
hodRouter.delete('/:id', deleteHod);

// --- HOD Functions

//create course
hodRouter.post('/course', createCourse)


//assign lecturer to course
hodRouter.post('/lecturer/course', assignLecturerToCourse)


//assign students to course
hodRouter.post('/students/courses')

export default hodRouter;