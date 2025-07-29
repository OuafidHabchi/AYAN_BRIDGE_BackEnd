import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  createFormation,
  getAllFormations,
  getFormationById,
  updateFormation,
  deleteFormation,
  getFormationsByUser,
  getScolaireFormations,
  getAutreFormations,
  getLatestAndPromoFormationsByType,
  promoteFormation,
  getPendingFormations,
  approveOrRejectFormation,
  getFormationsByInvestmentOption,
  acheterLicenceFormation,
  updateSponsoringMontantsFormation,
  addInvestorToFormation,
  getFormationsByCreatorRevenueId,
  updateFormationInvestmentOptions
} from '../controllers/formationController.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ storage vers ../../uploads (chemin relatif depuis StudioFormation-api/routes)
const storage = multer.diskStorage({
  destination: function (_, __, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (_, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: function (_, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.mp4', '.mov', '.avi', '.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Seuls les fichiers vidéo et image sont autorisés'));
    }
    cb(null, true);
  }

});

// Routes CRUD
router.get('/all', getAllFormations);

//get all formation pending (pour les approuvees admin)
router.get('/getnonAppovedFormations', getPendingFormations);

//approuver une fomation(admin action)
router.put('/approve/:id', approveOrRejectFormation);


//pas de video pas de contenu(pour le public)
router.get('/Allscolaire', getScolaireFormations);

//pas de video pas de contenu(pour le public)
router.get('/Allautre', getAutreFormations);

//les videos juste 30 sec et le conetnet 200 caractere(pour le public) 
router.get('/:id', getFormationById);

router.post('/create', upload.any(), createFormation);

router.post('/update', upload.any(), updateFormation);

router.delete('/delete/:id', deleteFormation);

//get formation par user 
router.get('/user/:id', getFormationsByUser);


// Exemple pour les afficher dans la bare qui bouge =>NouvellesFormationsSection
router.get('/last/:type', getLatestAndPromoFormationsByType);

//ajouter une promotion 
router.put('/promote/:id', promoteFormation);

// reccupere les Formations qui ont accepter de vendre leur licence ,affiliation,,,,etc
router.get('/investment/:option', getFormationsByInvestmentOption);


//achetr une licence 
router.put('/licence/acheter/:formationId/:acheteurId', acheterLicenceFormation);


//Ajouter uou update le prix de Sposoring
router.post('/Sposoring', updateSponsoringMontantsFormation); // ⚡ Nouvelle route ici


// Ajouter un investisseur à un ebook
router.post('/add-investor', addInvestorToFormation);

// Récupérer les formations par ID de créateur de revenus
router.get('/creator/:id', getFormationsByCreatorRevenueId);

// Mettre à jour les options d'investissement d'une formation
router.patch('/investment-options/:id', updateFormationInvestmentOptions);







export default router;
