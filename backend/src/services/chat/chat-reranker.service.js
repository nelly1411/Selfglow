const {
  MAX_FINAL_PRODUCTS,
  MAX_FOLLOW_UP_HISTORY,
  MEDICAL_DISCLAIMER,
  PRODUCT_RECOMMENDATION_ANSWER,
} = require("./chat.constants");
const { requestOpenAI } = require("./chat-openai.service");
const { truncatePromptText } = require("./chat.utils");

function buildCandidateContext(products) {
  return products
    .map(
      (product, index) => `
${index + 1}. ID: ${product.id}
Name: ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Price: ${product.price}
Rating: ${product.rating ?? "not available"}
Skin types: ${product.skinTypes || "not available"}
Concerns: ${product.concerns || "not available"}
Flags: ${product.vegan ? "vegan" : "not vegan"}, ${
        product.alcoholFree ? "alcohol free" : "contains/unknown alcohol"
      }, ${product.fragranceFree ? "fragrance free" : "contains/unknown fragrance"}
Description: ${truncatePromptText(product.description, 450)}
Ingredients: ${truncatePromptText(product.ingredients, 650)}`
    )
    .join("\n");
}

function buildRerankPrompt(message, history = [], products = []) {
  const conversationHistory = history
    .slice(-MAX_FOLLOW_UP_HISTORY)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");

  return `
Select the best SelfGlow products from the retrieved candidates and write the final customer answer.
Return only valid JSON. Do not invent products or IDs.

Rules:
- Use the current customer message and recent conversation to judge fit.
- Select exactly ${MAX_FINAL_PRODUCTS} products when at least ${MAX_FINAL_PRODUCTS} candidates are relevant.
- Select fewer only when the remaining candidates conflict with the customer's explicit request or are clearly irrelevant.
- Select only product IDs from the candidate list.
- For routine requests, prefer a complementary set across different routine steps or categories when available.
- For every selected product, write 2-4 short keyword bullets that explain why it matches the customer's request.
- Each bullet must be 1-4 words, not a full sentence.
- Exclude candidates that conflict with the customer's explicit request or rejection.
- If no candidate is a good fit, return an empty productIds array and explain briefly what is missing.
- Write answer in the same language as the current customer message.
- Keep the answer concise and practical.
- Do not repeat selected product names in the answer; product names are already shown on the cards.
- Summarize the selected set as a group, focusing on routine role, skin concern, or shared benefits.
- Do not mention products, steps, or categories that are not represented by the selected product cards.
- Do not describe the whole set as one category unless every selected product has that category.
- Prefer 1-3 short sentences over product-by-product explanations.
- Do not diagnose medical conditions or promise treatment results.
- When recommending products, the final sentence must be exactly: ${MEDICAL_DISCLAIMER}

Recent conversation:
${conversationHistory || "No previous conversation."}

Current customer message:
${message}

Retrieved candidate products:
${buildCandidateContext(products)}

JSON shape:
{
  "productSelections": [
    { "id": 123, "bullets": ["short keyword", "short keyword"] }
  ],
  "answer": "final customer-facing answer"
}
`;
}

