import Live from "../models/liveModel.js";

// ✅ Créer une session live
export const createLive = async (req, res) => {
  try {
    const live = await Live.create(req.body);
    res.status(201).json(live);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Récupérer toutes les sessions live
export const getLives = async (req, res) => {
  try {
    const lives = await Live.find().populate("idTeacher", "name email"); 
    res.json(lives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Récupérer une session live par ID
export const getLiveById = async (req, res) => {
  try {
    const live = await Live.findById(req.params.id).populate("idTeacher", "name email");
    if (!live) return res.status(404).json({ message: "Session live introuvable" });
    res.json(live);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Modifier une session live
export const updateLive = async (req, res) => {
  try {
    const updatedLive = await Live.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedLive) return res.status(404).json({ message: "Session live introuvable" });
    res.json(updatedLive);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Supprimer une session live
export const deleteLive = async (req, res) => {
  try {
    const live = await Live.findByIdAndDelete(req.params.id);
    if (!live) return res.status(404).json({ message: "Session live introuvable" });
    res.json({ message: "Session live supprimée avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
