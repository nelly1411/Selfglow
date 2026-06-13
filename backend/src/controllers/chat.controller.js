const chatService = require("../services/chat.service");
const prisma = require("../config/prisma");
const {
  captureUserSkinProfileFromMessage,
  getUserSkinProfileFacts,
} = require("../services/user-skin-profile.service");

const { refreshUserProfileEmbedding } = require("../services/user-profile-embedding.service");

function parseStoredJson(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getUserProfileContext(userId) {
  if (!userId) return null;

  const [user, latestAnalysis, profileFacts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        skinType: true,
        gender: true,
      },
    }),
    prisma.skinAnalysis.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    getUserSkinProfileFacts(userId),
  ]);

  if (!user && !latestAnalysis) return null;

  return {
    skinTypeFromQuiz: user?.skinType || null,
    gender: user?.gender || null,
    facts: profileFacts.map((fact) => ({
      key: fact.key,
      value: fact.value,
      confidence: fact.confidence,
      source: fact.source,
      updatedAt: fact.updatedAt,
    })),
    latestSkinAnalysis: latestAnalysis
      ? {
          skinType: latestAnalysis.skinType,
          dryness: latestAnalysis.dryness,
          redness: latestAnalysis.redness,
          blemishes: latestAnalysis.blemishes,
          sensitivity: latestAnalysis.sensitivity,
          overall: latestAnalysis.overall,
          tips: parseStoredJson(latestAnalysis.tips, []),
          createdAt: latestAnalysis.createdAt,
        }
      : null,
  };
}

async function createChatResponse(req, res) {
  try {
    const { message, history, contextProductIds, weather } = req.body;

    if (!message || typeof message !== "string" || message.trim().length < 1) {
      return res.status(400).json({ message: "Message is required" });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string"
          )
          .slice(-4)
      : [];

    const safeContextProductIds = Array.isArray(contextProductIds)
      ? contextProductIds
          .map((productId) => Number(productId))
          .filter((productId) => Number.isInteger(productId))
          .slice(-3)
      : [];

    const safeWeather = weather && typeof weather === "object" ? weather : null;
    const capturedProfile = await captureUserSkinProfileFromMessage(req.user?.userId, message);
    if (capturedProfile.facts.length > 0 || capturedProfile.skinType) {
      await refreshUserProfileEmbedding(req.user.userId);
    }
    const userProfile = await getUserProfileContext(req.user?.userId);

    const response = await chatService.createChatResponse(
      message,
      safeHistory,
      safeContextProductIds,
      safeWeather,
      userProfile
    );
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to create chat response:", error);
    res.status(500).json({ message: "Failed to create chat response" });
  }
}

function writeStreamEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function createChatResponseStream(req, res) {
  try {
    const { message, history, contextProductIds, weather } = req.body;

    if (!message || typeof message !== "string" || message.trim().length < 1) {
      return res.status(400).json({ message: "Message is required" });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string"
          )
          .slice(-4)
      : [];

    const safeContextProductIds = Array.isArray(contextProductIds)
      ? contextProductIds
          .map((productId) => Number(productId))
          .filter((productId) => Number.isInteger(productId))
          .slice(-3)
      : [];

    const safeWeather = weather && typeof weather === "object" ? weather : null;
    const capturedProfile = await captureUserSkinProfileFromMessage(req.user?.userId, message);
    if (capturedProfile.facts.length > 0 || capturedProfile.skinType) {
      await refreshUserProfileEmbedding(req.user.userId);
    }
    const userProfile = await getUserProfileContext(req.user?.userId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const response = await chatService.createChatResponseStream(
      message,
      safeHistory,
      safeContextProductIds,
      (text) => writeStreamEvent(res, "delta", { text }),
      safeWeather,
      userProfile
    );

    writeStreamEvent(res, "done", response);
    res.end();
  } catch (error) {
    console.error("Failed to stream chat response:", error);

    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to stream chat response" });
    }

    writeStreamEvent(res, "error", { message: "Failed to stream chat response" });
    res.end();
  }
}

async function explainProducts(req, res) {
  try {
    const { productIds, message } = req.body;

    if (
      !Array.isArray(productIds) ||
      productIds.length === 0 ||
      productIds.some((productId) => !Number.isInteger(Number(productId)))
    ) {
      return res.status(400).json({ message: "Product IDs are required" });
    }

    const response = await chatService.createProductExplanation(
      productIds.map((productId) => Number(productId)),
      typeof message === "string" ? message : ""
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to explain products:", error);
    res.status(500).json({ message: "Failed to explain products" });
  }
}

module.exports = {
  createChatResponse,
  createChatResponseStream,
  explainProducts,
};
