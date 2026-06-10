require("dotenv").config();

const prisma = require("../src/config/prisma");
const {
  captureSkinAnalysisProfileFacts,
  captureReviewProfileFacts,
} = require("../src/services/user-skin-profile.service");

async function main() {
  let usersUpdated = 0;
  let analysesProcessed = 0;
  let reviewsProcessed = 0;

  const users = await prisma.user.findMany({
    where: {
      skinType: {
        not: null,
      },
    },
    select: {
      id: true,
      skinType: true,
    },
  });

  for (const user of users) {
    if (!user.skinType) continue;

    await prisma.userSkinProfileFact.upsert({
      where: {
        userId_key_value: {
          userId: user.id,
          key: "skin_type",
          value: user.skinType,
        },
      },
      create: {
        userId: user.id,
        key: "skin_type",
        value: user.skinType,
        source: "quiz",
        confidence: 0.9,
        evidence: "Existing User.skinType",
      },
      update: {
        source: "quiz",
        confidence: 0.9,
        evidence: "Existing User.skinType",
      },
    });
    usersUpdated += 1;
  }

  const analyses = await prisma.skinAnalysis.findMany({
    orderBy: { createdAt: "asc" },
  });

  for (const analysis of analyses) {
    await captureSkinAnalysisProfileFacts(analysis.userId, analysis);
    analysesProcessed += 1;
  }

  const reviews = await prisma.review.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const review of reviews) {
    await captureReviewProfileFacts(review.userId, review.reviewText, review.product);
    reviewsProcessed += 1;
  }

  console.log(
    `Backfill complete: ${usersUpdated} quiz skin types, ${analysesProcessed} skin analyses, ${reviewsProcessed} reviews processed.`
  );
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
