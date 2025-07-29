import mongoose from "mongoose";

// 🎯 Participant avec rôle (pour investors uniquement)
const revenueParticipantSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  percent: { type: Number, required: true },
  amount: { type: Number, required: true },
  payed: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ["investor", "affiliation", "sponsoring", "codePromo", "licence"],
    default: "investor"
  }
}, { _id: false });

const baseParticipantSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  percent: { type: Number, required: true },
  amount: { type: Number, required: true },
  payed: { type: Boolean, default: false }
}, { _id: false });

const venteSchema = new mongoose.Schema({
  myFormationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MyFormation",
    default: null
  },

  myEbookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MyEbook",
    default: null
  },

  product: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["formation", "ebook"], required: true }
  },

  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  // 👤 Participants directs
  creator: baseParticipantSchema,
  owner: baseParticipantSchema,

  // 💼 Investisseurs dynamiques
  investors: [revenueParticipantSchema],

  date: {
    type: Date,
    default: Date.now
  }
});

const Vente = mongoose.model("Vente", venteSchema);
export default Vente;
