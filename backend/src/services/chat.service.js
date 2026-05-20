const prisma = require("../config/prisma");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5-mini";
const MAX_CONTEXT_PRODUCTS = 6;
const PRODUCT_RECOMMENDATION_ANSWER =
  "Ich habe folgende passende Produkte aus unserem Sortiment gefunden. Das ist keine medizinische Diagnose, sondern eine Produktempfehlung auf Basis deiner Anfrage.";

// Common English and German words that do not help retrieval. Removing them
// keeps the Prisma query focused on useful skincare/product terms instead of
// matching almost every product description.
const stopWords = new Set([
  "a",
  "about",
  "and",
  "are",
  "for",
  "from",
  "have",
  "help",
  "i",
  "is",
  "me",
  "my",
  "need",
  "of",
  "please",
  "product",
  "products",
  "recommend",
  "routine",
  "skin",
  "skincare",
  "the",
  "to",
  "want",
  "with",
  "you",
  "ich",
  "bin",
  "brauche",
  "das",
  "der",
  "die",
  "ein",
  "eine",
  "empfehle",
  "für",
  "gegen",
  "habe",
  "haut",
  "helfen",
  "kann",
  "können",
  "mein",
  "meine",
  "mir",
  "mit",
  "pflege",
  "produkt",
  "produkte",
  "und",
  "was",
]);

// Phase 1 does not use embeddings, so we manually expand common skincare words.
// This makes keyword search more forgiving across English/German wording and
// common synonyms, e.g. "acne", "Akne", "Pickel", and "Unreinheiten".
const queryAliases = {
  acne: ["acne", "akne", "blemish", "blemishes", "unreinheiten", "pickel"],
  aging: ["aging", "anti-aging", "antiaging", "falten", "age"],
  dry: ["dry", "trocken", "trockene"],
  oily: ["oily", "ölig", "oelig", "fettig"],
  pores: ["pores", "poren", "grosse", "große"],
  redness: ["redness", "rötungen", "roetungen", "sensitive"],
  sensitive: ["sensitive", "sensibel", "empfindlich"],
  sunscreen: ["sunscreen", "sonnenschutz", "spf"],
};

// Normalize text before comparing keywords. This lowercases text, removes
// accent marks, replaces punctuation with spaces, and prevents small spelling
// differences from breaking simple keyword matching.
function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß-]+/gi, " ")
    .trim();
}

// Extract searchable terms from the customer message. The result becomes the
// keyword part of the RAG retrieval step.
function extractTerms(message) {
  const normalized = normalizeText(message);
  const baseTerms = normalized
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && !stopWords.has(term));

  const expandedTerms = new Set(baseTerms);

  // If the message contains one known alias, add the whole alias group. This
  // increases recall without adding pgvector yet.
  for (const aliases of Object.values(queryAliases)) {
    if (aliases.some((alias) => normalized.includes(normalizeText(alias)))) {
      aliases.forEach((alias) => expandedTerms.add(normalizeText(alias)));
    }
  }

  return Array.from(expandedTerms).slice(0, 12);
}

// Some product preferences are already stored as booleans in the Product table.
// Detecting them separately lets us use exact Prisma filters instead of relying
// only on text search.
function detectBooleanFilters(message) {
  const normalized = normalizeText(message);

  return {
    vegan: normalized.includes("vegan") ? true : undefined,
    alcoholFree:
      normalized.includes("alcohol free") ||
      normalized.includes("alcohol-free") ||
      normalized.includes("alkoholfrei")
        ? true
        : undefined,
    fragranceFree:
      normalized.includes("fragrance free") ||
      normalized.includes("fragrance-free") ||
      normalized.includes("parfumfrei") ||
      normalized.includes("duftstofffrei")
        ? true
        : undefined,
  };
}

function detectSpfFilter(message) {
  const match = String(message || "").match(/\b(?:spf|lsf|lf)\s*(\d{2,3})\+?\b/i);
  return match ? Number(match[1]) : undefined;
}

function extractProductSpfValues(product) {
  const text = [
    product.name,
    product.category,
    product.description,
  ]
    .join(" ")
    .toLowerCase();

  const values = new Set();
  const matches = text.matchAll(/\b(?:spf|lsf|lf)\s*(\d{2,3})\+?\b/gi);

  for (const match of matches) {
    values.add(Number(match[1]));
  }

  return values;
}

// Build one searchable text blob per product for local scoring after Prisma
// returns candidates. This lets us rank by all useful fields, including flags.
function productText(product) {
  return normalizeText(
    [
      product.name,
      product.brand,
      product.category,
      product.description,
      product.ingredients,
      product.skinTypes,
      product.concerns,
      product.vegan ? "vegan" : "",
      product.alcoholFree ? "alcohol free alkoholfrei" : "",
      product.fragranceFree ? "fragrance free parfumfrei duftstofffrei" : "",
    ].join(" ")
  );
}

// Simple deterministic ranking for the MVP:
// - keyword matches increase relevance
// - exact preference matches get a stronger boost
// - rating is a small tie-breaker, not the main ranking signal
function scoreProduct(product, terms, filters) {
  const text = productText(product);
  let score = 0;

  for (const term of terms) {
    if (text.includes(term)) {
      score += 2;
    }
  }

  if (filters.vegan && product.vegan) score += 3;
  if (filters.alcoholFree && product.alcoholFree) score += 3;
  if (filters.fragranceFree && product.fragranceFree) score += 3;

  if (filters.spf) {
    const productSpfValues = extractProductSpfValues(product);

    if (productSpfValues.has(filters.spf)) {
      score += 8;
    } else if (productSpfValues.size > 0) {
      score -= 8;
    }
  }

  if (product.rating) score += Math.min(product.rating, 5) / 5;

  return score;
}

