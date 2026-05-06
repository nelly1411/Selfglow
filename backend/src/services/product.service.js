const prisma = require("../config/prisma");

async function getAllProducts(query) {
  const where = {};

  if (query.category) {
    where.category = query.category;
  }

  function toBool(value) {
    return String(value).trim().toLowerCase() === "true";
  }

  if (query.vegan !== undefined) {
    where.vegan = query.vegan === "true";
  }

  if (query.alcoholFree !== undefined) {
    where.alcoholFree = query.alcoholFree === "true";
  }

  if (query.fragranceFree !== undefined) {
    where.fragranceFree = query.fragranceFree === "true";
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