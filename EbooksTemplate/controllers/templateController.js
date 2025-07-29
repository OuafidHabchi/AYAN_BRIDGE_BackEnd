import Template from "../models/templateModel.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ✅ __dirname correction for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Get all templates
export const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find();
    res.status(200).json({ success: true, templates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// ✅ Create template
export const createTemplate = async (req, res) => {
  try {
    const { titre } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image requise" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const template = new Template({ titre, imageUrl });
    await template.save();

    res.status(201).json({ success: true, template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur création" });
  }
};

// ✅ Update template
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { titre } = req.body;

    const template = await Template.findById(id);
    if (!template) return res.status(404).json({ success: false, message: "Template non trouvé" });

    if (titre) template.titre = titre;

    // ✅ Update image si une nouvelle image est uploadée
    if (req.file) {
      // supprimer l'ancienne image
      const oldImagePath = path.join(__dirname, "../../uploads", path.basename(template.imageUrl));
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);

      template.imageUrl = `/uploads/${req.file.filename}`;
    }

    await template.save();

    res.status(200).json({ success: true, template });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur update" });
  }
};

// ✅ Delete template
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await Template.findById(id);
    if (!template) return res.status(404).json({ success: false, message: "Template non trouvé" });

    // supprimer l'image associée
    const imagePath = path.join(__dirname, "../../uploads", path.basename(template.imageUrl));
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await template.deleteOne();

    res.status(200).json({ success: true, message: "Template supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur suppression" });
  }
};
