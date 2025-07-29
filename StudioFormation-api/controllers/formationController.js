import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Formation } from '../models/formationModel.js';

// 🔄 Mappe les fichiers dans chapitres[]
function attachVideosToChapitres(chapitres, files) {
  return chapitres.map((chap, idx) => {
    const videoFile = files.find(f => f.fieldname === `video-${idx}`);
    return {
      ...chap,
      video: videoFile ? `/uploads/${videoFile.filename}` : null
    };
  });
}

// 📤 CREATE
export const createFormation = async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    
    const PLATFORM_OWNER_ID = '68792410b6d8bde78fb614c3';

    // 👉 Reconstruction complète des chapitres et sous-chapitres avec fichiers
    const formattedChapitres = data.chapitres.map((chap, chapIndex) => {
      const formattedSousChapitres = (chap.sousChapitres || []).map((sousChap, subIndex) => {
        // 🔎 Trouver la vidéo du sous-chapitre
        const videoFile = req.files.find(
          f => f.fieldname === `video-${chapIndex}-${subIndex}`
        );

        // 🔎 Trouver toutes les images associées à ce sous-chapitre
        const imageFiles = req.files.filter(
          f => f.fieldname.startsWith(`image-${chapIndex}-${subIndex}-`)
        );

        return {
          titre: sousChap.titre,
          content: sousChap.content,
          video: videoFile ? `/uploads/${videoFile.filename}` : null,
          images: imageFiles.map(f => `/uploads/${f.filename}`)
        };
      });

      return {
        titre: chap.titre,
        sousChapitres: formattedSousChapitres
      };
    });

    // 📦 Données finales à sauvegarder
    const finalData = {
      ...data,
      promotion: false,
      approved: 'pending',
      chapitres: formattedChapitres,
      revenueParticipants: {
        creator: {
          id: data.auteur,
          percent: 70,
        },
        owner: {
          id: PLATFORM_OWNER_ID,
          percent: 30,
        },
        investors: []
      }
    };

    // ✅ Cover image
    const coverFile = req.files.find(f => f.fieldname === 'coverImage');
    if (coverFile) {
      finalData.coverImage = `/uploads/${coverFile.filename}`;
    }

    const formation = new Formation(finalData);
    await formation.save();

    res.status(201).json(formation);
  } catch (err) {
    console.error('❌ Erreur createFormation:', err);
    res.status(400).json({ error: err.message });
  }
};





// 📥 READ ALL
export const getAllFormations = async (_, res) => {
  const formations = await Formation.find();
  res.json(formations);
};


export const getScolaireFormations = async (_, res) => {
  try {
    const formations = await Formation.find({ type: 'scolaire', approved: 'approved' }) // ✅ filtrer approuvées
      .select('-chapitres')
      .populate('auteur', 'nom prenom')
      .lean();

    res.status(200).json(formations);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des formations scolaires :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};




export const getAutreFormations = async (_, res) => {
  try {
    const formations = await Formation.find({ type: 'autre', approved: 'approved' }) // ✅ filtrer approuvées
      .select('-chapitres')
      .populate('auteur', 'nom prenom')
      .lean();

    res.status(200).json(formations);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des formations professionnelles :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};




// 📘 READ ONE
export const getFormationById = async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id)
      .populate('auteur', 'nom prenom')
      .lean();

    if (!formation) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    const sanitizedFormation = {
      ...formation,
      chapitres: (formation.chapitres || []).map(chap => ({
        titre: chap.titre,
        sousChapitres: (chap.sousChapitres || []).map(sousChap => ({
          ...sousChap,
          content: sousChap.content?.substring(0, 200) || '',
          videoPreview: sousChap.video ? `${sousChap.video}#t=0,30` : null
        }))
      }))
    };

    res.status(200).json(sanitizedFormation);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la formation :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};



