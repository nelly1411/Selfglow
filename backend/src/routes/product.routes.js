const express = require("express")
const productController = require("../controllers/product.controller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router()

router.get("/", productController.getAllProducts)
router.get("/recommendations/me", authMiddleware, productController.getMyRecommendations)
router.post("/:id/explain", productController.explainProduct)
router.post("/:id/fit", authMiddleware, productController.assessProductFit)
router.get("/:id", productController.getProductById)

module.exports = router
