import express from "express";
import multer from "multer";
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/templateController.js";

const router = express.Router();

// ✅ Config multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // dossier uploads à la racine
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Routes
router.get("/", getAllTemplates);
router.post("/", upload.single("image"), createTemplate);
router.put("/:id", upload.single("image"), updateTemplate);
router.delete("/:id", deleteTemplate);

export default router;
