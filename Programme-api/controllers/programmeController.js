import Programme from '../models/programmeModel.js';

// ➕ Créer un nouveau programme
export const createProgramme = async (req, res) => {
    
  try {
    const { pays, niveau, sousNiveau, matiere, chapitres } = req.body;

    const nouveauProgramme = new Programme({ pays, niveau, sousNiveau, matiere, chapitres });
    const saved = await nouveauProgramme.save();

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création", error: error.message });
  }
};

// 📥 Récupérer tous les programmes
export const getAllProgrammes = async (req, res) => {
    try {
    const programmes = await Programme.find().sort({ createdAt: -1 });
    res.status(200).json(programmes);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: error.message });
  }
};

// 🔍 Récupérer un programme par ID
export const getProgrammeById = async (req, res) => {
  try {
    const programme = await Programme.findById(req.params.id);

    if (!programme) {
      return res.status(404).json({ message: "Programme non trouvé" });
    }

    res.status(200).json(programme);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la recherche", error: error.message });
  }
};

// 🛠️ Mettre à jour un programme
export const updateProgramme = async (req, res) => {
  try {
    const updated = await Programme.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Programme introuvable pour mise à jour" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", error: error.message });
  }
};

// ❌ Supprimer un programme
export const deleteProgramme = async (req, res) => {
  try {
    const deleted = await Programme.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Programme introuvable pour suppression" });
    }

    res.status(200).json({ message: "Programme supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
  }
};
