const prisma = require("../config/prisma");
const { refreshUserProfileEmbedding } = require("./user-profile-embedding.service");
const { getUserSkinProfileFacts, getCurrentSkinTypeFromFacts } = require("./user-skin-profile.service");
const { searchByEmbedding } = require("./embedding.service");

function toBool(value) {
  return String(value).trim().toLowerCase() === "true";
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isSemanticQuery(search){
  if (!search) return false;
  const words = search.trim().split(/\s+/);
  const problemWords = ["gegen", "für", "bei", "problem"];
  const hasProblemWord = problemWords.some((w) => search.toLowerCase().includes(w));
  return words.length >= 3 || hasProblemWord;
}

async function getAllProducts(query) {
  const where = {
    AND: [],
  };

  const categories = toArray(query.category);
  const skinTypes = toArray(query.skinType);
  const concerns = toArray(query.concern);

  const useEmbedding = isSemanticQuery(query.search);

  if (categories.length > 0) {
    where.AND.push({
      category: {
        in: categories,
      },
    });
  }

  if (skinTypes.length > 0) {
    where.AND.push({
      OR: skinTypes.map((skinType) => ({
        skinTypes: {
          contains: skinType,
          mode: "insensitive",
        },
      })),
    });
  }

  if (concerns.length > 0) {
    where.AND.push({
      OR: concerns.map((concern) => ({
        concerns: {
          contains: concern,
          mode: "insensitive",
        },
      })),
    });
  }

  if (query.vegan !== undefined) {
    where.AND.push({
      vegan: toBool(query.vegan),
    });
  }

  if (query.alcoholFree !== undefined) {
    where.AND.push({
      alcoholFree: toBool(query.alcoholFree),
    });
  }

  if (query.fragranceFree !== undefined) {
    where.AND.push({
      fragranceFree: toBool(query.fragranceFree),
    });
  }

  if (query.search && !useEmbedding) {
    where.AND.push({
      OR: [
        {
          name: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          brand: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (where.AND.length === 0) {
    delete where.AND;
  }

//if there is no semantic search, then normal db-query
if (!useEmbedding) {
  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

//semantic search via Embedding
try {
  const embeddingResults = await searchByEmbedding(prisma, query.search, 60);

  const MIN_SIMILARITY = 0.35;
  const relevantResults = embeddingResults.filter(
    (p) => Number(p.similarity) >= MIN_SIMILARITY
  );

  if (relevantResults.length === 0) {
    return [];
  }

  const embeddingIds = relevantResults.map((p) => p.id);

  const hasFilters = 
    categories.length > 0 ||
    skinTypes.length > 0 ||
    concerns.length > 0 ||
    query.vegan !== undefined ||
    query.alcoholFree !== undefined ||
    query.fragranceFree !== undefined;

    const filtered = await prisma.product.findMany({
      where: hasFilters
        ? { ...where, id: { in: embeddingIds } }
        : { id: { in: embeddingIds } },
      orderBy: { name: "asc" },
    });

    return filtered.map((p) => ({ ...p, _semantic: true }));
} catch (err) {
  console.error("Embedding search failed, falling back: ", err.message);

  if (where.AND) {
    where.AND.push({
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { brand: { contains: query.search, mode: "insensitive" } },
      ],
    });
  } else {
    where.AND = [
      {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { brand: { contains: query.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  });
}
}

async function getProductById(id) {
  return prisma.product.findUnique({
    where: { id },
  });
}

function normalizeList(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasTextMatch(source, targets) {
  const text = String(source || "").toLowerCase();
  return targets.some((target) => text.includes(String(target).toLowerCase()));
}

const SKIN_TYPE_LABELS = {
  Normal: "Normale Haut",
  Oily: "Fettige Haut",
  Dry: "Trockene Haut",
  Combination: "Mischhaut",
  Sensitive: "Sensible Haut",
};

const FACT_LABELS = {
  acne: "Akne",
  blemishes: "Unreinheiten",
  redness: "Rötungen",
  pores: "Poren",
  blackheads: "Mitesser",
  dark_spots: "Pigmentflecken",
  dark_circles: "Augenringe",
  wrinkles: "Falten",
  balanced: "Balance",
  oily: "Fettig",
  oily_t_zone: "T-Zone",
  dryness: "Feuchtigkeit",
  dehydration: "Feuchtigkeit",
  tightness: "Spannung",
  flakiness: "Schuppen",
  rough_texture: "Textur",
  shine: "Glanz",
  refined_pores: "Poren",
  clear_skin: "Klare Haut",
  matte: "Matt",
  combination_zones: "Mischhaut",
  hydration: "Feuchtigkeit",
  calming: "Beruhigung",
  glow: "Glow",
  anti_aging: "Anti-Aging",
  barrier_support: "Hautbarriere",
  exfoliation: "Peeling",
  brightening: "Aufhellung",
  sun_protection: "Sonnenschutz",
  light_texture: "Leichte Textur",
  rich_texture: "Reichhaltig",
  fragrance_free: "Parfümfrei",
  alcohol_free: "Alkoholfrei",
  vegan: "Vegan",
  non_comedogenic: "Nicht komedogen",
  oil_free: "Ölfrei",
  cruelty_free: "Tierversuchsfrei",
  natural_ingredients: "Natürlich",
};

function getFactLabel(value) {
  return FACT_LABELS[value] || String(value || "").replace(/_/g, " ");
}

const GOAL_MATCH_TERMS = {
  hydration: ["hydration", "hydrate", "moisture", "moisturizing", "feuchtigkeit", "feuchtigkeits", "hydra", "hyaluron", "glycerin"],
  calming: ["calming", "calm", "soothing", "beruhigung", "beruhigend", "reiz", "irritation", "panthenol", "centella", "aloe"],
  glow: ["glow", "radiance", "radiant", "strahlen", "strahlend", "illuminating", "bright"],
  anti_aging: ["anti-aging", "anti aging", "anti-age", "aging", "falten", "wrinkle", "fine lines", "retinol", "peptide"],
  barrier_support: ["barrier", "hautbarriere", "ceramide", "ceramid", "panthenol", "schutzbarriere"],
  exfoliation: ["exfoliation", "exfoliate", "peeling", "aha", "bha", "salicylic", "salicyl", "glycolic", "lactic acid"],
  brightening: ["brightening", "aufhellung", "pigment", "dark spot", "vitamin c", "vitamin-c", "niacinamide"],
  sun_protection: ["spf", "lsf", "sunscreen", "sun protection", "sonnenschutz", "uva", "uvb"],
};

const PREFERENCE_MATCH_TERMS = {
  light_texture: ["lightweight", "light texture", "leichte textur", "leicht", "gel", "fluid", "zieht schnell ein"],
  rich_texture: ["rich texture", "reichhaltig", "rich", "balm", "balsam", "cream", "creme"],
  fragrance_free: ["fragrance free", "fragrance-free", "parfümfrei", "parfumfrei", "duftstofffrei", "ohne parfum"],
  alcohol_free: ["alcohol free", "alcohol-free", "alkoholfrei", "ohne alkohol"],
  non_comedogenic: ["non comedogenic", "non-comedogenic", "nicht komedogen", "verstopft die poren nicht"],
  oil_free: ["oil free", "oil-free", "ölfrei", "oelfrei", "ohne öl"],
  cruelty_free: ["cruelty free", "cruelty-free", "tierversuchsfrei"],
  natural_ingredients: ["natural ingredients", "natürliche inhaltsstoffe", "naturkosmetik", "natürlich gewonnen"],
};

function getProductSearchText(product) {
  return [
    product.name,
    product.brand,
    product.category,
    product.description,
    product.application,
    product.ingredients,
    product.concerns,
    product.skinTypes,
  ].filter(Boolean).join(" ").toLowerCase();
}

function findMatchingValues(productText, values, termsByValue) {
  return values.filter((value) => hasTextMatch(productText, termsByValue[value] || [value]));
}

function scoreRecommendedProduct(product, user, facts) {
  let bonus = 0;
  const reasons = [];
  const bullets = [];
  const effectiveSkinType = getCurrentSkinTypeFromFacts(facts) || user.skinType;
  const productText = getProductSearchText(product);

  if (effectiveSkinType && hasTextMatch(product.skinTypes, [effectiveSkinType])) {
    bonus += 0.12;
    reasons.push(`Passt zu deinem Hauttyp: ${effectiveSkinType}`);
    bullets.push(SKIN_TYPE_LABELS[effectiveSkinType] || effectiveSkinType);
  }

  const concerns = facts
    .filter((fact) => fact.key === "concern" || fact.key === "skin_state")
    .map((fact) => fact.value);

  const matchedConcerns = concerns.filter((concern) => hasTextMatch(product.concerns, [concern]));

  if (matchedConcerns.length > 0) {
    bonus += 0.1;
    reasons.push("Passt zu deinen Hautbedürfnissen");
    bullets.push(...matchedConcerns.map(getFactLabel));
  }

  const sensitive = facts.some(
    (fact) => fact.key === "sensitivity" || fact.value === "sensitive"
  );

  if (sensitive && product.fragranceFree) {
    bonus += 0.06;
    reasons.push("Parfümfrei für sensible Haut");
    bullets.push("Parfümfrei");
  }

  if (sensitive && product.alcoholFree) {
    bonus += 0.04;
    reasons.push("Alkoholfrei für sensible Haut");
    bullets.push("Alkoholfrei");
  }

  const preferences = facts
    .filter((fact) => fact.key === "preference")
    .map((fact) => String(fact.value || "").toLowerCase());

  const goals = facts
    .filter((fact) => fact.key === "goal")
    .map((fact) => String(fact.value || "").toLowerCase());

  const matchedGoals = findMatchingValues(productText, goals, GOAL_MATCH_TERMS);

  if (matchedGoals.length > 0) {
    bonus += Math.min(0.12, matchedGoals.length * 0.06);
    reasons.push("Passt zu deinen Pflegezielen");
    bullets.push(...matchedGoals.map(getFactLabel));
  }

  if (preferences.includes("vegan") && product.vegan) {
    bonus += 0.05;
    reasons.push("Vegan entsprechend deiner Vorliebe");
    bullets.push("Vegan");
  }

  if (preferences.includes("alcohol_free") && product.alcoholFree) {
    bonus += 0.04;
    reasons.push("Alkoholfrei entsprechend deiner Vorliebe");
    bullets.push("Alkoholfrei");
  }

  if (preferences.includes("fragrance_free") && product.fragranceFree) {
    bonus += 0.04;
    reasons.push("Parfümfrei entsprechend deiner Vorliebe");
    bullets.push("Parfümfrei");
  }

  const textMatchedPreferences = findMatchingValues(
    productText,
    preferences.filter((preference) => !["vegan", "alcohol_free", "fragrance_free"].includes(preference)),
    PREFERENCE_MATCH_TERMS
  );

  if (textMatchedPreferences.length > 0) {
    bonus += Math.min(0.08, textMatchedPreferences.length * 0.04);
    reasons.push("Passt zu deinen Produkt-Vorlieben");
    bullets.push(...textMatchedPreferences.map(getFactLabel));
  }

  const avoidances = facts
    .filter((fact) => fact.key === "ingredient_avoidance" || fact.key === "allergy")
    .map((fact) => fact.value);

  const ingredients = normalizeList(product.ingredients);

  for (const avoidance of avoidances) {
    if (ingredients.some((ingredient) => ingredient.includes(String(avoidance).toLowerCase()))) {
      bonus -= 0.3;
      reasons.push(`Achtung: enthält möglicherweise ${avoidance}`);
      bullets.push("Hinweis");
    }
  }

  return {
    bonus,
    reason: reasons[0] || "Basierend auf deinem Hautprofil empfohlen",
    bullets: [...new Set(bullets)].slice(0, 4),
  };
}

async function getRecommendedProductsForUser(userId, options = {}) {
  const limit = Number(options.limit) || 8;

  await refreshUserProfileEmbedding(userId);

  const [user, facts, candidates] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, skinType: true, gender: true },
    }),
    getUserSkinProfileFacts(userId),
    prisma.$queryRawUnsafe(
      `
        SELECT
          p.*,
          1 - (pe.embedding <=> upe.embedding) AS similarity
        FROM "UserProfileEmbedding" upe
        JOIN "ProductEmbedding" pe ON true
        JOIN "Product" p ON p.id = pe."productId"
        WHERE upe."userId" = $1
        ORDER BY pe.embedding <=> upe.embedding
        LIMIT $2
      `,
      userId,
      Math.max(limit * 3, 20)
    ),
  ]);

  if (!user) return [];

  return candidates
    .map((product) => {
      const scoring = scoreRecommendedProduct(product, user, facts);
      const similarity = Number(product.similarity || 0);

      return {
        ...product,
        similarity,
        recommendationScore: similarity + scoring.bonus,
        recommendationReason: scoring.reason,
        recommendationBullets: scoring.bullets,
      };
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

module.exports = {
  getAllProducts,
  getProductById,
  getRecommendedProductsForUser
};
