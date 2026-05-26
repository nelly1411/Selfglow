const reviewService = require("../services/review.service");
const prisma = require("../config/prisma");

async function createReview(req, res) {
    try {
        //users can only write a review after making a purchase
        const userId = req.userId;

        const { productId, rating, reviewText } = req.body;

        const orders = await prisma.order.findMany({
            where: {userId}
        });

        const hasPurchased = orders.some(order => {
            try {
                const items = JSON.parse(order.items);
                return items.some((item) => item.id === Number(productId));
            } catch {
                return false;
            }
        });

        if (!hasPurchased) {
            return res.status(403).json({
                message: "Sie können nur Produkte bewerten, die sie gekauft haben."
            });
        }

        if(!productId || !rating || !reviewText) {
            return res.status(400).json({
                message: "productId/rating/reviewText erforderlich!"
            });
        }

        if (rating < 1) {
            return res.status(400).json({
                message: "Die Bewertung muss zwischen 1 und 5 liegen!"
            });
        }
        const review = await reviewService.createReview({
            userId, 
            productId: Number(productId),
            rating: Number(rating),
            reviewText,
        });

        if (!review) {
            return res.status(409).json({
                message: "Sie haben dieses Produkt bereits bewertet!"
            });
        }

        return res.status(201).json(review);

    } catch(error) {
        console.error("createReview error: ", error);
        return res.status(500).json({
            message: "Bewertung konnte nicht erstellt werden"
        });
    }
}

async function getReviewsByProductId(req, res) {
    try {
        const productId = Number(req.params.productId);

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                message: "Ungültige Produkt ID"
            });
        }

        const reviews = await reviewService.getReviewsByProductId(productId);
        return res.status(200).json(reviews);
    } catch (error) {
        console.error("getReviewsByProductId error: ", error);
        return res.status(500).json({
            message: "Failed to fecth reviews"
        });
    }
}

async function getReviewsByUserId(req, res) {
    try {
        const userId = req.userId;

        const reviews = await reviewService.getReviewsByUserId(userId);
        return res.status(200).json(reviews);
    } catch (error) {
        console.error("getReviewsByUserId error: ", error);
        return res.status(500).json({
            message: "Bewertungen konnten nicht aufgerufen werden"
        });
    }
}

async function getRatingByProductId(req, res) {
    try {
        const productId = Number(req.params.productId);

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                message: "Ungültige Produkt-ID"
            });
        }

        const result = await reviewService.getRatingByProductId(productId);
        return res.status(200).json(result);
    } catch(error) {
        console.error("getRatingByProductId error: ", error);
        return res.status(500).json({
            message: "Bewertung konnte nciht abgerufen werden"
        });
    }
}

async function deleteReview(req, res) {
    try {
        const userId = req.userId;
        const reviewId = Number(req.params.reviewId);

        if (Number.isNaN(reviewId)) {
            return res.status(400).json({
                message: "Ungültige Bewertung-ID"
            });
        }

        const result = await reviewService.deleteReview(reviewId, userId);

        if (result === "unauthorized action") {
            return res.status(403).json({
                message: "Nivcht berechtigt, die Bewertung zu löschen."
            });
        }
        return res.status(200).json({
            message: "Bewertung gelöscht"
        });
    } catch (error) {
        console.error("deleteReview error: ", error);
        return res.status(500).json({
            message: "Löschen der Bewertung fehlgeschlagen"
        });
    }
}

module.exports = {
    createReview,
    getReviewsByProductId,
    getReviewsByUserId,
    getRatingByProductId,
    deleteReview,
};