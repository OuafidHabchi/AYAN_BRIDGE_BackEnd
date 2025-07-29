import User from "../models/userModel.js";
import Ebook from '../../EbooksCollection/models/CollectionEbooks.js';
import { Formation } from '../../StudioFormation-api/models/formationModel.js'; // Assure-toi du bon chemin
import mongoose from 'mongoose';
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';


// ➡️ Créer un utilisateur avec hash du mot de passe
export const createUser = async (req, res) => {
  try {
    const { nom, prenom, email, password, role, langue } = req.body;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "❌ Email déjà utilisé" });
    }

    // Générer le hash du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer un nouvel utilisateur avec le password haché
    const user = new User({
      nom,
      prenom,
      email,
      password: hashedPassword,
      role,
      langue
    });

    await user.save();

    res.status(201).json({
      message: "✅ Utilisateur créé avec succès",
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        langue: user.langue
        // Ne retourne jamais le password hashé dans la réponse
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Erreur création utilisateur", error });
  }
};



// ➡️ Login utilisateur
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "❌ Utilisateur non trouvé" });
    }

    const token = jwt.sign(
      { id: user._id },
      'SuperSecretKey123!', // ➔ ta clé secrète directement ici
      { expiresIn: '1h' }
    );



    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "❌ Mot de passe incorrect" });
    }

    res.status(200).json({
      message: "✅ Connexion réussie",
      token,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        langue: user.langue
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Erreur serveur login", error });
  }
};





// ➡️ Récupérer tous les utilisateurs
export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "❌ Erreur récupération utilisateurs", error });
  }
};



// ➡️ Récupérer un utilisateur par ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select('-password'); // ⚠️ Ne pas retourner le mot de passe
    if (!user) {
      return res.status(404).json({ message: "❌ Utilisateur non trouvé" });
    }

    res.status(200).json({
      message: "✅ Utilisateur trouvé",
      user
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "❌ Erreur récupération utilisateur", error });
  }
};




// 🔐 Enregistrer un code promo généré côté frontend
export const savePromoCode = async (req, res) => {
  const { userId, promoCode } = req.body;
  console.log(userId);
  console.log(promoCode);


  if (!userId || !promoCode) {
    return res.status(400).json({
      success: false,
      message: "❌ userId ou promoCode manquant"
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "❌ Utilisateur non trouvé"
      });
    }

    if (user.promoCode) {
      return res.status(400).json({
        success: false,
        message: "⚠️ L'utilisateur a déjà un code promo",
        code: user.promoCode
      });
    }

    // 💾 Enregistrement
    user.promoCode = promoCode;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "✅ Code promo enregistré avec succès",
      code: promoCode
    });

  } catch (error) {
    console.error("❌ Erreur enregistrement promoCode :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'enregistrement du code promo",
      error: error.message
    });
  }
};


// 🔄 Mettre à jour l'email, le téléphone et la langue
export const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { email, phone, langue } = req.body;
 
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "❌ Utilisateur non trouvé" });
    }

    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.langue = langue || user.langue;

    await user.save();

    res.status(200).json({
      message: "✅ Profil mis à jour avec succès",
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        phone: user.phone,
        langue: user.langue,
        promoCode: user.promoCode,
        role: user.role
      }
    });

  } catch (error) {
    console.error("❌ Erreur mise à jour profil :", error);
    res.status(500).json({ message: "❌ Erreur serveur lors de la mise à jour", error });
  }
};


// 📌 Vérification code promo pour un ebook ou une formation
export const validatePromoCodeForTarget = async (req, res) => {
  const { promoCode, targetId, type } = req.body;

  // 🔍 Étape 1 : Validation des données d’entrée
  if (!promoCode || !targetId || !type) {
    return res.status(400).json({
      success: false,
    });
  }

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({
      success: false,
    });
  }

  if (!['ebook', 'formation'].includes(type)) {
    return res.status(400).json({
      success: false,
    });
  }

  try {
    // 👤 Étape 2 : Rechercher l'utilisateur qui possède ce code promo
    const userWithPromo = await User.findOne({ promoCode });

    if (!userWithPromo) {
      return res.status(404).json({
        success: false,
        message: "❌ Code promo introuvable ou invalide"
      });
    }

    // 📚 Étape 3 : Rechercher la cible (ebook ou formation)
    let targetDoc = null;

    if (type === 'ebook') {
      targetDoc = await Ebook.findById(targetId);
    } else if (type === 'formation') {
      targetDoc = await Formation.findById(targetId);
    }

    if (!targetDoc) {
      return res.status(404).json({
        success: false,
        message: `❌ ${type} introuvable`
      });
    }

    // ✅ Étape 4 : Vérifier que l’option codePromo est activée
    if (!targetDoc.investmentOptions?.codePromo) {
      return res.status(400).json({
        success: false,
      });
    }

    // 🎉 Succès
    return res.status(200).json({
      success: true,
      message: `✅ Code promo valide pour ce ${type}`,
      promoOwnerId: userWithPromo._id,
      nom: userWithPromo.nom,
      prenom: userWithPromo.prenom
    });

  } catch (error) {
    console.error("❌ Erreur vérification code promo :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la validation",
      error: error.message
    });
  }
};


export const getRejectedOrPendingCreationsByUser = async (req, res) => {
  const { id: userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: "❌ ID utilisateur invalide"
    });
  }

  try {
    // 🔍 1. Récupérer TOUS les ebooks et formations de l'utilisateur (quel que soit le statut)
    const [allEbooks, allFormations] = await Promise.all([
      Ebook.find({ auteur: userId }),
      Formation.find({ auteur: userId })
    ]);

    // 🧮 Si aucune création
    if (allEbooks.length === 0 && allFormations.length === 0) {
      return res.status(200).json({
        success: true,
        message: "ℹ️ Cet utilisateur n’a créé aucun contenu",
        ebooks: [],
        formations: []
      });
    }

    // 🎯 2. Maintenant filtrer uniquement les contenus "pending" ou "rejected"
    const [ebooks, formations] = await Promise.all([
      Ebook.find({ auteur: userId, approved: { $in: ['pending', 'rejected'] } }).sort({ createdAt: -1 }),
      Formation.find({ auteur: userId, approved: { $in: ['pending', 'rejected'] } }).sort({ createdAt: -1 })
    ]);

    // 🧼 3. Si tous les contenus sont approuvés
    if (ebooks.length === 0 && formations.length === 0) {
      return res.status(200).json({
        success: true,
        message: "✅ Tous les contenus de cet utilisateur sont approuvés",
        ebooks: [],
        formations: []
      });
    }

    // 🎉 4. Sinon, on retourne les contenus en attente ou refusés
    return res.status(200).json({
      success: true,
      message: "✅ Contenus en attente ou refusés récupérés",
      ebooks,
      formations
    });

  } catch (error) {
    console.error("❌ Erreur récupération créations rejetées ou en attente :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};
