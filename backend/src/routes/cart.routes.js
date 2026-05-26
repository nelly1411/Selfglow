const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  getCart,
  addToCart,
  updateCartItemQuantity,
  updateCartItemSelected,
  removeFromCart,
  clearCart,
  syncCart,
} = require("../controllers/cart.controller");

const router = express.Router();

router.get("/", authMiddleware, getCart);

router.post("/items/:productId", authMiddleware, addToCart);

router.patch("/items/:productId/quantity", authMiddleware, updateCartItemQuantity);

router.patch("/items/:productId/selected", authMiddleware, updateCartItemSelected);

router.delete("/items/:productId", authMiddleware, removeFromCart);

router.delete("/", authMiddleware, clearCart);

router.post("/sync", authMiddleware, syncCart);
module.exports = router;