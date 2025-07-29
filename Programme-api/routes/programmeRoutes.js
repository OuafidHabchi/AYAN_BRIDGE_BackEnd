import express from 'express';
import {
  createProgramme,
  getAllProgrammes,
  getProgrammeById,
  updateProgramme,
  deleteProgramme
} from '../controllers/programmeController.js';

const router = express.Router();

// CRUD routes
router.post('/create', createProgramme);
router.get('/getAll', getAllProgrammes);
router.get('/:id', getProgrammeById);
router.put('/update/:id', updateProgramme);
router.delete('/delete/:id', deleteProgramme);

export default router;
