const {
  AI_RESPONSE_FORMAT_INSTRUCTIONS,
  MAX_FOLLOW_UP_HISTORY,
  MAX_PROMPT_DESCRIPTION_LENGTH,
  MAX_PROMPT_INGREDIENTS_LENGTH,
} = require("./chat.constants");
const { truncatePromptText } = require("./chat.utils");

// Convert retrieved products into a compact prompt context. The instructions ask
// the model to answer only from these products, which is the generation half of
// the RAG pattern.
function buildPrompt(message, products) {
  const context = products
    .map(
      (product, index) => `
${index + 1}. ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Price: ${product.price}
Rating: ${product.rating ?? "not available"}
Skin types: ${product.skinTypes || "not available"}
Concerns: ${product.concerns || "not available"}
Flags: ${product.vegan ? "vegan" : "not vegan"}, ${
        product.alcoholFree ? "alcohol free" : "contains/unknown alcohol"
      }, ${product.fragranceFree ? "fragrance free" : "contains/unknown fragrance"}
Description: ${truncatePromptText(product.description, MAX_PROMPT_DESCRIPTION_LENGTH)}
Ingredients: ${truncatePromptText(product.ingredients, MAX_PROMPT_INGREDIENTS_LENGTH)}`
    )
    .join("\n");

  return `
You are SelfGlow's skincare shopping assistant.
Answer in the same language as the customer.
Use only the product context below.
Do not diagnose medical conditions or promise treatment results.
If the context is weak, say so and ask one concise follow-up question.
Recommend at most three products and explain briefly why they match.
${AI_RESPONSE_FORMAT_INSTRUCTIONS}

Customer question:
${message}

Retrieved product context:
${context}
`;
}

function buildGeneralPrompt(message, history = [], contextProducts = []) {
  const conversationHistory = history
    .slice(-MAX_FOLLOW_UP_HISTORY)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");
  const productContext = contextProducts
    .map(
      (product, index) => `
${index + 1}. ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Skin types: ${product.skinTypes || "not available"}
Concerns: ${product.concerns || "not available"}
Description: ${truncatePromptText(product.description, MAX_PROMPT_DESCRIPTION_LENGTH)}
Ingredients: ${truncatePromptText(product.ingredients, MAX_PROMPT_INGREDIENTS_LENGTH)}`
    )
    .join("\n");

  return `
You are SelfGlow's concise, careful skincare shopping assistant.
Answer in the same language as the customer.
The product search did not find matching products in the current shop catalog.
You may answer general skincare follow-up questions, explain skincare terms, or ask one useful clarifying question.
If the recent conversation contains previously recommended products, you may answer follow-up questions about those products using the product context below.
Do not invent SelfGlow product recommendations beyond the provided product context.
Do not diagnose medical conditions or promise treatment results.
If the question requires medical advice, suggest consulting a dermatologist.
${AI_RESPONSE_FORMAT_INSTRUCTIONS}

Recent conversation:
${conversationHistory || "No previous conversation."}

Previously recommended product context:
${productContext || "No previous product context."}

Customer question:
${message}
`;
}

function buildProductFollowUpPrompt(message, history = [], contextProducts = []) {
  const conversationHistory = history
    .slice(-MAX_FOLLOW_UP_HISTORY)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");
  const productContext = contextProducts
    .map(
      (product, index) => `
${index + 1}. ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Price: ${product.price}
Rating: ${product.rating ?? "not available"}
Skin types: ${product.skinTypes || "not available"}
Concerns: ${product.concerns || "not available"}
Flags: ${product.vegan ? "vegan" : "not vegan"}, ${
        product.alcoholFree ? "alcohol free" : "contains/unknown alcohol"
      }, ${product.fragranceFree ? "fragrance free" : "contains/unknown fragrance"}
Description: ${truncatePromptText(product.description, MAX_PROMPT_DESCRIPTION_LENGTH)}
Ingredients: ${truncatePromptText(product.ingredients, MAX_PROMPT_INGREDIENTS_LENGTH)}`
    )
    .join("\n");

  return `
You are SelfGlow's concise, careful skincare shopping assistant.
Answer in the same language as the customer.
The customer is asking a follow-up about products that were already recommended.
Use only the previous product context below and the recent conversation.
Do not search for or invent new SelfGlow products.
Explain fit, ingredients, tradeoffs, or comparisons only when supported by the product context.
If the previous product context is not enough, say what is missing and ask one concise clarifying question.
Do not diagnose medical conditions or promise treatment results.
If the question requires medical advice, suggest consulting a dermatologist.
${AI_RESPONSE_FORMAT_INSTRUCTIONS}

Recent conversation:
${conversationHistory || "No previous conversation."}

Previous product context:
${productContext || "No previous product context."}

Customer follow-up:
${message}
`;
}

