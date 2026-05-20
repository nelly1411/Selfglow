const prisma = require("../config/prisma");

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

module.exports = {
  getAllProducts,
  getProductById,
};