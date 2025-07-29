import mongoose from 'mongoose';

const myFormationSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  formationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Formation',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  lastWatchedChapter: {
    type: Number,
    default: 0
  }
  ,
  lastWatchedAt: {
    type: Date,
    default: null,
  }
});

export const MyFormation = mongoose.model('MyFormation', myFormationSchema);