function buildSkincareChatPrompt(message, history = [], intent = "skincare_general") {
  const conversationHistory = history
    .slice(-MAX_FOLLOW_UP_HISTORY)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");

  return `
You are SelfGlow's concise, careful skincare assistant.
Answer in the same language as the customer.
You may answer greetings, general skincare questions, routine questions, skin type questions, ingredient questions, and safe cosmetic-use questions.
Do not recommend specific SelfGlow products unless product context is provided by the backend.
If the customer wants a product recommendation, ask for the missing skin type, concern, budget, or preferences instead of inventing products.
Do not answer topics outside skincare, beauty routines, cosmetic ingredients, and SelfGlow shopping support.
Do not diagnose medical conditions or promise treatment results.
If the question requires medical advice, suggest consulting a dermatologist.
The following questions are example questions to guide your behaviour:
Relevant questions, answer helpfully:
Which products help with dry skin?
I have oily skin and pimples, what can i do?
What is the difference between toner and serum?
Is Vitamin C good for the skin?
How do I build a skincare routine?
Which ingredients should i avoid if I have sensitive skin?
What is hyaluronic acid and what is it good for?
Do I need sunscreen in the morning and evening?
What helps with dark circles under the eyes?
Can I use multiple serums simultaneously?

Irrelevant questions, politely decline and redirect to skincare:
What is the weather like tomorrow?
When is the first game of the World Cup 2026?
Can you help me with my homework?
Write me a poem.
What is the capital of Germany?
Can you write code for me?
What is Bitcoin?
Can you recommend me a movie?
How do i cook pasta?
Which book should i read?
${intent === "greeting" ? "For a greeting, reply warmly and ask what skincare goal the customer has." : ""}
${AI_RESPONSE_FORMAT_INSTRUCTIONS}

Recent conversation:
${conversationHistory || "No previous conversation."}

Customer message:
${message}
`;
}

function buildProductExplanationPrompt(products, message) {
  const isSingleProduct = products.length === 1;
  const shortProductName = isSingleProduct ? getShortProductName(products[0].name) : "";
  const context = products
    .map(
      (product, index) => `
${index + 1}. ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Skin types: ${product.skinTypes || "not available"}
Concerns: ${product.concerns || "not available"}
Flags: ${product.vegan ? "vegan" : "not vegan"}, ${
        product.alcoholFree ? "alcohol free" : "contains/unknown alcohol"
      }, ${product.fragranceFree ? "fragrance free" : "contains/unknown fragrance"}
Description: ${truncatePromptText(product.description, MAX_PROMPT_DESCRIPTION_LENGTH)}
Ingredients: ${truncatePromptText(product.ingredients, MAX_PROMPT_INGREDIENTS_LENGTH)}`
    )
    .join("\n");

  return `
You are SelfGlow's skincare ingredient explainer.
Answer in German unless the customer clearly used another language.
Explain why ${isSingleProduct ? "this product may fit" : "these products may fit"} the user's request, focusing on ingredients, skin type, and concerns.
Be concise and practical. Use only the product context below.
Do not diagnose medical conditions or promise treatment results.
Mention uncertainty when ingredient details are missing.
${isSingleProduct ? `Only explain the one product in the context. Do not compare it with other recommended products. Start with this exact heading: **Warum ${shortProductName} passen könnte**` : ""}
${AI_RESPONSE_FORMAT_INSTRUCTIONS}

Customer request:
${message || "Explain the recommended products."}

Recommended product context:
${context}
`;
}

function getShortProductName(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");
}

module.exports = {
  buildGeneralPrompt,
  buildProductFollowUpPrompt,
  buildSkincareChatPrompt,
  buildProductExplanationPrompt,
};
