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

//Review statistics for shop page
    async function attachReviewStats(products) {
      const productIds = products.map((p) => p.id);

      const reviewStats = await prisma.review.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds } },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const statsMap = new Map(
        reviewStats.map((s) => [s.productId, {average: s._avg.rating || 0, count: s._count.rating}])
      );

      return products.map((p) => ({
        ...p,
        reviewAverage: statsMap.get(p.id)?.average ?? 0,
        reviewCount: statsMap.get(p.id)?.count ?? 0,
      }));
    }

async function rankProductsForUser(products, userId) {
  if (!userId || products.length === 0) return products;

  try {
    await refreshUserProfileEmbedding(userId);
  } catch (err) {
    console.error("User profile embedding refresh failed:", err.message);
  }

  const [user, facts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, skinType: true, gender: true },
    }),
    getUserSkinProfileFacts(userId),
  ]);

  if (!user) return products;

  const productIds = products.map((product) => product.id);
  const similarityMap = new Map();

  try {
    const rows = await prisma.$queryRawUnsafe(
      `
        SELECT
          p.id,
          CASE
            WHEN pe.embedding IS NOT NULL AND upe.embedding IS NOT NULL
              THEN 1 - (pe.embedding <=> upe.embedding)
            ELSE 0
          END AS similarity
        FROM "Product" p
        LEFT JOIN "UserProfileEmbedding" upe ON upe."userId" = $1
        LEFT JOIN "ProductEmbedding" pe ON pe."productId" = p.id
        WHERE p.id = ANY($2::int[])
      `,
      userId,
      productIds
    );

    rows.forEach((row) => {
      similarityMap.set(row.id, Number(row.similarity || 0));
    });
  } catch (err) {
    console.error("Product similarity ranking failed:", err.message);
  }

  return products
    .map((product) => {
      const scoring = scoreRecommendedProduct(product, user, facts);
      const similarity = similarityMap.get(product.id) || 0;
      const recommendationScore = similarity + scoring.bonus;

      return {
        ...product,
        similarity,
        targetGenderRank: getTargetGenderRank(product, user),
        recommendationScore,
        recommendationReason: scoring.reason,
        recommendationBullets: scoring.bullets,
      };
    })
    .sort((a, b) => {
      if (a.targetGenderRank !== b.targetGenderRank) {
        return a.targetGenderRank - b.targetGenderRank;
      }

      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }

      return a.name.localeCompare(b.name, "de");
    });
}

async function getAllProducts(query, options = {}) {
  const where = {
    AND: [],
  };

  const categories = toArray(query.category);
  const skinTypes = toArray(query.skinType);
  const concerns = toArray(query.concern);

  const useEmbedding = isSemanticQuery(query.search);
  const useRelevanceSort = query.sort === "relevance" && options.userId;

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

  //if there is no intelligent search, then query with filters
  if (!query.search) {
    const celanWhere = {...where};
    if (celanWhere.AND.length === 0) delete celanWhere.AND;

    const products = await prisma.product.findMany({
      where: celanWhere,
      orderBy: { name: "asc" },
    });
    const rankedProducts = useRelevanceSort
      ? await rankProductsForUser(products, options.userId)
      : products;

    return attachReviewStats(rankedProducts);
  }

  //intelligent search: keyword + embedding
  const keywordWhere = {
    AND: [
      ...where.AND,
      {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { brand: { contains: query.search, mode: "insensitive" } },
          { ingredients: { contains: query.search, mode: "insensitive" } },
        ],
      },
    ],
  };

  let keywordResults = [];
  let embeddingResults = [];

  try {
    keywordResults = await prisma.product.findMany({
      where: keywordWhere,
      orderBy: { name: "asc" },
    });
  } catch (err) {
    console.error("Keyword search failed: ", err.message);
  }

  try {
    const MIN_SIMILARITY = 0.35;
    const rawEmbedding = await searchByEmbedding(prisma, query.search, 60);
    const relevant = rawEmbedding.filter((p) => Number(p.similarity) >= MIN_SIMILARITY);

    if (relevant.length > 0) {
      const embeddingIds = relevant.map((p) => p.id);
      const hasFilters = where.AND.length > 0;

      embeddingResults = await prisma.product.findMany({
        where: hasFilters? {...where, id: {in: embeddingIds} }
        : { id: {in: embeddingIds} },
        orderBy: { name: "asc" },
      });
    }
  } catch (err) {
    console.error("Embedding search failed: ", err.message);
  }

const merged = new Map();
for (const p of keywordResults) merged.set(p.id, {...p, _semantic: false});
for (const p of embeddingResults) {
  if (!merged.has(p.id)) merged.set(p.id, {...p, _semantic: true});
}

const finalProducts = Array.from(merged.values()).sort((a, b) =>
  a.name.localeCompare(b.name, "de")
);

  const rankedProducts = useRelevanceSort
    ? await rankProductsForUser(finalProducts, options.userId)
    : finalProducts;

  return attachReviewStats(rankedProducts);
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

function isMaleTargetedProduct(product) {
  const targetGender = String(product?.targetGender || "unisex").toLowerCase();
  const name = String(product?.name || "");
  const maleProductPattern = /\bmen\b|\bhomme\b|männer|\bmann\b|mencare|barber club|samurai/i;

  return targetGender === "male" || maleProductPattern.test(name);
}

function getTargetGenderRank(product, user) {
  const userGender = String(user?.gender || "").toLowerCase();

  if (userGender === "male") {
    return isMaleTargetedProduct(product) ? 0 : 1;
  }

  return 0;
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
          CASE
            WHEN pe.embedding IS NOT NULL AND upe.embedding IS NOT NULL
              THEN 1 - (pe.embedding <=> upe.embedding)
            ELSE 0
          END AS similarity
        FROM "Product" p
        JOIN "User" u ON u.id = $1
        LEFT JOIN "UserProfileEmbedding" upe ON upe."userId" = u.id
        LEFT JOIN "ProductEmbedding" pe ON pe."productId" = p.id
        ORDER BY
          CASE
            WHEN u.gender = 'male'
              AND (
                p."targetGender" = 'male'
                OR p.name ~* '(^|[^[:alnum:]])(men|homme|mann)([^[:alnum:]]|$)'
                OR p.name ~* '(männer|mencare|barber club|samurai)'
              )
              THEN 0
            WHEN u.gender = 'male' THEN 1
            ELSE 0
          END,
          CASE
            WHEN pe.embedding IS NOT NULL AND upe.embedding IS NOT NULL
              THEN pe.embedding <=> upe.embedding
            ELSE NULL
          END ASC NULLS LAST,
          p.name ASC
        LIMIT $2
      `,
      userId,
      Math.max(limit * 5, 50)
    ),
  ]);

  if (!user) return [];

  return candidates
    .map((product) => {
      const scoring = scoreRecommendedProduct(product, user, facts);
      const similarity = Number(product.similarity || 0);
      const recommendationScore = similarity + scoring.bonus;

      return {
        ...product,
        similarity,
        targetGenderRank: getTargetGenderRank(product, user),
        recommendationScore,
        recommendationReason: scoring.reason,
        recommendationBullets: scoring.bullets,
      };
    })
    .sort((a, b) => {
      if (a.targetGenderRank !== b.targetGenderRank) {
        return a.targetGenderRank - b.targetGenderRank;
      }

      return b.recommendationScore - a.recommendationScore;
    })
    .slice(0, limit);
}

module.exports = {
  getAllProducts,
  getProductById,
  getRecommendedProductsForUser
};
