const chatService = require("../services/chat.service");

async function createChatResponse(req, res) {
  try {
    const { message } = req.body;

    // The chatbot only needs one required input: the customer's free-text question.
    // Keeping validation here protects the service from empty prompts and gives the
    // frontend a predictable 400 response for invalid requests.
    if (!message || typeof message !== "string" || message.trim().length < 2) {
      return res.status(400).json({ message: "Message is required" });
    }

    // The service owns the full keyword RAG flow: keyword extraction, product
    // retrieval, optional model generation, and fallback answer creation.
    const response = await chatService.createChatResponse(message);
    res.status(200).json(response);
  } catch (error) {
    console.error("Failed to create chat response:", error);
    res.status(500).json({ message: "Failed to create chat response" });
  }
}

module.exports = {
  createChatResponse,
};
