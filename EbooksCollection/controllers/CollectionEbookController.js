import Ebook from '../models/CollectionEbooks.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// get all approvedbook
export const getAllapprovedEbooks = async (req, res) => {
  try {
    const ebooks = await Ebook.find({ approved: 'approved' }) // ✅ filtrer seulement les approuvés
      .populate('auteur', 'nom prenom')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      ebooks
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de tous les ebooks :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération",
      error: error.message
    });
  }
};



const PLATFORM_OWNER_ID = "68792410b6d8bde78fb614c3"; // 👑 ID fixe du owner (plateforme)

export const saveEbookInCollection = async (data) => {
  try {
    if (!data.auteur) {
      throw new Error("Champ 'auteur' requis pour définir le créateur.");
    }

    const ebookData = {
      ...data,
      revenueParticipants: {
        creator: {
          id: data.auteur,
          percent: 70
        },
        owner: {
          id: PLATFORM_OWNER_ID,
          percent: 30
        },
        investors: []
      }
    };

    const newEbook = await Ebook.create(ebookData);
    return newEbook;

  } catch (error) {
    console.error("❌ Erreur lors de la sauvegarde de l'ebook :", error);
    throw error;
  }
};



export const getEbooksByUser = async (req, res) => {
  try {
    const ebooks = await Ebook.find({ auteur: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, ebooks });
  } catch (error) {
    console.error("❌ Erreur récupération ebooks:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEbookPages = async (req, res) => {
  try {
    const ebook = await Ebook.findById(req.params.ebookId);
    if (!ebook) {
      return res.status(404).json({ success: false, message: "Ebook non trouvé" });
    }

    const folderFullPath = path.join(__dirname, `../../${ebook.folderPath}`);

    const files = fs.readdirSync(folderFullPath)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1]?.split('.')[0]) || 0;
        const numB = parseInt(b.split('-')[1]?.split('.')[0]) || 0;
        return numA - numB;
      })
      .map(f => `${ebook.folderPath}${f}`);

    res.status(200).json({ success: true, pages: files });
  } catch (error) {
    console.error("❌ Erreur récupération pages ebook:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const deleteEbookById = async (req, res) => {
  const ebookId = req.params.id; // ici c’est le champ ebookId, pas le _id MongoDB
  try {
    // 1. Trouver l'ebook par ebookId (et non _id MongoDB)
    const ebook = await Ebook.findOne({ ebookId });

    if (!ebook) {
      return res.status(404).json({
        success: false,
        message: "Ebook introuvable"
      });
    }

    // 2. Supprimer le dossier contenant les pages du ebook
    const folderFullPath = path.join(__dirname, `../../${ebook.folderPath}`);
    if (fs.existsSync(folderFullPath)) {
      fs.rmSync(folderFullPath, { recursive: true, force: true });
    } else {
      console.warn(`⚠️ Dossier non trouvé : ${folderFullPath}`);
    }

    // 3. Supprimer l'entrée MongoDB par ebookId
    await Ebook.deleteOne({ ebookId });

    res.status(200).json({
      success: true,
      message: "Ebook supprimé avec succès"
    });

  } catch (error) {
    console.error("❌ Erreur lors de la suppression de l'ebook :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression",
      error: error.message
    });
  }
};




