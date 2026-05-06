const productService = require("../services/product.service");

async function getAllProducts(req, res) {
  try {
    const products = await productService.getAllProducts(req.query);
    res.status(200).json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
}

async function getProductById(req, res) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
};