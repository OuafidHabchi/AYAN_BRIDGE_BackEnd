import mongoose from 'mongoose';

const programmeSchema = new mongoose.Schema(
  {
    pays: { type: String, required: true },
    niveau: { type: String, required: true },
    sousNiveau: { type: String, required: true },
    matiere: { type: String, required: true },
    chapitres: [{ type: String, required: true }]
  },
  {
    timestamps: true // ajoute automatiquement createdAt et updatedAt
  }
);

const Programme = mongoose.model('Programme', programmeSchema);
export default Programme;