/// 🛠 UPDATE avec suppression fichiers remplacés
export const updateFormation = async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const formationId = data.id;

    if (!formationId) {
      return res.status(400).json({ error: 'ID de formation manquant.' });
    }

    const formation = await Formation.findById(formationId);
    if (!formation) {
      return res.status(404).json({ error: 'Formation non trouvée.' });
    }

    // 📁 Supprimer ancienne coverImage si remplacée
    const coverFile = req.files?.find(f => f.fieldname === 'coverImage');
    if (coverFile) {
      const oldCoverPath = path.join('uploads', path.basename(formation.coverImage || ''));
      if (fs.existsSync(oldCoverPath)) {
        fs.unlinkSync(oldCoverPath);
      }
      data.coverImage = `/uploads/${coverFile.filename}`;
    } else {
      data.coverImage = formation.coverImage;
    }

    // 🔁 Mise à jour des chapitres et sous-chapitres
    const updatedChapitres = data.chapitres.map((chap, chapIndex) => {
      const oldChap = formation.chapitres[chapIndex] || {};
      const newChap = { titre: chap.titre, sousChapitres: [] };

      newChap.sousChapitres = (chap.sousChapitres || []).map((sousChap, subIndex) => {
        const oldSousChap = (oldChap.sousChapitres || [])[subIndex] || {};

        // 🎥 Vidéo update
        const videoFile = req.files?.find(f => f.fieldname === `video-${chapIndex}-${subIndex}`);
        if (videoFile) {
          const oldVideoPath = path.join('uploads', path.basename(oldSousChap.video || ''));
          if (fs.existsSync(oldVideoPath)) {
            fs.unlinkSync(oldVideoPath);
          }
        }

        // 🖼️ Images update
        const imageFiles = req.files?.filter(f =>
          f.fieldname.startsWith(`image-${chapIndex}-${subIndex}-`)
        ) || [];

        // ❌ Supprimer anciennes images si remplacées
        if (imageFiles.length > 0 && Array.isArray(oldSousChap.images)) {
          oldSousChap.images.forEach(img => {
            const imgPath = path.join('uploads', path.basename(img));
            if (fs.existsSync(imgPath)) {
              fs.unlinkSync(imgPath);
            }
          });
        }

        return {
          titre: sousChap.titre,
          content: sousChap.content,
          video: videoFile ? `/uploads/${videoFile.filename}` : oldSousChap.video || null,
          images:
            imageFiles.length > 0
              ? imageFiles.map(f => `/uploads/${f.filename}`)
              : oldSousChap.images || []
        };
      });

      return newChap;
    });

    const finalData = {
      ...data,
      chapitres: updatedChapitres,
      coverImage: data.coverImage,
      approved: 'pending',
      rejectionNote: undefined,
      updatedAt: new Date()
    };

    const updated = await Formation.findByIdAndUpdate(formationId, finalData, { new: true });

    res.status(200).json({ message: '✅ Formation mise à jour avec succès', formation: updated });
  } catch (err) {
    console.error('❌ Erreur updateFormation:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour.' });
  }
};




