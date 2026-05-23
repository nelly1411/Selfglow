const prisma = require("../config/prisma");

async function createReview(data) {
    try {
        return await prisma.review.create({
            data: {
                userId: data.userId,
                productId: data.productId,
                rating: data.rating,
                reviewText: data.reviewText,
            },
        });
    } catch (error) {
        //user can only send one review per product
        if (error.code === "P2002") {
            return null;
        }
        throw error;
    }
}

async function getReviewsByProductId(productId){
    return prisma.review.findMany({
        where: {productId},
        include: {
            user: {
                select:{id: true, name: true},
            },
        },
        orderBy: {createdAt: "desc"},
    });
}

async function getReviewsByUserId(userId) {
    return prisma.review.findMany({
        where: {userId},
        orderBy: {createdAt: "desc"},
    });
}

/*average Rating of product, 
can be an average of many ratings or 0 for no reviews*/
async function getRatingByProductId(productId) {
    const result = await prisma.review.aggregate({
        where: {productId},
        _avg: {rating: true},
        _count: {rating: true},
    });
    
    return {
        average: result._avg.rating || 0,
        count: result._count.rating,
    };
}

async function deleteReview(reviewId, userId) {
    const review = await prisma.review.findUnique({
        where: {id: reviewId},
    });

    if (!review) 
        return null;
    if (review.userId !== userId) 
        return "unauthorized action";

    return prisma.review.delete({
        where: {id: reviewId},
    });
}

module.exports = {
    createReview,
    getReviewsByProductId,
    getReviewsByUserId,
    getRatingByProductId,
    deleteReview,
};