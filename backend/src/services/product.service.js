const prisma = require("../config/prisma");
const { refreshUserProfileEmbedding } = require("./user-profile-embedding.service");
const { getUserSkinProfileFacts } = require("./user-skin-profile.service");

function toBool(value) {
  return String(value).trim().toLowerCase() === "true";
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function getAllProducts(query) {
  const where = {
    AND: [],
  };

  const categories = toArray(query.category);
  const skinTypes = toArray(query.skinType);
  const concerns = toArray(query.concern);

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

  if (query.search) {
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

  return prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
  });
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

function scoreRecommendedProduct(product, user, facts) {
  let bonus = 0;
  const reasons = [];

  if (user.skinType && hasTextMatch(product.skinTypes, [user.skinType])) {
    bonus += 0.12;
    reasons.push(`Passt zu deinem Hauttyp: ${user.skinType}`);
  }

  const concerns = facts
    .filter((fact) => fact.key === "concern" || fact.key === "skin_state")
    .map((fact) => fact.value);

  if (concerns.length > 0 && hasTextMatch(product.concerns, concerns)) {
    bonus += 0.1;
    reasons.push("Passt zu deinen Hautbedürfnissen");
  }

  const sensitive = facts.some(
    (fact) => fact.key === "sensitivity" || fact.value === "sensitive"
  );

  if (sensitive && product.fragranceFree) {
    bonus += 0.06;
    reasons.push("Parfümfrei für sensible Haut");
  }

  if (sensitive && product.alcoholFree) {
    bonus += 0.04;
    reasons.push("Alkoholfrei für sensible Haut");
  }

  const avoidances = facts
    .filter((fact) => fact.key === "ingredient_avoidance" || fact.key === "allergy")
    .map((fact) => fact.value);

  const ingredients = normalizeList(product.ingredients);

  for (const avoidance of avoidances) {
    if (ingredients.some((ingredient) => ingredient.includes(String(avoidance).toLowerCase()))) {
      bonus -= 0.3;
      reasons.push(`Achtung: enthält möglicherweise ${avoidance}`);
    }
  }

  return {
    bonus,
    reason: reasons[0] || "Basierend auf deinem Hautprofil empfohlen",
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