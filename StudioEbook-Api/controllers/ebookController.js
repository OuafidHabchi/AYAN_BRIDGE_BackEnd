import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { JSDOM } from 'jsdom';
import { createCanvas, loadImage } from "canvas";
import Template from "../../EbooksTemplate/models/templateModel.js";
import { saveEbookInCollection } from "../../EbooksCollection/controllers/CollectionEbookController.js";


// ✅ Correction __dirname pour ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



export const uploadFile = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "Aucun fichier reçu" });
    }

    let text = "";

    // ✅ Si PDF
    if (file.mimetype === "application/pdf") {
      const data = await pdfParse(file.buffer);
      text = data.text;
    }

    // ✅ Si Word
    else if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/msword"
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    }

    else {
      return res.status(400).json({ success: false, message: "Format de fichier non supporté" });
    }

    return res.status(200).json({ success: true, text });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Erreur serveur lors de l'extraction" });
  }
};


//uploder la photo de couverture dun Ebook

export const uploadCover = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "Aucun fichier reçu" });
    }

    // ✅ Génération d'un nom unique
    const extension = path.extname(file.originalname);
    const filename = `cover-${uuidv4()}${extension}`;

    // ✅ Dossier de destination (par exemple /uploads)
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);

    // ✅ Déplacer le fichier
    fs.renameSync(file.path, filePath);

    // ✅ Retourner son chemin relatif (pour ton frontend et DB)
    return res.status(200).json({
      success: true,
      path: `/uploads/${filename}`
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'upload de couverture :", error);
    return res.status(500).json({ success: false, message: "Erreur serveur lors de l'upload" });
  }
};






