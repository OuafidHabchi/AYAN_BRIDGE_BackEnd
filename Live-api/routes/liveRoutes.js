import express from "express";
import {
  createLive,
  getLives,
  getLiveById,
  updateLive,
  deleteLive,
} from "../controllers/liveController.js";

const router = express.Router();

// CRUD Routes
router.post("/", createLive);         // Créer une session
router.get("/", getLives);            // Récupérer toutes les sessions
router.get("/:id", getLiveById);      // Récupérer une session par ID
router.put("/:id", updateLive);       // Modifier une session
router.delete("/:id", deleteLive);    // Supprimer une session

export default router;
