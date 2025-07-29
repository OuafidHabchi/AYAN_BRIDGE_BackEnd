import { MyEbook } from '../models/myEbookModel.js';
import Ebook from '../../EbooksCollection/models/CollectionEbooks.js';
import { createVente } from '../../Vents-api/controllers/venteController.js';

export const createMyEbook = async (req, res) => {
  try {
    const { userId, bookId, investmentType, investorId } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ error: 'userId ou bookId manquant.' });
    }

    const existing = await MyEbook.findOne({ clientId: userId, bookId });
    if (existing) {
      return res.status(409).json({ error: 'Ce livre est déjà dans votre bibliothèque.' });
    }

    const ebook = await Ebook.findById(bookId);
    if (!ebook) {
      return res.status(404).json({ error: "eBook introuvable." });
    }

    // 💰 Calcul du prix selon promo + codePromo
    let basePrice = ebook.promotion && ebook.newPrix > 0 ? ebook.newPrix : ebook.prix;

    if (investmentType === 'codePromo') {
      const discounted = basePrice * 0.9;
      basePrice = discounted;
    }
    // 📦 Créer l'achat
    const achat = new MyEbook({ clientId: userId, bookId });
    await achat.save();

    try {
      const vente = await await createVente({
        productId: bookId,
        buyerId: userId,
        amount: basePrice,
        ebook: true,
        myEbookId: achat._id,
        investmentType,
        investorId
      });


    } catch (venteErr) {
      console.error("💥 Vente échouée :", venteErr.message);
      await MyEbook.findByIdAndDelete(achat._id);
      throw new Error("❌ Achat annulé car la vente a échoué.");
    }


    res.status(201).json({
      message: '✅ Livre ajouté à la bibliothèque + vente enregistrée',
      myEbook: achat
    });

  } catch (error) {
    console.error('❌ Erreur createMyEbook:', error);
    res.status(500).json({ error: error.message });
  }
};


// 📚 Obtenir tous les ebooks achetés par un utilisateur
export const getMyEbooks = async (req, res) => {
  try {
    const clientId = req.params.id;
    const ebooks = await MyEbook.find({ clientId })
      .populate('bookId')
      .sort({ date: -1 });

    res.status(200).json({ success: true, ebooks });
  } catch (error) {
    console.error('❌ Erreur récupération MyEbooks:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};


export const updateLastReadPage = async (req, res) => {
  try {
    const { userId, bookId, lastReadPage } = req.body;

    if (!userId || !bookId || typeof lastReadPage !== 'number') {
      return res.status(400).json({ error: 'Champs manquants ou invalides.' });
    }

    const myEbook = await MyEbook.findOne({ clientId: userId, bookId });

    if (!myEbook) {
      return res.status(404).json({ error: 'eBook non trouvé pour ce client.' });
    }

    myEbook.lastReadPage = lastReadPage;

    // ⏱️ Mettre à jour la date de dernière lecture si on dépasse la page 0
    if (lastReadPage > 0) {
      myEbook.lastReadAt = new Date();
    }

    await myEbook.save();

    res.status(200).json({
      message: '✅ Progression mise à jour.',
      lastReadPage,
      lastReadAt: myEbook.lastReadAt || null
    });
  } catch (error) {
    console.error('❌ Erreur updateLastReadPage:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};



export const getLastReadPage = async (req, res) => {
  try {
    const { userId, bookId } = req.params;

    const myEbook = await MyEbook.findOne({ clientId: userId, bookId });

    if (!myEbook) {
      return res.status(404).json({ error: 'eBook non trouvé.' });
    }

    res.status(200).json({ lastReadPage: myEbook.lastReadPage || 0 });
  } catch (error) {
    console.error('❌ Erreur getLastReadPage:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};


export const getMyEbookStats = async (req, res) => {
  try {
    const { id: clientId } = req.params;    

    if (!clientId) {
      return res.status(400).json({ error: 'ID utilisateur manquant.' });
    }

    // Récupère tous les ebooks achetés par l'utilisateur
    const ebooks = await MyEbook.find({ clientId })
      .populate('bookId')
      .sort({ date: -1 });

    // Total des livres
    const totalBooks = ebooks.length;

    // Livre lu le plus récemment (lastReadAt non nul, trié par lastReadAt desc)
    const lastReadBook = ebooks
      .filter(e => e.lastReadAt)
      .sort((a, b) => new Date(b.lastReadAt) - new Date(a.lastReadAt))[0] || null;

    // Livres jamais lus
    const unreadBooks = ebooks.filter(e => !e.lastReadPage || e.lastReadPage === 0);

    res.status(200).json({
      
        lastReadBook,
        unreadBooks,
        totalBooks
      

    });
   

  } catch (error) {
    console.error('❌ Erreur getMyEbookStats:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