function normalizeBullet(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function normalizeBullets(selection) {
  const rawBullets = Array.isArray(selection?.bullets)
    ? selection.bullets
    : selection?.reason
      ? [selection.reason]
      : [];

  return rawBullets
    .map((bullet) => normalizeBullet(bullet))
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeRecommendationAnswer(answer, hasSelectedProducts) {
  const text = String(answer || "").replace(/\s+/g, " ").trim();

  if (!hasSelectedProducts) {
    return text;
  }

  const withoutDisclaimer = text
    .replace(/hinweis:\s*dies ist keine medizinische diagnose\.?/gi, "")
    .replace(/das ist keine medizinische diagnose,?\s*(sondern eine produktempfehlung auf basis deiner anfrage)?\.?/gi, "")
    .trim();

  return [withoutDisclaimer, MEDICAL_DISCLAIMER].filter(Boolean).join(" ");
}

function normalizeCategory(product) {
  return String(product?.category || "").toLowerCase().trim();
}

function diversifySelectedProducts(selectedProducts, candidateProducts) {
  if (selectedProducts.length < MAX_FINAL_PRODUCTS) {
    return selectedProducts;
  }

  const selectedCategories = new Set(selectedProducts.map(normalizeCategory));
  const candidateCategories = new Set(candidateProducts.map(normalizeCategory));

  if (selectedCategories.size > 1 || candidateCategories.size <= 1) {
    return selectedProducts;
  }

  const diversified = [selectedProducts[0]];
  const usedIds = new Set([String(selectedProducts[0].id)]);
  const usedCategories = new Set([normalizeCategory(selectedProducts[0])]);

  for (const candidate of candidateProducts) {
    const id = String(candidate.id);
    const category = normalizeCategory(candidate);

    if (usedIds.has(id) || usedCategories.has(category)) {
      continue;
    }

    diversified.push({
      ...candidate,
      recommendationBullets: candidate.recommendationBullets || [],
    });
    usedIds.add(id);
    usedCategories.add(category);

    if (diversified.length >= MAX_FINAL_PRODUCTS) {
      return diversified;
    }
  }

  for (const product of selectedProducts) {
    if (diversified.length >= MAX_FINAL_PRODUCTS) {
      break;
    }

    if (!usedIds.has(String(product.id))) {
      diversified.push(product);
      usedIds.add(String(product.id));
    }
  }

  return diversified;
}

function parseRerankJson(rawResult, candidateProducts) {
  try {
    const jsonText = rawResult.match(/\{[\s\S]*\}/)?.[0] || rawResult;
    const parsedResult = JSON.parse(jsonText);
    const candidateById = new Map(
      candidateProducts.map((product) => [String(product.id), product])
    );
    const rawSelections = Array.isArray(parsedResult.productSelections)
      ? parsedResult.productSelections
      : Array.isArray(parsedResult.productIds)
        ? parsedResult.productIds.map((id) => ({ id }))
        : [];
    const selectedProducts = rawSelections
      .map((selection) => {
        const product = candidateById.get(String(selection?.id));

        if (!product) {
          return null;
        }

        return {
          ...product,
          recommendationBullets: normalizeBullets(selection),
        };
      })
      .filter(Boolean)
      .slice(0, MAX_FINAL_PRODUCTS);
    const selectedIds = new Set(selectedProducts.map((product) => String(product.id)));

    for (const product of candidateProducts) {
      if (selectedProducts.length >= MAX_FINAL_PRODUCTS) {
        break;
      }

      if (!selectedIds.has(String(product.id))) {
        selectedProducts.push({
          ...product,
          recommendationBullets: [],
        });
        selectedIds.add(String(product.id));
      }
    }
    const answer = normalizeRecommendationAnswer(
      parsedResult.answer,
      selectedProducts.length > 0
    );

    return {
      answer,
      products: diversifySelectedProducts(selectedProducts, candidateProducts),
    };
  } catch {
    return {
      answer: "",
      products: [],
    };
  }
}

async function selectFinalProducts(message, history = [], candidateProducts = []) {
  if (candidateProducts.length === 0) {
    return {
      answer: "",
      products: [],
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: PRODUCT_RECOMMENDATION_ANSWER,
      products: candidateProducts.slice(0, MAX_FINAL_PRODUCTS),
    };
  }

  const rawResult = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "You select ecommerce skincare products from provided candidates and write concise final answers.",
      },
      {
        role: "user",
        content: buildRerankPrompt(message, history, candidateProducts),
      },
    ],
    JSON.stringify({
      productSelections: candidateProducts.slice(0, MAX_FINAL_PRODUCTS).map((product) => ({
        id: product.id,
        bullets: [],
      })),
      answer: PRODUCT_RECOMMENDATION_ANSWER,
    }),
    {
      maxOutputTokens: 550,
    }
  );
  const result = parseRerankJson(rawResult, candidateProducts);

  if (result.answer && result.products.length > 0) {
    return result;
  }

  if (result.answer && result.products.length === 0) {
    return result;
  }

  return {
    answer: PRODUCT_RECOMMENDATION_ANSWER,
    products: candidateProducts.slice(0, MAX_FINAL_PRODUCTS),
  };
}

module.exports = {
  selectFinalProducts,
};