// ❌ DELETE avec suppression des fichiers
export const deleteFormation = async (req, res) => {
  try {
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    // 🔥 Supprimer la cover image si elle existe
    if (formation.coverImage) {
      const coverPath = path.join('uploads', path.basename(formation.coverImage));
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    // 🔥 Supprimer les fichiers (vidéos & images) des sous-chapitres
    if (formation.chapitres?.length > 0) {
      formation.chapitres.forEach(chap => {
        chap.sousChapitres?.forEach(sousChap => {
          // Supprimer la vidéo
          if (sousChap.video) {
            const videoPath = path.join('uploads', path.basename(sousChap.video));
            if (fs.existsSync(videoPath)) {
              fs.unlinkSync(videoPath);
            }
          }

          // Supprimer chaque image
          if (Array.isArray(sousChap.images)) {
            sousChap.images.forEach(img => {
              const imgPath = path.join('uploads', path.basename(img));
              if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
              }
            });
          }
        });
      });
    }

    // 🔚 Supprimer la formation de la base de données
    await Formation.findByIdAndDelete(req.params.id);
    res.json({ message: '✅ Formation et fichiers supprimés' });

  } catch (error) {
    console.error('❌ Erreur suppression formation :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
};




// 🔍 Obtenir les formations d'un utilisateur avec nom/prénom
export const getFormationsByUser = async (req, res) => {
  const { id } = req.params;

  try {
    const formations = await Formation.find({ auteur: id })
      .populate('auteur', 'nom prenom') // 🔥 ici on populates uniquement nom + prenom
      .sort({ createdAt: -1 });
    res.status(200).json({ formations });
  } catch (error) {
    console.error('❌ Erreur récupération formations:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des formations.' });
  }
};




export const getLatestAndPromoFormationsByType = async (req, res) => {
  let { type } = req.params;

  // 🔽 Normalisation du type
  type = type.toLowerCase();
  if (type === 'professionnel') type = 'autre';
  if (type === 'scolaire') type = 'scolaire';

  if (!['scolaire', 'autre'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide.' });
  }

  try {
    const nouveautes = await Formation.find({ type, approved: 'approved' }) // ✅ filtrer approved
      .populate('auteur', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const promotions = await Formation.find({ type, promotion: true, approved: 'approved' }) // ✅ filtrer aussi ici
      .populate('auteur', 'nom prenom')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    res.status(200).json({
      nouveautes,
      promotions
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des formations :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};





// ✅ PROMOTE FORMATION
export const promoteFormation = async (req, res) => {
  const { id } = req.params;
  const { newPrix } = req.body;

  if (typeof newPrix !== 'number' || newPrix <= 0) {
    return res.status(400).json({ error: 'newPrix invalide' });
  }

  try {
    const updated = await Formation.findByIdAndUpdate(
      id,
      {
        promotion: true,
        newPrix
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Formation non trouvée' });
    }

    res.status(200).json({ message: '✅ Formation mise en promotion avec succès', formation: updated });
  } catch (error) {
    console.error('❌ Erreur lors de la promotion de la formation :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};




// 📥 Formations à approuver
export const getPendingFormations = async (req, res) => {
  try {
    const formations = await Formation.find({ approved: 'pending' })
      .sort({ createdAt: -1 })
      .populate('auteur', 'nom prenom');

    res.status(200).json(formations);
  } catch (error) {
    console.error("❌ Erreur récupération formations à approuver :", error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};



// ✅ Approve or reject formation
export const approveOrRejectFormation = async (req, res) => {
  const { id } = req.params;
  const { approved, rejectionNote } = req.body;

  if (!['approved', 'rejected'].includes(approved)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  try {
    const updated = await Formation.findByIdAndUpdate(
      id,
      { approved, rejectionNote },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Formation non trouvée.' });
    }

    res.status(200).json({ message: `Formation ${approved}`, formation: updated });
  } catch (error) {
    console.error("❌ Erreur lors de l'approbation/refus :", error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};



export const getFormationsByInvestmentOption = async (req, res) => {
  const { option } = req.params;

  const validOptions = ['licence', 'affiliation', 'codePromo', 'sponsoring'];

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

    const formations = await Formation.find(filter)
      .select('-chapitres') // exclut les chapitres si pas nécessaires
      .populate('auteur', 'nom prenom')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      formations
    });

  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des formations avec l’option '${option}':`, error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};


export const acheterLicenceFormation = async (req, res) => {
  const { formationId, acheteurId } = req.body;

  // 🔒 Validation des IDs
  if (!mongoose.Types.ObjectId.isValid(formationId) || !mongoose.Types.ObjectId.isValid(acheteurId)) {
    return res.status(400).json({
      success: false,
      message: "❌ Paramètres invalides (formationId ou acheteurId)"
    });
  }

  try {
    // 🔍 Étape 1 : Charger la formation
    const formation = await Formation.findById(formationId);

    if (!formation) {
      return res.status(404).json({
        success: false,
        message: "❌ Formation non trouvée"
      });
    }

    // 🧾 Étape 2 : Vérification de revenueParticipants
    if (!formation.revenueParticipants?.creator || typeof formation.revenueParticipants.creator.percent !== 'number') {
      return res.status(400).json({
        success: false,
        message: "❌ Structure revenueParticipants.creator manquante ou invalide"
      });
    }

    // ✍️ Étape 3 : Transfert de revenue (sans changer l’auteur visible)
    formation.revenueParticipants.creator.id = acheteurId;

    // 🚫 Étape 4 : Désactiver toutes les options d’investissement
    formation.investmentOptions = {
      affiliation: false,
      codePromo: false,
      licence: false,
      licenceMontant: 0,
      sponsoring: false
    };

    // 💾 Étape 5 : Sauvegarde
    await formation.save();

    res.status(200).json({
      success: true,
      message: "✅ Licence transférée avec succès",
      formation
    });

  } catch (error) {
    console.error("❌ Erreur lors du transfert de licence formation :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};


export const updateSponsoringMontantsFormation = async (req, res) => {
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
      const formation = await Formation.findById(id);

      if (!formation) {
        results.failed.push({ id, reason: "Formation non trouvée" });
        continue;
      }

      // Mise à jour ou insertion du montant
      formation.investmentOptions.sponsoringMontant = sponsoringMontant;
      await formation.save();

      results.success.push({ id, sponsoringMontant });

    } catch (error) {
      console.error(`❌ Erreur pour formation ID ${id} :`, error);
      results.failed.push({ id, reason: error.message });
    }
  }

  res.status(200).json({
    success: true,
    message: "Traitement terminé",
    results
  });
};


export const addInvestorToFormation = async (req, res) => {
  const { idInvestor, idFormation } = req.body;

  // Validation des IDs
  if (!mongoose.Types.ObjectId.isValid(idInvestor) || !mongoose.Types.ObjectId.isValid(idFormation)) {
    return res.status(400).json({
      success: false,
      message: "❌ ID invalide pour l'investisseur ou la formation"
    });
  }

  try {
    const formation = await Formation.findById(idFormation);
    if (!formation) {
      return res.status(404).json({
        success: false,
        message: "❌ Formation non trouvée"
      });
    }

    // Vérifier si l'investisseur est déjà présent
    const alreadyInvestor = formation.revenueParticipants.investors.some(investor =>
      investor.id.toString() === idInvestor
    );

    if (alreadyInvestor) {
      return res.status(400).json({
        success: false,
        message: "⚠️ Cet utilisateur est déjà investisseur de cette formation"
      });
    }

    // Réduire 20% du créateur
    if (formation.revenueParticipants.creator.percent < 20) {
      return res.status(400).json({
        success: false,
        message: "⚠️ Le créateur ne possède pas assez de pourcentage pour céder 20 %"
      });
    }

    formation.revenueParticipants.creator.percent -= 20;

    // Ajouter l'investisseur avec 20 %
    formation.revenueParticipants.investors.push({
      id: idInvestor,
      percent: 20
    });

    // Désactiver l’option de sponsoring
    formation.investmentOptions.sponsoring = false;

    await formation.save();

    res.status(200).json({
      success: true,
      message: "✅ Investisseur ajouté, pourcentage mis à jour, sponsoring désactivé",
      formation
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


export const getFormationsByCreatorRevenueId = async (req, res) => {
  const { id } = req.params;

  // 🔒 Vérification de l'ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: '❌ ID invalide'
    });
  }

  try {
    const formations = await Formation.find({
      "revenueParticipants.creator.id": id
    });

    res.status(200).json({
      success: true,
      formations
    });
  } catch (error) {
    console.error("❌ Erreur lors de la recherche des formations par creator.id :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};



export const updateFormationInvestmentOptions = async (req, res) => {
  const { id } = req.params;
  const { investmentOptions } = req.body;

  // 🔐 Vérification ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "❌ ID de formation invalide"
    });
  }

  if (!investmentOptions || typeof investmentOptions !== 'object') {
    return res.status(400).json({
      success: false,
      message: "❌ investmentOptions manquant ou invalide"
    });
  }

  try {
    const formation = await Formation.findById(id);

    if (!formation) {
      return res.status(404).json({
        success: false,
        message: "❌ Formation non trouvée"
      });
    }

    // 🔄 Mise à jour des options d’investissement
    formation.investmentOptions = {
      ...formation.investmentOptions,
      ...investmentOptions
    };

    await formation.save();

    res.status(200).json({
      success: true,
      message: "✅ Options d’investissement mises à jour avec succès",
      formation
    });

  } catch (error) {
    console.error("❌ Erreur update investment options formation :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};