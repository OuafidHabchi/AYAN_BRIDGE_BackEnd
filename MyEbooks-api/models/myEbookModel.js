import mongoose from 'mongoose';

const myEbookSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ebook',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  lastReadPage: {
    type: Number,
    default: 0,
  },
  lastReadAt: {
    type: Date,
    default: null,
  }
});

export const MyEbook = mongoose.model('MyEbook', myEbookSchema);
