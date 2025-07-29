import mongoose from "mongoose";

const liveSchema = new mongoose.Schema(
  {
    idTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle User (ou Teacher selon ton app)
      required: true,
    },
    titre: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    lienReunion: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    heure: {
      type: String,
      required: true,
    },
    duree: {
      type: String,
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false, // false = session unique, true = session chaque semaine
    },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  }
);

const Live = mongoose.model("Live", liveSchema);

export default Live;
