const {
  CHAT_DECISION_FALLBACK,
  CHAT_TURN_PLAN_FALLBACK,
  PRODUCT_SEARCH_INTENT_FALLBACK,
  PRODUCT_CATEGORIES,
  SKIN_TYPE_VALUES,
  CONCERN_VALUES,
  MAX_FOLLOW_UP_HISTORY,
} = require("./chat.constants");
const { normalizeText } = require("./chat.utils");
const { requestOpenAI } = require("./chat-openai.service");
const { parseProductSearchIntentJson } = require("./chat-product-retrieval.service");

function buildDecisionProductContext(products = []) {
  if (!products.length) {
    return "No previous product context.";
  }

  return products
    .map(
      (product, index) =>
        `${index + 1}. ${product.name} (${product.brand}, ${product.category})`
    )
    .join("\n");
}

function parseChatTurnPlanJson(rawPlan, message) {
  try {
    const jsonText = rawPlan.match(/\{[\s\S]*\}/)?.[0] || rawPlan;
    const parsedPlan = JSON.parse(jsonText);
    const allowedIntents = new Set([
      "product_search",
      "product_follow_up",
      "skincare_general",
      "greeting",
      "off_topic",
    ]);
    const intent = allowedIntents.has(parsedPlan.intent)
      ? parsedPlan.intent
      : inferChatIntentLocally(message).intent;
    const productSearch =
      parsedPlan.productSearch && typeof parsedPlan.productSearch === "object"
        ? parseProductSearchIntentJson(JSON.stringify(parsedPlan.productSearch))
        : { ...PRODUCT_SEARCH_INTENT_FALLBACK };

    return {
      intent,
      productSearch,
    };
  } catch {
    return {
      ...CHAT_TURN_PLAN_FALLBACK,
      intent: inferChatIntentLocally(message).intent,
    };
  }
}

function buildChatTurnPlanPrompt(message, history = [], contextProducts = []) {
  const conversationHistory = history
    .slice(-MAX_FOLLOW_UP_HISTORY)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");

  return `
Plan the next SelfGlow skincare chat turn from the full context.
Return only valid JSON. Do not answer the customer.

Allowed intent values:
- product_search: the customer wants new product recommendations, a different product type, replacement products, shopping help, or a routine with products.
- product_follow_up: the customer asks about previous recommended products without asking to change or replace them.
- skincare_general: the customer asks general skincare, routine, skin type, or ingredient questions without asking for concrete SelfGlow products.
- greeting: the customer only greets, thanks, or starts small talk in a skincare assistant context.
- off_topic: the customer asks about anything outside skincare, beauty routines, cosmetic ingredients, or SelfGlow shopping support.

Allowed productCategory values:
${PRODUCT_CATEGORIES.join(", ")}

Allowed skinTypes values:
${SKIN_TYPE_VALUES.join(", ")}

Allowed concerns values:
${CONCERN_VALUES.join(", ")}

Planning rules:
- Use the current customer message as the main instruction and use history/previous products only as context.
- If the customer asks for a new or different product, choose product_search even when previous products exist.
- If the customer rejects a product type, put that type in productSearch.excludedProductCategories.
- If the customer only says what they do not want and gives no positive product need, productSearch.hasPositiveProductIntent must be false.
- For routine requests, keep productSearch.productCategory null unless the customer explicitly asks for one single product category.
- For routine requests, use query_de/query_en and preferences to describe the routine goal instead of forcing one category.
- For routine requests, include likely routine steps in query_de/query_en, such as cleanser, serum, moisturizer, sunscreen, unless the customer rejected a step.
- For product_search, productSearch.query_de and productSearch.query_en must contain only positive retrieval terms and must omit rejected product types.
- Do not use previous product context as product_search results; it is only context for deciding intent.
- Map customer language to the fixed taxonomy; do not invent category, skin type, or concern values.
- Use categoryConfidence at least 0.75 only when the requested product type is explicit.
- productSearch.booleanFilters may set vegan, alcoholFree, or fragranceFree to true only when explicitly requested.
- productSearch.spf is a number only when a specific SPF/LSF value is requested, otherwise null.
- productSearch.pricePreference is "cheap" only when the customer asks for budget/affordable products, otherwise null.

Recent conversation:
${conversationHistory || "No previous conversation."}

Previous product context:
${buildDecisionProductContext(contextProducts)}

Current customer message:
${message}

JSON shape:
{
  "intent": "one allowed intent",
  "productSearch": {
    "language": "detected ISO-like language code",
    "productCategory": "one allowed productCategory or null",
    "categoryConfidence": 0.0,
    "hasPositiveProductIntent": false,
    "excludedProductCategories": [],
    "booleanFilters": {
      "vegan": false,
      "alcoholFree": false,
      "fragranceFree": false
    },
    "spf": null,
    "pricePreference": null,
    "skinTypes": [],
    "concerns": [],
    "ingredients": [],
    "preferences": [],
    "query_de": "",
    "query_en": ""
  }
}
`;
}

async function planChatTurn(message, history = [], contextProducts = []) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ...CHAT_TURN_PLAN_FALLBACK,
      intent: inferChatIntentLocally(message).intent,
    };
  }

  const rawPlan = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "You plan ecommerce skincare chat actions and retrieval filters. Return only valid JSON.",
      },
      {
        role: "user",
        content: buildChatTurnPlanPrompt(message, history, contextProducts),
      },
    ],
    JSON.stringify(CHAT_TURN_PLAN_FALLBACK),
    {
      maxOutputTokens: 650,
    }
  );

  return parseChatTurnPlanJson(rawPlan, message);
}

function inferChatIntentLocally(message) {
  const normalizedMessage = normalizeText(message);

  if (/^(hi|hello|hey|hallo|servus|moin|guten tag|guten morgen|guten abend|danke|thanks)\b/.test(normalizedMessage)) {
    return { intent: "greeting" };
  }

  if (/\b(product|products|produkt|produkte|recommend|empfehl|routine|buy|kaufen|suche|finde|which|welche|welcher|welches)\b/.test(normalizedMessage)) {
    return { intent: "product_search" };
  }

  return CHAT_DECISION_FALLBACK;
}

module.exports = {
  planChatTurn,
};
