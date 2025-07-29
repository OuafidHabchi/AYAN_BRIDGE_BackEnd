import mongoose from "mongoose";
import Vente from "../models/venteModel.js";
import Ebook from "../../EbooksCollection/models/CollectionEbooks.js";
import { Formation } from "../../StudioFormation-api/models/formationModel.js";
import User from "../../Users-api/models/userModel.js"; // modifie le chemin si besoin
import { getRevenueParticipants } from "../../utils/revenueCalculations.js"; // assure-toi que ce chemin est correct


export const createVente = async ({
  productId,
  buyerId,
  amount,
  ebook = false,
  formation = false,
  myEbookId = null,
  myFormationId = null,
  investmentType = null,
  investorId = null
}) => {
  try {
    console.log("📥 [createVente] Appel avec :", {
      productId,
      buyerId,
      amount,
      ebook,
      formation,
      myEbookId,
      myFormationId,
      investmentType,
      investorId
    });

    let productDoc;
    let productType;
    let linkId = null;

    if (ebook) {
      productDoc = await Ebook.findById(productId);
      productType = "ebook";
      linkId = myEbookId;
    } else if (formation) {
      productDoc = await Formation.findById(productId);
      productType = "formation";
      linkId = myFormationId;
    } else {
      throw new Error("❌ Spécifie si c’est un ebook ou une formation.");
    }

    if (!productDoc) {
      throw new Error(`❌ ${productType} introuvable avec ID : ${productId}`);
    }

    // 🔢 Détermine le prix de base (promo ou non)
    const prixDeBase =
      productDoc.promotion && productDoc.newPrix > 0
        ? productDoc.newPrix
        : productDoc.prix;

    console.log("💰 Prix de base pour répartition :", prixDeBase);
    const reduction = prixDeBase - amount;

    // 🧮 Calcul des participants
    const participants = await getRevenueParticipants({
      productDoc,
      investmentType,
      investorId
    });

    // 💸 Calcule les parts du owner et des investisseurs sur le prix de base
    const ownerAmount = (participants.owner.percent / 100) * prixDeBase;
    const investorAmounts = (participants.investors || []).map(inv => ({
      ...inv,
      amount: (inv.percent / 100) * prixDeBase
    }));
    const totalInvestorAmount = investorAmounts.reduce((sum, inv) => sum + inv.amount, 0);

    // Le créateur prend ce qui reste dans ce que le client a réellement payé
    const creatorAmount = amount - ownerAmount - totalInvestorAmount;

    participants.owner.amount = ownerAmount;
    participants.creator.amount = creatorAmount;
    participants.investors = investorAmounts;

    // 💾 Création de la vente
    const vente = new Vente({
      myFormationId: formation ? linkId : null,
      myEbookId: ebook ? linkId : null,
      product: {
        id: productId,
        type: productType
      },
      buyerId,
      amount, // ce que le client a payé (réduit)
      creator: participants.creator,
      owner: participants.owner,
      investors: participants.investors,
      date: new Date()
    });

    const savedVente = await vente.save();
    console.log("✅ Vente enregistrée :", savedVente._id);
    return savedVente;

  } catch (error) {
    console.error("❌ Erreur createVente :", error.message);
    throw error;
  }
};







