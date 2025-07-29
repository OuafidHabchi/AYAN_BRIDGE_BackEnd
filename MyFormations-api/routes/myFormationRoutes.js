import express from 'express';
import {
  createMyFormation,
  getMyFormations,
  updateLastWatchedChapter,
  getLastWatchedChapter,
  getMyFormationStats
} from '../controllers/myFormationController.js';

const router = express.Router();

// Créer un achat de formation
router.post('/createAchat', createMyFormation);

// Récupérer mes formations achetées
router.get('/myformations/:id', getMyFormations);

// Sauvegarder la progression
router.put('/saveProgress', updateLastWatchedChapter);

// Récupérer la dernière progression
router.get('/getProgress/:userId/:formationId', getLastWatchedChapter);

// reccupere les stats pour de dashBord 
router.get('/stats/:id', getMyFormationStats);
export default router;
