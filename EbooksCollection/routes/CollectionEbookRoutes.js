import express from 'express';

import {updateEbookInvestmentOptions,getEbooksByCreatorRevenueId,addInvestorToEbook, updateSponsoringMontants,getEbookById, getEbooksByUser, getEbookPages, deleteEbookById, getAllapprovedEbooks, getEbooksOverview, updatePromotion,getPendingEbooks ,approveOrRejectEbook,getEbooksByInvestmentOption ,acheterLicence} from '../controllers/CollectionEbookController.js';

const router = express.Router();

// get all books
router.get('/allapproved', getAllapprovedEbooks);

// Créer un ebook
// router.post('/', createEbook);

// 📥 GET ebooks en attentev
router.get('/getnonAppovedEbooks', getPendingEbooks); 

// ✅ PUT approuver/refuser un ebook
router.put('/approve/:id', approveOrRejectEbook); 

// Récupérer tous les ebooks d'un user
router.get('/user/:userId', getEbooksByUser);

// Récupérer les pages d'un ebook
router.get('/pages/:ebookId', getEbookPages);

// delete un ebook completemnt 
router.delete('/delete/:id', deleteEbookById);

// /api/Collectionebooks/overview ==>NouveauxLivresSection
router.get('/overview', getEbooksOverview);

// Ajouter une Promotion 
router.patch('/Promotion/:id', updatePromotion);

// reccupere les ebooks qui ont accepter de vendre leur licence ,affiliation,,,,etc
router.get('/investment/:option', getEbooksByInvestmentOption);

// acheter une licence 
router.put('/licence/acheter/:ebookId/:acheteurId', acheterLicence);


//get les details du ebook by son id 
router.get('/:id', getEbookById); // ⚡ Nouvelle route ici

//Ajouter uou update le prix de Sposoring
router.post('/Sposoring', updateSponsoringMontants); // ⚡ Nouvelle route ici

// Ajouter un investisseur à un ebook
router.post('/add-investor', addInvestorToEbook);

// Récupérer les ebooks par ID de créateur de revenus
router.get('/creator/:id', getEbooksByCreatorRevenueId);

// Mettre à jour les options d'investissement d'un ebook
router.patch('/investment-options/:id', updateEbookInvestmentOptions);







export default router;
