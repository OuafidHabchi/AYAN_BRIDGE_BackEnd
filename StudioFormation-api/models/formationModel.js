import mongoose from 'mongoose';

// 🔹 Sous-chapitre avec plusieurs images
const subChapitreSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  content: { type: String },
  video: { type: String, default: null },
  images: [{ type: String }] // 🔥 plusieurs images
}, { _id: false });

// 🔹 Chapitre contenant seulement un titre et les sous-chapitres
const chapitreSchema = new mongoose.Schema({
  titre: { type: String, required: true },
  sousChapitres: [subChapitreSchema]
});

// 🔹 Participant aux revenus
const revenueParticipantSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  percent: { type: Number, required: true },
}, { _id: false });

// 🔹 Schéma principal
const formationSchema = new mongoose.Schema(
  {
    auteur: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },

    type: { type: String, enum: ['scolaire', 'autre'], required: true },
    prix: { type: Number, default: 0 },
    coverImage: { type: String },
    approved: { type: String }, // "pending", "approved", "rejected"
    langue: { type: String },
    rejectionNote: { type: String },
    promotion: { type: Boolean },
    newPrix: { type: Number },

    // Scolaire
    matiere: String,
    pays: String,
    niveau: String,
    sousNiveau: String,

    // Autre
    categorie: String,
    titreFormation: String,

    // ✅ Liste de chapitres (avec sous-chapitres)
    chapitres: [chapitreSchema],

    // 🔁 Investissement
    investmentOptions: {
      affiliation: { type: Boolean, default: false },
      codePromo: { type: Boolean, default: false },
      licence: { type: Boolean, default: false },
      sponsoring: { type: Boolean, default: false },
      licenceMontant: { type: Number },
      sponsoringMontant: { type: Number }
    },

    // Participants aux revenus
    revenueParticipants: {
      creator: revenueParticipantSchema,
      owner: revenueParticipantSchema,
      investors: [revenueParticipantSchema]
    }

  },
  { timestamps: true }
);

export const Formation = mongoose.model('Formation', formationSchema);




