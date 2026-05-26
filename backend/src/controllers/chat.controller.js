const chatService = require("../services/chat.service");

async function createChatResponse(req, res) {
  try {
    const { message, history, contextProductIds } = req.body;

    // The chatbot only needs one required input: the customer's free-text question.
    // Keeping validation here protects the service from empty prompts and gives the
    // frontend a predictable 400 response for invalid requests.
    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return res.status(400).json({ message: "Message is required" });
    }

    // The service owns the full keyword RAG flow: keyword extraction, product
    // retrieval, optional model generation, and fallback answer creation.
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

    const response = await chatService.createChatResponse(
      message,
      safeHistory,
      safeContextProductIds
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
    const { message, history, contextProductIds } = req.body;

    if (!message || typeof message !== "string" || message.trim().length < 2) {
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

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const response = await chatService.createChatResponseStream(
      message,
      safeHistory,
      safeContextProductIds,
      (text) => writeStreamEvent(res, "delta", { text })
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
