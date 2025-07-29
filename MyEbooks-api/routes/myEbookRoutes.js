import express from 'express';
import { createMyEbook, getMyEbooks,updateLastReadPage ,getLastReadPage ,getMyEbookStats} from '../controllers/myEbookController.js';

const router = express.Router();

// Créer un achat
router.post('/createAchat',  createMyEbook);

// Récupérer mes achats
router.get('/myebooks/:id',  getMyEbooks);

// saver le progress de la lecture 
router.put('/saveProgress', updateLastReadPage);

// reccupere la dernier page lu 
router.get('/getProgress/:userId/:bookId', getLastReadPage);

// reccupere les stats pour de dashBord 
router.get('/stats/:id', getMyEbookStats);
export default router;