export const generateEbook = async (req, res) => {
  try {
    // Validation des données requises
    const requiredFields = ['titre', 'paletteColor', 'fontSize', 'textBox'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      console.error("❌ Champs manquants:", missingFields);
      return res.status(400).json({
        success: false,
        message: `Champs requis manquants: ${missingFields.join(', ')}`
      });
    }

    const {
      coverPath, // Chemin vers l'image de couverture (première page)
      titre,
      templateId, // ID du template pour les autres pages
      paletteColor,
      fontSize,
      textBox,
      content = '',
      selectedWritingStyle,
      textWeight,
      method = 'Manuel'
    } = req.body;

    // Validation des types et valeurs
    if (typeof fontSize !== 'number' || fontSize < 10 || fontSize > 72) {
      return res.status(400).json({
        success: false,
        message: 'La taille de police doit être entre 10 et 72'
      });
    }

    if (!textBox || typeof textBox !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'La zone de texte doit être un objet avec x, y, width et height'
      });
    }

    const { x, y, width, height } = textBox;
    if (typeof x !== 'number' || typeof y !== 'number' ||
      typeof width !== 'number' || typeof height !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Les propriétés de la zone de texte doivent être des nombres'
      });
    }

    // 1. Création du dossier de sortie
    const ebookId = uuidv4();
    const ebookDir = path.join(__dirname, `../../ebooks/${ebookId}`);
    fs.mkdirSync(ebookDir, { recursive: true });

    // 2. Gestion des images
    let coverImage, pageBgImage;
    let imageWidth, imageHeight;
    let coverImagePath = null;
    let templateImagePath = null;

    if (coverPath) {
      try {
        const fullCoverPath = path.join(__dirname, `../../${coverPath}`);
        coverImage = await loadImage(fullCoverPath);

        // Sauvegarde de la couverture dans le dossier de l'ebook
        const coverImagePath = path.join(ebookDir, 'cover.png'); // ➡️ toujours .png

        // Convertir et sauvegarder en .png
        const canvas = createCanvas(coverImage.width, coverImage.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(coverImage, 0, 0, coverImage.width, coverImage.height);

        const out = fs.createWriteStream(coverImagePath);
        const stream = canvas.createPNGStream();
        stream.pipe(out);

        await new Promise((resolve, reject) => {
          out.on('finish', resolve);
          out.on('error', reject);
        });

        // Définir des dimensions fixes pour les pages du livre (ex: format vertical 600x900)
        imageWidth = 600;
        imageHeight = 900;

      } catch (err) {
        console.error("❌ Erreur de traitement de la couverture:", err);
        return res.status(400).json({
          success: false,
          message: "Impossible de traiter l'image de couverture"
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "L'image de couverture (coverPath) est obligatoire"
      });
    }


    // 2.2 Traitement du template pour les autres pages
    if (templateId) {
      try {
        const coverTemplate = await Template.findById(templateId);

        if (!coverTemplate) {
          console.error("❌ Template non trouvé");
          return res.status(404).json({
            success: false,
            message: "Template de couverture non trouvé"
          });
        }

        // Chemin de l'image de fond
        let bgUrl = coverTemplate.imageUrl;
        if (!bgUrl.startsWith('http')) {
          bgUrl = path.join(__dirname, `../../${bgUrl}`);
        }

        pageBgImage = await loadImage(bgUrl);

        // Vérification que les dimensions correspondent
        if (pageBgImage.width !== imageWidth || pageBgImage.height !== imageHeight) {
          console.warn("⚠️ Les dimensions du template ne correspondent pas à la couverture");
        }
      } catch (err) {
        console.error("❌ Erreur de chargement du template:", err);
        return res.status(400).json({
          success: false,
          message: "Impossible de charger le template"
        });
      }
    } else {
      pageBgImage = coverImage;
    }

    // Dimensions du canvas dans le frontend (600x900)
    const frontCanvasWidth = 600;
    const frontCanvasHeight = 900;

    // Calcul des ratios de conversion
    const widthRatio = imageWidth / frontCanvasWidth;
    const heightRatio = imageHeight / frontCanvasHeight;

    // Ajustement des coordonnées
    const adjustedTextBox = {
      x: x * widthRatio,
      y: y * heightRatio,
      width: width * widthRatio,
      height: height * heightRatio
    };


    // Vérification que la zone de texte est dans les limites
    if (adjustedTextBox.x < 0 || adjustedTextBox.y < 0 ||
      adjustedTextBox.x + adjustedTextBox.width > imageWidth ||
      adjustedTextBox.y + adjustedTextBox.height > imageHeight) {
      return res.status(400).json({
        success: false,
        message: 'La zone de texte dépasse les limites de l\'image'
      });
    }

    // 3. Préparation du texte (HTML parsing avec jsdom)
    const { window } = new JSDOM();
    const domParser = new window.DOMParser();
    const doc = domParser.parseFromString(content, 'text/html');

    const canvasTmp = createCanvas(1, 1);
    const ctxTmp = canvasTmp.getContext('2d');

    const adjustedFontSize = fontSize * widthRatio;

    let blocks = [];
    let currentBlock = null;

    // Helper pour calculer les lignes d'un bloc selon style
    const computeLines = (text, style, maxWidth) => {
      ctxTmp.font = `${style.fontWeight || 'normal'} ${style.fontSize}px ${style.fontFamily || 'Arial'}`;
      const words = text.split(/\s+/);
      let lines = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctxTmp.measureText(testLine);

        if (metrics.width > maxWidth) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine) lines.push(currentLine);
      return lines;
    };


    // Fonction récursive pour parser avec héritage de styles
    const parseNode = (node, parentStyle) => {
      if (!node) return;

      let style = { ...parentStyle }; // copie du style parent

      // Si élément (balise)
      if (node.nodeType === 1) {
        const tag = node.tagName.toLowerCase();

        // Appliquer styles selon balise
        if (tag === 'h1') style.fontSize = adjustedFontSize * 1.8;
        if (tag === 'h2') style.fontSize = adjustedFontSize * 1.5;
        if (tag === 'h3') style.fontSize = adjustedFontSize * 1.3;
        if (tag === 'b' || tag === 'strong') style.fontWeight = 'bold';
        if (tag === 'i' || tag === 'em') style.fontStyle = 'italic';
        if (tag === 'u') style.textDecoration = 'underline';
        // Si balise font avec attribut color
        if (tag === 'font' && node.hasAttribute('color')) {
          style.color = node.getAttribute('color');
        }


        // Style inline
        if (node.hasAttribute('style')) {
          const inlineStyle = node.getAttribute('style');
          if (inlineStyle.includes('color:')) {
            style.color = inlineStyle.match(/color:\s*(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)/)[1];
          }
          if (inlineStyle.includes('font-weight:')) {
            style.fontWeight = inlineStyle.match(/font-weight:\s*(\w+)/)[1];
          }
        }

        // Parcourir enfants
        node.childNodes.forEach(child => parseNode(child, style));

      } else if (node.nodeType === 3) { // Texte pur
        let text = node.textContent.trim();
        if (!text) return;

        const lines = computeLines(text, style, adjustedTextBox.width);

        blocks.push({
          type: node.parentNode && node.parentNode.nodeType === 1
            ? node.parentNode.tagName.toLowerCase()
            : 'text',
          style,
          lines
        });

      }
    };


    // Parcours des éléments enfants du body
    // Appel initial avec style de base
    const baseStyle = {
      fontSize: adjustedFontSize,
      fontWeight: textWeight || 'normal',
      fontFamily: (selectedWritingStyle && selectedWritingStyle.fontFamily) ? selectedWritingStyle.fontFamily : 'Arial',
      fontStyle: (selectedWritingStyle && selectedWritingStyle.fontStyle) ? selectedWritingStyle.fontStyle : 'normal',
      color: paletteColor
    };

    doc.body.childNodes.forEach(node => parseNode(node, baseStyle));




    // 4. Génération des pages
    const lineHeight = adjustedFontSize * 1.5;
    const paragraphSpacing = adjustedFontSize * 0.5;

    // Calcul du nombre total de lignes à partir des blocks
    let totalLines = 0;
    blocks.forEach(block => {
      totalLines += block.lines.length;
    });

    const maxLinesPerPage = Math.floor(adjustedTextBox.height / lineHeight);
    const totalPages = Math.ceil(totalLines / maxLinesPerPage) + 1; // +1 pour la couverture
    const pageNumberFontSize = adjustedFontSize * 0.8; // Taille un peu plus petite que le texte

    // 4.2 Génération des pages de contenu avec blocks
    let currentBlockIndex = 0;
    let pageNumber = 1; // Commence à 1 (0 serait la couverture)

    while (currentBlockIndex < blocks.length) {
      const pageCanvas = createCanvas(imageWidth, imageHeight);
      const pageCtx = pageCanvas.getContext('2d');

      // Dessin du fond
      pageCtx.imageSmoothingEnabled = true;
      pageCtx.drawImage(pageBgImage, 0, 0, imageWidth, imageHeight);

      let currentY = adjustedTextBox.y;
      let contentAdded = false;

      while (currentBlockIndex < blocks.length) {
        const block = blocks[currentBlockIndex];
        const blockHeight = (block.lines.length * lineHeight) + paragraphSpacing;


        // Si le bloc est un titre (h1, h2, h3)
        if (['h1', 'h2', 'h3', 'u', 'b', 'i', 'font'].includes(block.type)) {

          // Vérifier si le titre tient sur la page
          if ((currentY + blockHeight) > (adjustedTextBox.y + adjustedTextBox.height)) {
            break; // Passe à la page suivante pour ajouter le titre avec son paragraphe
          }

          // Dessiner le titre
          pageCtx.font = `${block.style.fontStyle || 'normal'} ${block.style.fontWeight || 'normal'} ${block.style.fontSize}px ${block.style.fontFamily || 'Arial'}`;
          pageCtx.fillStyle = block.style.color || paletteColor;

          block.lines.forEach(line => {
            // Dessin du texte
            pageCtx.fillText(line, adjustedTextBox.x, currentY);
            // ➡️ Gestion de l'underline
            if (block.style.textDecoration === 'underline') {
              const textWidth = pageCtx.measureText(line).width;

              // Calculer un espace dynamique en fonction de la taille de police
              const spacing = Math.max(2, block.style.fontSize * 0.1); // minimum 2px, sinon 10% de fontSize
              const underlineY = currentY + spacing;

              pageCtx.beginPath();
              pageCtx.moveTo(adjustedTextBox.x, underlineY);
              pageCtx.lineTo(adjustedTextBox.x + textWidth, underlineY);

              // ✅ Définir l'épaisseur selon h1, h2, h3 ou par défaut
              let lineWidth;
              if (['h1', 'h2', 'h3'].includes(block.type)) {
                lineWidth = Math.max(2, block.style.fontSize * 0.05); // proportionnel pour titres
              } else {
                lineWidth = 1; // épaisseur par défaut pour texte normal
              }

              pageCtx.lineWidth = lineWidth;
              pageCtx.strokeStyle = block.style.color || paletteColor;
              pageCtx.stroke();
            }

            currentY += lineHeight;
          });
          currentY += paragraphSpacing;
          currentBlockIndex++;
          contentAdded = true;

          // Vérifier le paragraphe suivant
          const nextBlock = blocks[currentBlockIndex];
          if (nextBlock) {
            const nextBlockHeight = (nextBlock.lines.length * lineHeight) + paragraphSpacing;

            pageCtx.font = `${nextBlock.style.fontStyle || 'normal'} ${nextBlock.style.fontWeight || 'normal'} ${nextBlock.style.fontSize}px ${nextBlock.style.fontFamily || 'Arial'}`;
            pageCtx.fillStyle = nextBlock.style.color || paletteColor;


            if ((currentY + nextBlockHeight) <= (adjustedTextBox.y + adjustedTextBox.height)) {
              // Le paragraphe tient en entier
              nextBlock.lines.forEach(line => {
                pageCtx.fillText(line, adjustedTextBox.x, currentY);
                currentY += lineHeight;
              });
              currentY += paragraphSpacing;
              currentBlockIndex++;
              contentAdded = true;
            } else {
              // Le paragraphe ne tient pas en entier, ajouter ce qui rentre
              const linesPerPage = Math.floor((adjustedTextBox.y + adjustedTextBox.height - currentY) / lineHeight);
              const visibleLines = nextBlock.lines.slice(0, linesPerPage);

              visibleLines.forEach(line => {
                pageCtx.fillText(line, adjustedTextBox.x, currentY);
                currentY += lineHeight;
              });
              nextBlock.lines = nextBlock.lines.slice(linesPerPage);
              currentY += paragraphSpacing;
              contentAdded = true;
              break; // Passe à la prochaine page pour continuer le paragraphe
            }
          }
        }
        else {
          // Bloc normal
          if ((currentY + blockHeight) > (adjustedTextBox.y + adjustedTextBox.height)) {
            // Bloc trop grand pour la page, découper si nécessaire
            if (!contentAdded && currentY === adjustedTextBox.y) {

              const linesPerPage = Math.floor(adjustedTextBox.height / lineHeight);
              const totalSubPages = Math.ceil(block.lines.length / linesPerPage);

              for (let subPage = 0; subPage < totalSubPages; subPage++) {
                const startLine = subPage * linesPerPage;
                const endLine = Math.min(startLine + linesPerPage, block.lines.length);
                const subLines = block.lines.slice(startLine, endLine);

                const subPageCanvas = createCanvas(imageWidth, imageHeight);
                const subPageCtx = subPageCanvas.getContext('2d');
                subPageCtx.drawImage(pageBgImage, 0, 0, imageWidth, imageHeight);

                let subPageY = adjustedTextBox.y;
                subPageCtx.font = `${block.style.fontStyle || 'normal'} ${block.style.fontWeight || 'normal'} ${block.style.fontSize}px ${block.style.fontFamily || 'Arial'}`;
                subPageCtx.fillStyle = block.style.color || paletteColor;

                subLines.forEach(line => {
                  subPageCtx.fillText(line, adjustedTextBox.x, subPageY);
                  subPageY += lineHeight;
                });

                // Numéro de page
                subPageCtx.fillStyle = paletteColor;
                subPageCtx.font = `bold ${pageNumberFontSize}px 'Arial', sans-serif`;
                subPageCtx.textAlign = 'center';
                subPageCtx.textBaseline = 'bottom';
                subPageCtx.fillText(pageNumber.toString(), imageWidth / 2, imageHeight - (imageHeight * 0.05));

                // Sauvegarde
                const subPagePath = path.join(ebookDir, `page-${pageNumber}.png`);
                await new Promise((resolve, reject) => {
                  const out = fs.createWriteStream(subPagePath);
                  subPageCanvas.createPNGStream().pipe(out);
                  out.on('finish', resolve);
                  out.on('error', reject);
                });

                pageNumber++;
              }

              currentBlockIndex++;
              contentAdded = true;
              break;
            } else {
              break; // Nouvelle page normale
            }
          }

          // Dessiner le bloc complet
          pageCtx.font = `${block.style.fontStyle || 'normal'} ${block.style.fontWeight || 'normal'} ${block.style.fontSize}px ${block.style.fontFamily || 'Arial'}`;
          pageCtx.fillStyle = block.style.color || paletteColor;

          block.lines.forEach(line => {
            // Dessin du texte
            pageCtx.fillText(line, adjustedTextBox.x, currentY);
            // ➡️ Gestion de l'underline
            if (block.style.textDecoration === 'underline') {
              const textWidth = pageCtx.measureText(line).width;
              const underlineY = currentY + 2; // position sous le texte
              pageCtx.beginPath();
              pageCtx.moveTo(adjustedTextBox.x, underlineY);
              pageCtx.lineTo(adjustedTextBox.x + textWidth, underlineY);
              pageCtx.lineWidth = 1;
              pageCtx.strokeStyle = block.style.color || paletteColor;
              pageCtx.stroke();
            }


            currentY += lineHeight;
          });


          currentY += paragraphSpacing;
          currentBlockIndex++;
          contentAdded = true;
        }
      }

      // Si du contenu a été ajouté, sauvegarder la page
      if (contentAdded) {
        pageCtx.fillStyle = paletteColor;
        pageCtx.font = `bold ${pageNumberFontSize}px 'Arial', sans-serif`;
        pageCtx.textAlign = 'center';
        pageCtx.textBaseline = 'bottom';
        pageCtx.fillText(pageNumber.toString(), imageWidth / 2, imageHeight - (imageHeight * 0.05));

        const pagePath = path.join(ebookDir, `page-${pageNumber}.png`);
        await new Promise((resolve, reject) => {
          const out = fs.createWriteStream(pagePath);
          pageCanvas.createPNGStream().pipe(out);
          out.on('finish', resolve);
          out.on('error', reject);
        });

        pageNumber++;
      }
    }



    // 5. Réponse finale
    const generatedFiles = fs.readdirSync(ebookDir)
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1]?.split('.')[0]) || 0;
        const numB = parseInt(b.split('-')[1]?.split('.')[0]) || 0;
        return numA - numB;
      })
      .map(file => `/ebooks/${ebookId}/${file}`);


    await saveEbookInCollection({
      auteur: req.body.auteur,
      titre,
      NumPages: totalPages,
      categorie: req.body.categorie,
      prix: req.body.prix,
      description: req.body.description,
      langue: req.body.langue,
      investmentOptions: req.body.investmentOptions,
      ebookId,
      approved: 'pending',
      folderPath: `/ebooks/${ebookId}/`,
      promotion: false,
      newPrix: 0
    });


    res.status(200).json({
      success: true,
      message: "Ebook généré avec succès",
      ebookId,
      files: generatedFiles,
      details: {
        titre,
        pages: totalPages,
        resolution: `${imageWidth}x${imageHeight}px`,
        coverPath: `/ebooks/${ebookId}/page-1.png`,
        templatePath: templateImagePath ? `/ebooks/${ebookId}/${path.basename(templateImagePath)}` : null,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("❌ Erreur lors de la génération:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message
    });
  }
};