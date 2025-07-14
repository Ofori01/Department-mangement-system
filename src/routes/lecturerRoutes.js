import { Router } from 'express';
import { getLecturers, getLecturer, createLecturer, updateLecturer, deleteLecturer } from '../controllers/lecturerController.js';

const lecturerRouter = Router();
lecturerRouter.get('/', getLecturers);
lecturerRouter.get('/:id', getLecturer );
lecturerRouter.post('/', createLecturer);
lecturerRouter.put('/:id', updateLecturer);
lecturerRouter.delete('/:id', deleteLecturer);

export default lecturerRouter;