const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Warenkorb eines Users holen oder erstellen
async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  return cart;
}

// Produkt zum Warenkorb hinzufügen
async function addToCart(userId, productId) {
  const cart = await getOrCreateCart(userId);

  return prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
    update: {
      quantity: {
        increment: 1,
      },
      selected: true,
    },
    create: {
      cartId: cart.id,
      productId,
      quantity: 1,
      selected: true,
    },
    include: {
      product: true,
    },
  });
}

// Menge eines Produkts im Warenkorb ändern
async function updateCartItemQuantity(userId, productId, quantity) {
  const cart = await getOrCreateCart(userId);

  if (quantity < 1) {
    quantity = 1;
  }

  return prisma.cartItem.update({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
    data: {
      quantity,
    },
    include: {
      product: true,
    },
  });
}

// Produkt aus dem Warenkorb entfernen
async function removeFromCart(userId, productId) {
  const cart = await getOrCreateCart(userId);

  return prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      productId,
    },
  });
}

// Gesamten Warenkorb leeren
async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);

  return prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
    },
  });
}

// Auswahlstatus eines Produkts im Warenkorb ändern
async function updateCartItemSelected(userId, productId, selected) {
  const cart = await getOrCreateCart(userId);

  return prisma.cartItem.update({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
    data: {
      selected,
    },
    include: {
      product: true,
    },
  });
}

// Lokalen Warenkorb nach Login mit Backend synchronisieren
async function syncCart(userId, items) {
  const cart = await getOrCreateCart(userId);

  for (const item of items) {
    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: item.productId,
        },
      },
      update: {
        quantity: {
          increment: item.quantity,
        },
        selected: item.selected,
      },
      create: {
        cartId: cart.id,
        productId: item.productId,
        quantity: item.quantity,
        selected: item.selected,
      },
    });
  }

  return prisma.cart.findUnique({
    where: {
      userId,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

module.exports = {
  getOrCreateCart,
  addToCart,
  updateCartItemQuantity,
  updateCartItemSelected,
  removeFromCart,
  clearCart,
  syncCart,
};