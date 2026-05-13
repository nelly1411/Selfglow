const wishlistService = require("../services/wishlist.service");

async function getWishlist(req, res) {
  try {
    const userId =  req.userId;

    const wishlistItems = await wishlistService.getWishlistByUserId(userId);

    res.status(200).json(wishlistItems);
  } catch (error) {
    console.error("Failed to fetch wishlist:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
}

async function addToWishlist(req, res) {
  try {
    const userId =  req.userId; 
    const productId = Number(req.params.productId);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const wishlistItem = await wishlistService.addToWishlist(userId, productId);

    res.status(201).json(wishlistItem);
  } catch (error) {
    console.error("Failed to add to wishlist:", error);
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
}

async function removeFromWishlist(req, res) {
  try {
    const userId =  req.userId; 
    const productId = Number(req.params.productId);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    await wishlistService.removeFromWishlist(userId, productId);

    res.status(204).send();
  } catch (error) {
    console.error("Failed to remove from wishlist:", error);
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
}

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};