import mongoose from 'mongoose';

const revenueParticipantSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  percent: { type: Number, required: true }
}, { _id: false });

const ebookSchema = new mongoose.Schema({
  auteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  titre: {
    type: String,
    required: true
  },
  categorie: {
    type: String
  },
  prix: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  NumPages: {
    type: Number,
    default: 0
  },
  langue: {
    type: String
  },
  approved: {
    type: String
  },
  rejectionNote: {
    type: String
  },
  ebookId: {
    type: String,
    required: true
  },
  folderPath: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  promotion: {
    type: Boolean
  },
  newPrix: {
    type: Number
  },

  // ➡️ Options d’investissement activées
  investmentOptions: {
    affiliation: { type: Boolean, default: false },
    codePromo: { type: Boolean, default: false },
    licence: { type: Boolean, default: false },
    sponsoring: { type: Boolean, default: false },
    licenceMontant: { type: Number },
    sponsoringMontant: { type: Number },
  },

  // ✅ Participants à la répartition des revenus
  revenueParticipants: {
    creator: revenueParticipantSchema,
    owner: revenueParticipantSchema,
    investors: [revenueParticipantSchema]
  }

});

export default mongoose.model('Ebook', ebookSchema);
