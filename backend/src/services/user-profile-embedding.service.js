const crypto = require("node:crypto");
const prisma = require("../config/prisma");
const { EMBEDDING_MODEL, createEmbedding } = require("./embedding.service");
const { getUserSkinProfileFacts } = require("./user-skin-profile.service");

function compact(value, max = 500) {
  if (!value) return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function groupFacts(facts) {
  return facts.reduce((acc, fact) => {
    if (!acc[fact.key]) acc[fact.key] = [];
    acc[fact.key].push(fact.value);
    return acc;
  }, {});
}

function buildUserProfileEmbeddingText(user, latestAnalysis, facts) {
  const grouped = groupFacts(facts);

  return [
    "User skincare profile",
    "",
    `Gender: ${user.gender || "unknown"}`,
    `Skin type from quiz: ${user.skinType || "unknown"}`,
    "",
    latestAnalysis
      ? [
          "Latest skin analysis:",
          `Skin type: ${latestAnalysis.skinType || "unknown"}`,
          `Dryness: ${latestAnalysis.dryness}/100`,
          `Redness: ${latestAnalysis.redness}/100`,
          `Blemishes: ${latestAnalysis.blemishes}/100`,
          `Sensitivity: ${latestAnalysis.sensitivity}/100`,
          `Summary: ${compact(latestAnalysis.overall)}`,
        ].join("\n")
      : "Latest skin analysis: none",
    "",
    "Profile facts:",
    `Concerns: ${(grouped.concern || []).join(", ") || "none"}`,
    `Skin states: ${(grouped.skin_state || []).join(", ") || "none"}`,
    `Sensitivity: ${(grouped.sensitivity || []).join(", ") || "none"}`,
    `Ingredient avoidances: ${(grouped.ingredient_avoidance || []).join(", ") || "none"}`,
    `Allergies: ${(grouped.allergy || []).join(", ") || "none"}`,
    `Product reactions: ${(grouped.product_reaction || []).join(", ") || "none"}`,
    `Preferences: ${(grouped.preference || []).join(", ") || "none"}`,
    `Goals: ${(grouped.goal || []).join(", ") || "none"}`,
  ].join("\n");
}

function getContentHash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function upsertUserProfileEmbedding(userId, content, embedding, contentHash) {
  const vector = `[${embedding.map(Number).join(",")}]`;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "UserProfileEmbedding"
        ("userId", "content", "model", "embedding", "contentHash", "updatedAt")
      VALUES ($1, $2, $3, $4::vector, $5, NOW())
      ON CONFLICT ("userId")
      DO UPDATE SET
        "content" = EXCLUDED."content",
        "model" = EXCLUDED."model",
        "embedding" = EXCLUDED."embedding",
        "contentHash" = EXCLUDED."contentHash",
        "updatedAt" = NOW()
    `,
    userId,
    content,
    EMBEDDING_MODEL,
    vector,
    contentHash
  );
}

async function refreshUserProfileEmbedding(userId) {
  const [user, latestAnalysis, facts, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, gender: true, skinType: true },
    }),
    prisma.skinAnalysis.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    getUserSkinProfileFacts(userId),
    prisma.userProfileEmbedding.findUnique({
      where: { userId },
    }),
  ]);

  if (!user) return null;

  const content = buildUserProfileEmbeddingText(user, latestAnalysis, facts);
  const contentHash = getContentHash(content);

  if (existing && existing.contentHash === contentHash) {
    return existing;
  }

  const embedding = await createEmbedding(content);
  await upsertUserProfileEmbedding(userId, content, embedding, contentHash);

  return prisma.userProfileEmbedding.findUnique({
    where: { userId },
  });
}

module.exports = {
  buildUserProfileEmbeddingText,
  refreshUserProfileEmbedding,
};