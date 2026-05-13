const prisma = require("../config/prisma");

function toBool(value) {
  return String(value).trim().toLowerCase() === "true";
}

async function getAllProducts(query) {
  const where = {};

  if (query.category) {
    where.category = query.category;
  }

  if (query.skinType) {
    where.skinTypes = {
      contains: query.skinType,
      mode: "insensitive",
    };
  }

  if (query.concern) {
    where.concerns = {
      contains: query.concern,
      mode: "insensitive",
    };
  }

  if (query.vegan !== undefined) {
    where.vegan = toBool(query.vegan);
  }

  if (query.alcoholFree !== undefined) {
    where.alcoholFree = toBool(query.alcoholFree);
  }

  if (query.fragranceFree !== undefined) {
    where.fragranceFree = toBool(query.fragranceFree);
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { brand: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
    ];
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