const prisma = require("../../config/prisma");
const {
  MAX_CONTEXT_PRODUCTS,
  MAX_FOLLOW_UP_PRODUCTS,
  PRODUCT_RECOMMENDATION_ANSWER,
  GENERAL_SKINCARE_FALLBACK_ANSWER,
  OFF_TOPIC_ANSWER,
} = require("./chat.constants");
const { requestOpenAI, streamOpenAI } = require("./chat-openai.service");
const {
  buildGeneralPrompt,
  buildProductFollowUpPrompt,
  buildSkincareChatPrompt,
  buildProductExplanationPrompt,
} = require("./chat-prompts.service");
const {
  buildFallbackAnswer,
  retrieveProducts,
  toChatProduct,
} = require("./chat-product-retrieval.service");
const { planChatTurn } = require("./chat-planner.service");
const { selectFinalProducts } = require("./chat-reranker.service");

// Generate the final assistant text. The OpenAI API key stays on the backend, so
// the browser never receives or stores it.
async function createOpenAIAnswer(
  message,
  products,
  history = [],
  contextProducts = []
) {
  if (products.length > 0) {
    return PRODUCT_RECOMMENDATION_ANSWER;
  }

  // This keeps local development possible even before an API key is configured.
  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackAnswer(products);
  }

  return requestOpenAI(
    [
      {
        role: "system",
        content:
          "You are a concise, careful skincare shopping assistant for an ecommerce site.",
      },
      {
        role: "user",
        content: buildGeneralPrompt(message, history, contextProducts),
      },
    ],
    buildFallbackAnswer(products)
  );
}

// Public service method used by the controller. It runs retrieval first, then
// generation, and returns both the written answer and the source products so the
// frontend can render clickable recommendation cards.
async function getContextProducts(productIds) {
  if (!productIds.length) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    take: MAX_FOLLOW_UP_PRODUCTS,
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });

  return products.map((product) => toChatProduct(product));
}

async function createChatResponse(message, history = [], contextProductIds = []) {
  const previousContextProducts =
    contextProductIds.length > 0 && process.env.OPENAI_API_KEY
      ? await getContextProducts(contextProductIds)
      : [];
  const plan = await planChatTurn(message, history, previousContextProducts);
  const decision = { intent: plan.intent };
  const searchIntent = plan.productSearch;

  if (decision.intent === "off_topic") {
    return {
      answer: OFF_TOPIC_ANSWER,
      products: [],
      canExplainProducts: false,
      usedFallback: false,
    };
  }

  if (decision.intent === "product_follow_up") {
    const fallbackAnswer =
      "Ich kann die vorherigen Produkte gerade nicht zuverlässig erklären, weil mir der Produktkontext fehlt.";
    const answer = await requestOpenAI(
      [
        {
          role: "system",
          content:
            "You are a concise, careful skincare shopping assistant for an ecommerce site.",
        },
        {
          role: "user",
          content: buildProductFollowUpPrompt(message, history, previousContextProducts),
        },
      ],
      fallbackAnswer
    );

    return {
      answer,
      products: [],
      canExplainProducts: previousContextProducts.length > 0,
      usedFallback: answer === fallbackAnswer,
    };
  }

  if (decision.intent !== "product_search") {
    const answer = await requestOpenAI(
      [
        {
          role: "system",
          content:
            "You are a concise, careful skincare assistant for an ecommerce site.",
        },
        {
          role: "user",
          content: buildSkincareChatPrompt(message, history, decision.intent),
        },
      ],
      GENERAL_SKINCARE_FALLBACK_ANSWER
    );

    return {
      answer,
      products: [],
      canExplainProducts: false,
      usedFallback: !process.env.OPENAI_API_KEY,
    };
  }

  const candidateProducts = await retrieveProducts(message, searchIntent);
  const finalSelection = await selectFinalProducts(message, history, candidateProducts);
  const products = finalSelection.products;
  const answer =
    finalSelection.answer || (await createOpenAIAnswer(message, products, history, []));

  return {
    answer,
    products,
    canExplainProducts: Boolean(process.env.OPENAI_API_KEY && products.length > 0),
    usedFallback: !process.env.OPENAI_API_KEY,
  };
}