// Keep the API response small and frontend-friendly. This avoids exposing fields
// the chat UI does not need and gives the assistant enough context for cards.
function toChatProduct(product) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    description: product.description,
    ingredients: product.ingredients,
    rating: product.rating,
    skinTypes: product.skinTypes,
    concerns: product.concerns,
    vegan: product.vegan,
    alcoholFree: product.alcoholFree,
    fragranceFree: product.fragranceFree,
  };
}

// Keyword RAG retrieval step. Instead of vector search, this uses Prisma
// contains queries over the current Product table, then reranks candidates in JS.
async function retrieveProducts(message) {
  const terms = extractTerms(message);
  const filters = {
    ...detectBooleanFilters(message),
    spf: detectSpfFilter(message),
  };

  const where = {};

  // Add exact boolean filters first. Example: "parfumfrei" should prefer only
  // products where fragranceFree is true.
  for (const [key, value] of Object.entries(filters)) {
    if (key === "spf") continue;

    if (value !== undefined) {
      where[key] = value;
    }
  }

  // Search the most useful product text fields. Prisma combines this OR block
  // with any exact boolean filters above.
  if (terms.length > 0) {
    where.OR = terms.flatMap((term) => [
      { name: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { ingredients: { contains: term, mode: "insensitive" } },
      { skinTypes: { contains: term, mode: "insensitive" } },
      { concerns: { contains: term, mode: "insensitive" } },
    ]);
  }

  let products = await prisma.product.findMany({
    where,
    take: 40,
    orderBy: [{ rating: "desc" }, { name: "asc" }],
  });

  // Fallback retrieval: SQL contains search can miss terms because of accents,
  // spelling variants, or language differences. If it finds too few rows, fetch
  // a broader filtered set and let the local scoring function rank it.
  if (products.length < 3 && terms.length > 0) {
    const broadWhere = {};

    for (const [key, value] of Object.entries(filters)) {
      if (key === "spf") continue;

      if (value !== undefined) {
        broadWhere[key] = value;
      }
    }

    products = await prisma.product.findMany({
      where: broadWhere,
      take: 80,
      orderBy: [{ rating: "desc" }, { name: "asc" }],
    });
  }

  if (filters.spf) {
    const exactSpfProducts = products.filter((product) =>
      extractProductSpfValues(product).has(filters.spf)
    );

    if (exactSpfProducts.length > 0) {
      products = exactSpfProducts;
    }
  }

  // Score, sort, limit, and shape the retrieved products before sending them to
  // the model or frontend. These products are the "context" in keyword RAG.
  return products
    .map((product) => ({
      product,
      score: scoreProduct(product, terms, filters),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONTEXT_PRODUCTS)
    .map(({ product }) => toChatProduct(product));
}

// If there is no OpenAI key, no matching context, or the model request fails,
// the endpoint still returns a useful response instead of breaking the chat UI.
function buildFallbackAnswer(products) {
  if (products.length === 0) {
    return "Ich habe in unserem aktuellen Sortiment leider keine gut passenden Produkte gefunden. Versuche es mit einer konkreteren Frage, zum Beispiel Hauttyp, Hautproblem oder gewünschter Eigenschaft wie vegan, alkoholfrei oder parfumfrei.";
  }

  return PRODUCT_RECOMMENDATION_ANSWER;
}

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
Description: ${product.description || "not available"}
Ingredients: ${product.ingredients || "not available"}`
    )
    .join("\n");

  return `
You are SelfGlow's skincare shopping assistant.
Answer in the same language as the customer.
Use only the product context below.
Do not diagnose medical conditions or promise treatment results.
If the context is weak, say so and ask one concise follow-up question.
Recommend at most three products and explain briefly why they match.

Customer question:
${message}

Retrieved product context:
${context}
`;
}

// Generate the final assistant text. The OpenAI API key stays on the backend, so
// the browser never receives or stores it.
async function createOpenAIAnswer(message, products) {
  if (products.length > 0) {
    return PRODUCT_RECOMMENDATION_ANSWER;
  }

  // This keeps local development possible even before an API key is configured.
  if (!process.env.OPENAI_API_KEY || products.length === 0) {
    return buildFallbackAnswer(products);
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a concise, careful skincare shopping assistant for an ecommerce site.",
        },
        {
          role: "user",
          content: buildPrompt(message, products),
        },
      ],
    }),
  });

  // Model/API failures should not stop recommendations from appearing. We log
  // the server-side error and return the deterministic fallback answer.
  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    return buildFallbackAnswer(products);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || buildFallbackAnswer(products);
}

// Public service method used by the controller. It runs retrieval first, then
// generation, and returns both the written answer and the source products so the
// frontend can render clickable recommendation cards.
async function createChatResponse(message) {
  const products = await retrieveProducts(message);
  const answer = await createOpenAIAnswer(message, products);

  return {
    answer,
    products,
    usedFallback: !process.env.OPENAI_API_KEY,
  };
}

module.exports = {
  createChatResponse,
};
