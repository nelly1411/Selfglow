const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

//  alle Wishlist-Einträge eines Users + Produktdaten holen

async function getWishlistByUserId(userId) {
  return prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: true,
    },
  });
}

//  Produkt in Merkliste speichern
async function addToWishlist(userId, productId) {
  return prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    update: {},
    create: {
      userId,
      productId,
    },
    include: {
      product: true,
    },
  });
}

//  Produkt aus Merkliste Entfernen
async function removeFromWishlist(userId, productId) {
  return prisma.wishlistItem.deleteMany({
    where: {
      userId,
      productId,
    },
  });
}



module.exports = {
  getWishlistByUserId,
   addToWishlist,
  removeFromWishlist,
};
