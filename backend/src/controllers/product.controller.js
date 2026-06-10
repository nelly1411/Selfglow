const productService = require("../services/product.service");
const productAiService = require("../services/product-ai.service");

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

async function explainProduct(req, res) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const explanation = await productAiService.explainProduct(id);

    if (!explanation) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(explanation);
  } catch (error) {
    console.error("Failed to explain product:", error);
    res.status(500).json({ message: "Failed to explain product" });
  }
}

async function assessProductFit(req, res) {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const assessment = await productAiService.assessProductFit(id, req.user.userId);

    if (!assessment) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(assessment);
  } catch (error) {
    console.error("Failed to assess product fit:", error);
    res.status(500).json({ message: "Failed to assess product fit" });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  explainProduct,
  assessProductFit,
};
