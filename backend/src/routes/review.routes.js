const express = require("express");
const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

//public (no login required)
router.get("/product/:productId", reviewController.getReviewsByProductId);
router.get("/product/:productId/average", reviewController.getRatingByProductId);

//protected (login required)
router.post("/", authMiddleware, reviewController.createReview);
router.get("/user/my-reviews", authMiddleware, reviewController.getReviewsByUserId);
router.delete("/:reviewId", authMiddleware, reviewController.deleteReview);

module.exports = router;