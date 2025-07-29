import express from "express";
import { uploadFile, generateEbook, uploadCover } from "../controllers/ebookController.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// ✅ Config multer pour extraction (memoryStorage)
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ storage: memoryStorage });

// ✅ Config multer pour upload sur disque
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 📁 dossier de destination
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const uploadDisk = multer({ storage: diskStorage });

// ✅ Route pour extraire texte depuis PDF/Word (memoryStorage)
router.post("/upload", uploadMemory.single("file"), uploadFile);

// ✅ Route pour upload de cover (diskStorage)
router.post("/uploadCover", uploadDisk.single("file"), uploadCover);

// ✅ Route pour générer l'ebook (diskStorage car on a besoin du fichier sur disque)
router.post("/generate", uploadDisk.single("coverFile"), generateEbook);

export default router;