// 📃 Lire toutes les ventes
export const getAllVentes = async (req, res) => {
  try {
    const ventes = await Vente.find().sort({ date: -1 });
    res.status(200).json({ ventes });
  } catch (error) {
    console.error("❌ Erreur getAllVentes:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 🔎 Obtenir une vente par ID
export const getVenteById = async (req, res) => {
  try {
    const vente = await Vente.findById(req.params.id);
    if (!vente) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }
    res.status(200).json({ vente });
  } catch (error) {
    console.error("❌ Erreur getVenteById:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};



export const getUserRevenusById = async (req, res) => {
  const { id: userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ success: false, message: "❌ ID invalide" });
  }

  try {
    const ventes = await Vente.find({
      $or: [
        { "creator.id": userId },
        { "owner.id": userId },
        { "investors.id": userId }
      ]
    }).sort({ date: -1 });

    const revenus = [];

    for (const vente of ventes) {
      let role = null;
      let revenu = null;

      if (vente.creator.id.toString() === userId) {
        role = "creator";
        revenu = {
          amount: vente.creator.amount,
          percent: vente.creator.percent,
          payed: vente.creator.payed
        };
      } else if (vente.owner.id.toString() === userId) {
        role = "owner";
        revenu = {
          amount: vente.owner.amount,
          percent: vente.owner.percent,
          payed: vente.owner.payed
        };
      } else {
        const investor = vente.investors.find(inv => inv.id.toString() === userId);
        if (investor) {
          role = investor.role || "investor";
          revenu = {
            amount: investor.amount,
            percent: investor.percent,
            payed: investor.payed
          };
        }
      }

      let produitInfo = null;

      if (vente.product.type === "ebook") {
        const ebook = await Ebook.findById(vente.product.id).select("titre prix promotion newPrix");
        if (ebook) {
          produitInfo = {
            id: ebook._id,
            type: "ebook",
            titre: ebook.titre,
            prix: ebook.promotion && ebook.newPrix > 0 ? ebook.newPrix : ebook.prix
          };
        }
      } else if (vente.product.type === "formation") {
        const formation = await Formation.findById(vente.product.id).select("type titreFormation prix promotion newPrix matiere niveau");
        if (formation) {
          const isScolaire = formation.type === "scolaire";
          produitInfo = {
            id: formation._id,
            type: "formation",
            titre: isScolaire && formation.matiere && formation.niveau
              ? `${formation.matiere} - ${formation.niveau}`
              : formation.titreFormation,
            prix: formation.promotion && formation.newPrix > 0 ? formation.newPrix : formation.prix,
            matiere: formation.matiere || null,
            niveau: formation.niveau || null,
            titreFormation: formation.titreFormation || null
          };
        }
      }

      if (produitInfo && role && revenu) {
        revenus.push({
          venteId: vente._id,
          produit: produitInfo,
          role,
          revenu,
          date: vente.date
        });
      }
    }

    return res.status(200).json({
      success: true,
      userId,
      total: revenus.length,
      revenus
    });
  } catch (error) {
    console.error("❌ Erreur getUserRevenusById :", error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};



export const getTopSoldProducts = async (req, res) => {
  try {
    const topProducts = await Vente.aggregate([
      {
        $group: {
          _id: "$product.id",
          count: { $sum: 1 },
          type: { $first: "$product.type" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    const enrichedProducts = [];

    for (const item of topProducts) {
      const { _id: productId, type, count } = item;
      let productData = null;

      if (type === "ebook") {
        const ebook = await Ebook.findById(productId)
          .select("titre prix newPrix promotion auteur folderPath")
          .populate("auteur", "prenom nom");

        if (ebook) {
          const auteur = ebook.auteur
            ? `${ebook.auteur.prenom || ""} ${ebook.auteur.nom || ""}`.trim()
            : "Auteur inconnu";

          productData = {
            id: ebook._id,
            type: "ebook",
            titre: ebook.titre,
            prix: ebook.promotion && ebook.newPrix > 0 ? ebook.newPrix : ebook.prix,
            coverImage: ebook.folderPath || null,
            auteur,
            ventes: count
          };
        }
      } else if (type === "formation") {
        const formation = await Formation.findById(productId)
          .select("type titreFormation prix newPrix promotion auteur matiere niveau coverImage")
          .populate("auteur", "prenom nom");

        if (formation) {
          const isScolaire = formation.type === "scolaire";
          const titre = isScolaire
            ? `${formation.matiere || "Matière inconnue"} - ${formation.niveau || "Niveau inconnu"}`
            : formation.titreFormation;

          const auteur = formation.auteur
            ? `${formation.auteur.prenom || ""} ${formation.auteur.nom || ""}`.trim()
            : "Auteur inconnu";

          productData = {
            id: formation._id,
            type: "formation",
            titre,
            prix: formation.promotion && formation.newPrix > 0 ? formation.newPrix : formation.prix,
            coverImage: formation.coverImage || null,
            auteur,
            ventes: count
          };
        }
      }

      if (productData) {
        enrichedProducts.push(productData);
      }
    }

    return res.status(200).json({
      success: true,
      total: enrichedProducts.length,
      produits: enrichedProducts
    });

  } catch (error) {
    console.error("❌ Erreur getTopSoldProducts :", error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
    });
  }
};