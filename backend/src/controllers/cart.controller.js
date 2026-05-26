const cartService = require("../services/cart.service");

// Warenkorb holen
async function getCart(req, res) {
  try {
    const userId = req.userId;

    const cart = await cartService.getOrCreateCart(userId);

    res.status(200).json(cart);
  } catch (error) {
    console.error("Failed to fetch cart:", error);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
}

// Produkt zum Warenkorb hinzufügen
async function addToCart(req, res) {
  try {
    const userId = req.userId;
    const productId = Number(req.params.productId);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const cartItem = await cartService.addToCart(userId, productId);

    res.status(201).json(cartItem);
  } catch (error) {
    console.error("Failed to add item to cart:", error);
    res.status(500).json({ message: "Failed to add item to cart" });
  }
}

// Menge eines Produkts im Warenkorb ändern
async function updateCartItemQuantity(req, res) {
  try {
    const userId = req.userId;
    const productId = Number(req.params.productId);
    const quantity = Number(req.body.quantity);

    if (Number.isNaN(productId) || Number.isNaN(quantity)) {
      return res.status(400).json({ message: "Invalid product id or quantity" });
    }

    const cartItem = await cartService.updateCartItemQuantity(userId, productId, quantity);

    res.status(200).json(cartItem);
  } catch (error) {
    console.error("Failed to update cart item quantity:", error);
    res.status(500).json({ message: "Failed to update cart item quantity" });
  }
}

async function updateCartItemSelected(req, res) {
  try {
    const userId = req.userId;
    const productId = Number(req.params.productId);
    const selected = Boolean(req.body.selected);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const cartItem = await cartService.updateCartItemSelected(userId, productId, selected);

    res.status(200).json(cartItem);
  } catch (error) {
    console.error("Failed to update cart item selected:", error);
    res.status(500).json({ message: "Failed to update cart item selected" });
  }
}

async function removeFromCart(req, res) {
  try {
    const userId = req.userId;
    const productId = Number(req.params.productId);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    await cartService.removeFromCart(userId, productId);

    res.status(204).send();
  } catch (error) {
    console.error("Failed to remove item from cart:", error);
    res.status(500).json({ message: "Failed to remove item from cart" });
  }
}

async function clearCart(req, res) {
  try {
    const userId = req.userId;

    await cartService.clearCart(userId);

    res.status(204).send();
  } catch (error) {
    console.error("Failed to clear cart:", error);
    res.status(500).json({ message: "Failed to clear cart" });
  }
}

async function syncCart(req, res) {
  try {
    const userId = req.userId;
    const items = req.body.items;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Items must be an array" });
    }

    const cart = await cartService.syncCart(userId, items);

    res.status(200).json(cart);
  } catch (error) {
    console.error("Failed to sync cart:", error);
    res.status(500).json({ message: "Failed to sync cart" });
  }
}

module.exports = {
    getCart,
    addToCart,
    updateCartItemQuantity,
    updateCartItemSelected,
    removeFromCart,
    clearCart,
    syncCart,
};