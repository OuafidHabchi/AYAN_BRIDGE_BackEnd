import { MyFormation } from '../models/myFormationModel.js';
import { Formation } from '../../StudioFormation-api/models/formationModel.js';
import { createVente } from '../../Vents-api/controllers/venteController.js';

export const createMyFormation = async (req, res) => {
  try {
    const { userId, formationId, investmentType, investorId } = req.body;

    if (!userId || !formationId) {
      return res.status(400).json({ error: 'userId ou formationId manquant.' });
    }

    const existing = await MyFormation.findOne({ clientId: userId, formationId });
    if (existing) {
      return res.status(409).json({ error: 'Cette formation est déjà dans votre espace.' });
    }

    const formation = await Formation.findById(formationId);
    if (!formation) {
      return res.status(404).json({ error: "Formation introuvable." });
    }

    // 💰 Calcul du prix selon promo + codePromo
    let basePrice = formation.promotion && formation.newPrix > 0 ? formation.newPrix : formation.prix;

    if (investmentType === 'codePromo') {
      const discounted = basePrice * 0.9;
      basePrice = discounted;
    }

    // 📦 Créer l'achat
    const achat = new MyFormation({ clientId: userId, formationId });
    await achat.save();

    try {
      await createVente({
        productId: formationId,
        buyerId: userId,
        amount: basePrice,
        formation: true,
        myFormationId: achat._id,
        investmentType,
        investorId
      });
    } catch (venteErr) {
      console.error("💥 Vente échouée :", venteErr.message);
      await MyFormation.findByIdAndDelete(achat._id);
      throw new Error("❌ Achat annulé car la vente a échoué.");
    }

    res.status(201).json({
      message: '✅ Formation ajoutée à votre espace + vente enregistrée',
      myFormation: achat
    });

  } catch (error) {
    console.error('❌ Erreur createMyFormation:', error);
    res.status(500).json({ error: error.message });
  }
};



export const getMyFormations = async (req, res) => {
  try {
    const clientId = req.params.id;
    const formations = await MyFormation.find({ clientId })
      .populate('formationId')
      .sort({ date: -1 });
    res.status(200).json({ success: true, formations });
  } catch (error) {
    console.error('❌ Erreur récupération MyFormations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};


export const updateLastWatchedChapter = async (req, res) => {

  try {
    const { MYformationId, lastWatchedChapter } = req.body;

    // Validation des champs
    if (!MYformationId || typeof lastWatchedChapter !== 'number') {
      console.warn('⚠️ Champs manquants ou invalides.');
      return res.status(400).json({ error: 'Champs manquants ou invalides.' });
    }
    const myFormation = await MyFormation.findById(MYformationId);

    if (!myFormation) {
      console.warn('❌ MyFormation non trouvée.');
      return res.status(404).json({ error: 'Formation non trouvée.' });
    }
    myFormation.lastWatchedChapter = lastWatchedChapter;
    myFormation.lastWatchedAt = new Date(); // ← on met aussi à jour la date 👍

    await myFormation.save();

    res.status(200).json({
      message: '✅ Progression mise à jour.',
      lastWatchedChapter,
      lastWatchedAt: myFormation.lastWatchedAt
    });
  } catch (error) {
    console.error('❌ Erreur updateLastWatchedChapter:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};




export const getLastWatchedChapter = async (req, res) => {
  try {
    const { userId, formationId } = req.params;

    const myFormation = await MyFormation.findOne({ clientId: userId, formationId });

    if (!myFormation) {
      return res.status(404).json({ error: 'Formation non trouvée.' });
    }

    res.status(200).json({ lastWatchedChapter: myFormation.lastWatchedChapter || 0 });
  } catch (error) {
    console.error('❌ Erreur getLastWatchedChapter:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};


export const getMyFormationStats = async (req, res) => {
  try {
    const clientId = req.params.id;

    if (!clientId) {
      return res.status(400).json({ error: 'ID utilisateur manquant.' });
    }

    // 🔍 Récupérer toutes les formations de l'utilisateur
    const formations = await MyFormation.find({ clientId })
      .populate('formationId')
      .sort({ date: -1 });

    const totalFormations = formations.length;

    // 📕 Formations jamais lues (chapitre 0)
    const unwatchedFormations = formations.filter(f => f.lastWatchedChapter === 0);

    // 🕓 Dernière formation regardée
    const lastWatchedFormation = formations
      .filter(f => f.lastWatchedAt)
      .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))[0] || null;

   

    res.status(200).json({
      lastWatchedFormation,    // ✅ Objet MyFormation avec .formationId
      unwatchedFormations,     // ✅ Liste des MyFormation non lues
      totalFormations          // ✅ Juste un nombre
    });

  } catch (error) {
    console.error('❌ Erreur getMyFormationStats:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