export const getEbooksOverview = async (req, res) => {
  try {
    const [latest, promoted] = await Promise.all([
      Ebook.find({ approved: 'approved' }) // ✅ uniquement approuvés
        .populate('auteur', 'nom prenom')
        .sort({ createdAt: -1 })
        .limit(15),

      Ebook.find({ approved: 'approved', promotion: true }) // ✅ promo + approuvés
        .populate('auteur', 'nom prenom')
        .sort({ createdAt: -1 })
        .limit(15)
    ]);

    res.status(200).json({
      success: true,
      latest,
      promoted
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des ebooks overview :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};




export const updatePromotion = async (req, res) => {
  const { id } = req.params;
  const { promotion, newPrix } = req.body;

  try {
    // Vérification des données
    if (typeof promotion !== 'boolean' || typeof newPrix !== 'number') {
      return res.status(400).json({
        success: false,
        message: "Données invalides. Attendus : { promotion: boolean, newPrix: number }"
      });
    }

    // Mise à jour de l'ebook
    const updated = await Ebook.findByIdAndUpdate(
      id,
      { promotion, newPrix },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Ebook non trouvé"
      });
    }

    res.status(200).json({
      success: true,
      message: "Promotion appliquée avec succès",
      ebook: updated
    });

  } catch (error) {
    console.error("❌ Erreur update promotion :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};



// 📥 eBooks à approuver
export const getPendingEbooks = async (req, res) => {
  try {
    const ebooks = await Ebook.find({ approved: 'pending' })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(ebooks);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des eBooks en attente :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};



export const approveOrRejectEbook = async (req, res) => {
  const { id } = req.params;
  const { approved, rejectionNote } = req.body;

  if (!['approved', 'rejected'].includes(approved)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  try {
    const updated = await Ebook.findByIdAndUpdate(
      id,
      { approved, rejectionNote },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'eBook non trouvé.' });
    }

    res.status(200).json({ message: `eBook ${approved}`, ebook: updated });
  } catch (error) {
    console.error("❌ Erreur lors de l'approbation/refus du eBook :", error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};



export const getEbooksByInvestmentOption = async (req, res) => {
  const { option } = req.params;

  const validOptions = [
    'licence',
    'affiliation',
    'codePromo',
    'commande',
    'sponsoring'
  ];

  if (!validOptions.includes(option)) {
    return res.status(400).json({
      success: false,
      message: `❌ Option invalide. Options valides : ${validOptions.join(', ')}`
    });
  }

  try {
    const filter = {
      approved: 'approved',
      [`investmentOptions.${option}`]: true
    };

    const ebooks = await Ebook.find(filter)
      .populate('auteur', 'nom prenom')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      ebooks
    });

  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des ebooks avec l'option '${option}' :`, error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};



export const acheterLicence = async (req, res) => {
  const { bookId, userId } = req.body;


  // 🔒 Étape 1 : Validation des IDs
  if (!mongoose.Types.ObjectId.isValid(bookId) || !mongoose.Types.ObjectId.isValid(userId)) {
    console.warn("⚠️ ID invalide détecté");
    return res.status(400).json({
      success: false,
      message: "❌ Paramètres invalides (bookId ou userId)"
    });
  }

  try {
    // 🔍 Étape 2 : Recherche de l'eBook
    const ebook = await Ebook.findById(bookId);

    if (!ebook) {
      console.warn("⚠️ eBook non trouvé pour l'ID :", bookId);
      return res.status(404).json({
        success: false,
        message: "❌ Ebook non trouvé"
      });
    }


    // 🧾 Étape 3 : Vérification du revenueParticipants.creator
    if (!ebook.revenueParticipants?.creator || typeof ebook.revenueParticipants.creator.percent !== 'number') {
      console.warn("⚠️ Structure revenueParticipants.creator invalide ou manquante");
      return res.status(400).json({
        success: false,
        message: "❌ Structure revenueParticipants.creator incorrecte ou manquante"
      });
    }

    // ✍️ Étape 4 : Transfert de revenue (sans changer l’auteur visible)
    ebook.revenueParticipants.creator.id = userId;

    // 🚫 Étape 5 : Désactivation des options d’investissement
    ebook.investmentOptions = {
      affiliation: false,
      codePromo: false,
      licence: false,
      licenceMontant: 0
    };

    // 💾 Étape 6 : Sauvegarde
    await ebook.save();
    // 🎉 Fin
    return res.status(200).json({
      success: true,
      message: "✅ Licence transférée avec succès",
      ebook
    });

  } catch (error) {
    console.error("❌ Erreur lors du transfert de licence :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors du transfert de licence",
      error: error.message
    });
  }
};


// ➡️ Récupérer les détails d’un eBook par ID
export const getEbookById = async (req, res) => {
  const { id } = req.params;

  try {
    const ebook = await Ebook.findById(id)
      .populate('auteur', 'nom prenom email') // 🧠 ajoute d’autres champs si nécessaire
      .lean();

    if (!ebook) {
      return res.status(404).json({
        success: false,
        message: "❌ Ebook non trouvé"
      });
    }

    res.status(200).json({
      success: true,
      ebook
    });

  } catch (error) {
    console.error("❌ Erreur lors de la récupération du ebook par ID :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};


export const updateSponsoringMontants = async (req, res) => {
  const updates = Array.isArray(req.body) ? req.body : [req.body];

  const results = {
    success: [],
    failed: []
  };

  for (const item of updates) {
    const { id, sponsoringMontant } = item;

    if (!mongoose.Types.ObjectId.isValid(id) || typeof sponsoringMontant !== 'number') {
      results.failed.push({ id, reason: "ID invalide ou montant incorrect" });
      continue;
    }

    try {
      const ebook = await Ebook.findById(id);

      if (!ebook) {
        results.failed.push({ id, reason: "eBook non trouvé" });
        continue;
      }

      // Mise à jour ou insertion du montant
      ebook.investmentOptions.sponsoringMontant = sponsoringMontant;
      await ebook.save();

      results.success.push({ id, sponsoringMontant });

    } catch (error) {
      console.error(`❌ Erreur pour eBook ID ${id} :`, error);
      results.failed.push({ id, reason: error.message });
    }
  }

  res.status(200).json({
    success: true,
    message: "Traitement terminé",
    results
  });
};


export const addInvestorToEbook = async (req, res) => {
  const { idInvestor, idEbook } = req.body;

  // Validation des IDs
  if (!mongoose.Types.ObjectId.isValid(idInvestor) || !mongoose.Types.ObjectId.isValid(idEbook)) {
    return res.status(400).json({
      success: false,
      message: "❌ ID invalide pour l'investisseur ou l'eBook"
    });
  }

  try {
    const ebook = await Ebook.findById(idEbook);
    if (!ebook) {
      return res.status(404).json({
        success: false,
        message: "❌ eBook non trouvé"
      });
    }

    // Vérifier si l'investisseur est déjà présent
    const alreadyInvestor = ebook.revenueParticipants.investors.some(investor =>
      investor.id.toString() === idInvestor
    );

    if (alreadyInvestor) {
      return res.status(400).json({
        success: false,
        message: "⚠️ Cet utilisateur est déjà investisseur de cet eBook"
      });
    }

    // Réduire 20% du créateur
    if (ebook.revenueParticipants.creator.percent < 20) {
      return res.status(400).json({
        success: false,
        message: "⚠️ Le créateur ne possède pas assez de pourcentage pour céder 20 %"
      });
    }

    ebook.revenueParticipants.creator.percent -= 20;

    // Ajouter l'investisseur avec 20 %
    ebook.revenueParticipants.investors.push({
      id: idInvestor,
      percent: 20
    });

    // Désactiver l’option de sponsoring
    ebook.investmentOptions.sponsoring = false;

    await ebook.save();

    res.status(200).json({
      success: true,
      message: "✅ Investisseur ajouté, pourcentage mis à jour, sponsoring désactivé",
      ebook
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout d'investisseur :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};


export const getEbooksByCreatorRevenueId = async (req, res) => {
  const { id } = req.params;

  // 🔒 Vérification de l'ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: '❌ ID invalide'
    });
  }

  try {
    const ebooks = await Ebook.find({
      "revenueParticipants.creator.id": id
    });

    res.status(200).json({
      success: true,
      ebooks
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des eBooks par creator.id :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};


export const updateEbookInvestmentOptions = async (req, res) => {
  const { id } = req.params;
  const { investmentOptions } = req.body;

  // 🔒 Validation de l'ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "❌ ID d'eBook invalide"
    });
  }

  if (!investmentOptions || typeof investmentOptions !== 'object') {
    return res.status(400).json({
      success: false,
      message: "❌ investmentOptions manquant ou invalide"
    });
  }

  try {
    const ebook = await Ebook.findById(id);

    if (!ebook) {
      return res.status(404).json({
        success: false,
        message: "❌ eBook non trouvé"
      });
    }

    // ✅ Met à jour uniquement les options d’investissement
    ebook.investmentOptions = {
      ...ebook.investmentOptions,
      ...investmentOptions
    };

    await ebook.save();

    res.status(200).json({
      success: true,
      message: "✅ Options d’investissement mises à jour avec succès",
      ebook
    });

  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour des options d'investissement :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};
