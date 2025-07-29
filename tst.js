import mongoose from 'mongoose';

// ✅ Définir le schéma inline sans import
const programmeSchema = new mongoose.Schema(
  {
    pays: { type: String, required: true },
    niveau: { type: String, required: true },
    sousNiveau: { type: String, required: true },
    matiere: { type: String, required: true },
    chapitres: [{ type: String, required: true }]
  },
  { timestamps: true }
);

const Programme = mongoose.model('Programme', programmeSchema);

// ✅ Données locales (copiées ici)
const formationData = {
  'France': {
    niveaux: ['Collège'],
    sousNiveaux: {
      'Collège': ['6ème', '5ème']
    },
    matieres: {
      '6ème': ['Mathématiques', 'Français'],
      '5ème': ['Mathématiques']
    }
  },
  'Maroc': {
    niveaux: ['Collège'],
    sousNiveaux: {
      'Collège': ['1ère année collège']
    },
    matieres: {
      '1ère année collège': ['Mathématiques']
    }
  }
};

const chapitresParMatiere = {
  'Mathématiques': [
    'Les nombres et calculs',
    'Grandeurs et mesures',
    'Espace et géométrie'
  ],
  'Français': [
    'Grammaire',
    'Conjugaison',
    'Orthographe'
  ]
};

// ✅ Connexion MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(
      'mongodb+srv://ouafid:Wafid12340@ayanbridgecollections.jlraefr.mongodb.net/AyanBridge',
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log('✅ Connecté à MongoDB Atlas');
  } catch (err) {
    console.error('❌ Erreur MongoDB:', err);
    process.exit(1);
  }
};

// ✅ Insertion auto
const insertProgrammes = async () => {
  try {
    await connectDB();

    const programmesToInsert = [];

    for (const pays in formationData) {
      const data = formationData[pays];
      for (const niveau of data.niveaux) {
        const sousNiveaux = data.sousNiveaux[niveau] || [];

        for (const sousNiveau of sousNiveaux) {
          const matieres = data.matieres[sousNiveau] || [];

          for (const matiere of matieres) {
            const chapitres = chapitresParMatiere[matiere] || [];

            if (chapitres.length === 0) continue;

            const programme = {
              pays,
              niveau,
              sousNiveau,
              matiere,
              chapitres
            };

            programmesToInsert.push(programme);
          }
        }
      }
    }

    if (programmesToInsert.length > 0) {
      await Programme.insertMany(programmesToInsert);
      console.log(`✅ ${programmesToInsert.length} programmes insérés avec succès.`);
    } else {
      console.log('⚠️ Aucun programme à insérer.');
    }

    process.exit();
  } catch (error) {
    console.error('❌ Erreur lors de l’insertion :', error);
    process.exit(1);
  }
};

insertProgrammes();
