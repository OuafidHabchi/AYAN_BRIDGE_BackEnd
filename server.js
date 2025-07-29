import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import userRoutes from "./Users-api/routes/userRoutes.js";
import ebookRoutes from "./StudioEbook-Api/routes/ebookRoutes.js";
import TemplateRoutes from "./EbooksTemplate/routes/templateRoutes.js";
import collectionEbooksRoutes from "./EbooksCollection/routes/CollectionEbookRoutes.js";
import StudioFormationRoutes from "./StudioFormation-api/routes/formationRoutes.js";
import myEbookRoutes from "./MyEbooks-api/routes/myEbookRoutes.js"
import myFormationRoutes from "./MyFormations-api/routes/myFormationRoutes.js"
import venteRoutes from "./Vents-api/routes/venteRoutes.js";
import programmeRoutes from "./Programme-api/routes/programmeRoutes.js";
import liveRoutes from "./Live-api/routes/liveRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Correction __dirname pour ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connexion DB
connectDB();

app.use(express.json());

// ✅ Autoriser toutes les origines
app.use(cors());

// ✅ Static files to serve generated ebooks
app.use('/ebooks', express.static(path.join(__dirname, 'ebooks')));
app.use("/uploads", express.static("uploads"));

// ✅ Routes
app.use("/api/users", userRoutes);
app.use("/api/ebooks", ebookRoutes);
app.use("/api/Collectionebooks", collectionEbooksRoutes);
app.use("/api/templates", TemplateRoutes);
app.use("/api/StudioFormationRoutes", StudioFormationRoutes);
app.use("/api/myEbookRoutes", myEbookRoutes);
app.use("/api/myFormationRoutes", myFormationRoutes);
app.use("/api/ventes", venteRoutes);
app.use("/api/programmes", programmeRoutes);
app.use("/api/live", liveRoutes);



app.get("/", (req, res) => {
  res.send("✅ API AyanBridge opérationnelle");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
