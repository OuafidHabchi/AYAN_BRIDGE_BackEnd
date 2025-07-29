export const getRevenueParticipants = ({
  productDoc,
  investmentType = null,
  investorId = null
}) => {
  console.log("🔍 [getRevenueParticipants] productDoc reçu :", productDoc?._id);
  console.log("📊 investmentType:", investmentType, "| investorId:", investorId);

  if (!productDoc || typeof productDoc !== "object") {
    throw new Error("❌ productDoc est manquant ou invalide.");
  }

  if (!productDoc.revenueParticipants) {
    throw new Error("❌ Le champ revenueParticipants est manquant dans le produit.");
  }

  const {
    creator: rawCreator,
    owner: rawOwner,
    investors: rawInvestors = []
  } = productDoc.revenueParticipants;

  if (!rawCreator || !rawOwner) {
    throw new Error("❌ Les champs creator ou owner sont absents dans revenueParticipants.");
  }

  let creator = {
    id: rawCreator.id,
    percent: rawCreator.percent ?? 70
  };

  let owner = {
    id: rawOwner.id,
    percent: rawOwner.percent ?? 30
  };

  let investors = [];

  if (investmentType && investorId) {
    // Logique dynamique : 1 seul investisseur selon type
    let investorPercent = 0;

    switch (investmentType) {
      case 'affiliation':
        investorPercent = 20;
        break;
      case 'sponsoring':
        investorPercent = 20;
        break;
      case 'codePromo':
        investorPercent = 10;
        break;
      case 'licence':
        investorPercent = 0;
        break;
      default:
        throw new Error('❌ Type d’investissement inconnu');
    }

    creator.percent -= investorPercent;

    investors.push({
      id: investorId,
      percent: investorPercent,
      role: investmentType
    });
  } else if (Array.isArray(rawInvestors) && rawInvestors.length > 0) {
    // 🔁 Cas fallback : on utilise les investisseurs définis dans le produit
    investors = rawInvestors.map(inv => ({
      id: inv.id,
      percent: inv.percent,
      role: inv.role || "investor"
    }));
  }

  // 🧮 Validation du total
  const totalPercent =
    creator.percent +
    owner.percent +
    investors.reduce((sum, i) => sum + i.percent, 0);

  if (totalPercent !== 100) {
    throw new Error(`❌ Les pourcentages ne totalisent pas 100%. Actuel: ${totalPercent}%`);
  }

  console.log("✅ [getRevenueParticipants] Distribution prête :", {
    creator, owner, investors
  });

  return {
    creator,
    owner,
    investors
  };
};
