import express from "express";
import {
  createVente,
  getAllVentes,
  getVenteById,
  getUserRevenusById,
  getTopSoldProducts
} from "../controllers/venteController.js";

const router = express.Router();

// top 6 product (ebook/formations)
router.get("/topProducts", getTopSoldProducts);
router.post("/", createVente);         // ➕ Créer une vente
router.get("/", getAllVentes);         // 📃 Liste toutes les ventes
router.get("/:id", getVenteById);      // 🔍 Une vente par ID
// 👇 reccupere tous les vente 
router.get("/revenus/:id", getUserRevenusById);




export default router;