async function createChatResponseStream(
  message,
  history = [],
  contextProductIds = [],
  onDelta = () => {}
) {
  const previousContextProducts =
    contextProductIds.length > 0 && process.env.OPENAI_API_KEY
      ? await getContextProducts(contextProductIds)
      : [];
  const plan = await planChatTurn(message, history, previousContextProducts);
  const decision = { intent: plan.intent };
  const searchIntent = plan.productSearch;

  if (decision.intent === "off_topic") {
    return {
      answer: OFF_TOPIC_ANSWER,
      products: [],
      canExplainProducts: false,
      usedFallback: false,
    };
  }

  if (decision.intent === "product_follow_up") {
    const fallbackAnswer =
      "Ich kann die vorherigen Produkte gerade nicht zuverlässig erklären, weil mir der Produktkontext fehlt.";
    const answer = await streamOpenAI(
      [
        {
          role: "system",
          content:
            "You are a concise, careful skincare shopping assistant for an ecommerce site.",
        },
        {
          role: "user",
          content: buildProductFollowUpPrompt(message, history, previousContextProducts),
        },
      ],
      fallbackAnswer,
      onDelta
    );

    return {
      answer,
      products: [],
      canExplainProducts: previousContextProducts.length > 0,
      usedFallback: answer === fallbackAnswer,
    };
  }

  if (decision.intent !== "product_search") {
    const fallbackAnswer = GENERAL_SKINCARE_FALLBACK_ANSWER;
    const answer = await streamOpenAI(
      [
        {
          role: "system",
          content:
            "You are a concise, careful skincare assistant for an ecommerce site.",
        },
        {
          role: "user",
          content: buildSkincareChatPrompt(message, history, decision.intent),
        },
      ],
      fallbackAnswer,
      onDelta
    );

    return {
      answer,
      products: [],
      canExplainProducts: false,
      usedFallback: answer === fallbackAnswer,
    };
  }

  const candidateProducts = await retrieveProducts(message, searchIntent);
  const finalSelection = await selectFinalProducts(message, history, candidateProducts);
  const products = finalSelection.products;

  if (finalSelection.answer) {
    onDelta(finalSelection.answer);

    return {
      answer: finalSelection.answer,
      products,
      canExplainProducts: Boolean(process.env.OPENAI_API_KEY && products.length > 0),
      usedFallback: false,
    };
  }

  if (products.length > 0 || !process.env.OPENAI_API_KEY) {
    return {
      answer: await createOpenAIAnswer(message, products, history, []),
      products,
      canExplainProducts: Boolean(process.env.OPENAI_API_KEY && products.length > 0),
      usedFallback: !process.env.OPENAI_API_KEY,
    };
  }

  const fallbackAnswer = buildFallbackAnswer(products);
  const answer = await streamOpenAI(
    [
      {
        role: "system",
        content:
          "You are a concise, careful skincare shopping assistant for an ecommerce site.",
      },
      {
        role: "user",
        content: buildGeneralPrompt(message, history, []),
      },
    ],
    fallbackAnswer,
    onDelta
  );

  return {
    answer,
    products,
    canExplainProducts: false,
    usedFallback: answer === fallbackAnswer,
  };
}

async function createProductExplanation(productIds, message) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      answer:
        "Für eine detaillierte AI-Erklärung der Inhaltsstoffe muss ein OpenAI API-Key konfiguriert sein.",
      products: [],
      usedFallback: true,
    };
  }

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
    },
    take: MAX_CONTEXT_PRODUCTS,
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });

  if (products.length === 0) {
    return {
      answer: "Ich konnte die empfohlenen Produkte gerade nicht mehr finden.",
      products: [],
      usedFallback: true,
    };
  }

  const chatProducts = products.map((product) => toChatProduct(product));
  const answer = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "You explain skincare product ingredients clearly and cautiously for ecommerce customers.",
      },
      {
        role: "user",
        content: buildProductExplanationPrompt(chatProducts, message),
      },
    ],
    "Ich konnte gerade keine detaillierte AI-Erklärung erstellen. Bitte versuche es gleich nochmal."
  );

  return {
    answer,
    products: chatProducts,
    usedFallback: false,
  };
}

module.exports = {
  createChatResponse,
  createChatResponseStream,
  createProductExplanation,
};
