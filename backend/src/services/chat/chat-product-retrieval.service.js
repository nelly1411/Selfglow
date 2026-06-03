const prisma = require("../../config/prisma");
const { createEmbedding } = require("../embedding.service");
const { requestOpenAI } = require("./chat-openai.service");
const {
  MAX_CONTEXT_PRODUCTS,
  MIN_RELEVANCE_SCORE,
  PRODUCT_RECOMMENDATION_ANSWER,
  PRODUCT_SEARCH_INTENT_FALLBACK,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_CONFIDENCE_THRESHOLD,
  SKIN_TYPE_VALUES,
  CONCERN_VALUES,
  stopWords,
  queryAliases,
  ingredientAliases,
} = require("./chat.constants");
const {
  normalizeText,
  normalizeSearchTerm,
  normalizeArray,
  pickAllowedValues,
  pickOptionalBoolean,
  pickOptionalPositiveInteger,
  pickOptionalPricePreference,
  addTermVariants,
} = require("./chat.utils");

function extractTerms(message) {
  const normalized = normalizeText(message);
  const baseTerms = normalized
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && !stopWords.has(term));

  const expandedTerms = new Set();

  baseTerms.forEach((term) => addTermVariants(term, expandedTerms));

  // If the message contains one known alias, add the whole alias group. This
  // increases recall without adding pgvector yet.
  for (const aliases of [...Object.values(queryAliases), ...Object.values(ingredientAliases)]) {
    if (aliases.some((alias) => normalized.includes(normalizeSearchTerm(alias)))) {
      aliases.forEach((alias) => addTermVariants(normalizeSearchTerm(alias), expandedTerms));
    }
  }

  return Array.from(expandedTerms)
    .filter((term) => term.length >= 3 && !stopWords.has(term))
    .slice(0, 40);
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
      normalized.includes("alcoholfree") ||
      normalized.includes("without alcohol") ||
      normalized.includes("ohne alkohol") ||
      normalized.includes("alkoholfrei") ||
      normalized.includes("alkohol frei")
        ? true
        : undefined,
    fragranceFree:
      normalized.includes("fragrance free") ||
      normalized.includes("fragrance-free") ||
      normalized.includes("fragrancefree") ||
      normalized.includes("without fragrance") ||
      normalized.includes("ohne parfum") ||
      normalized.includes("parfumfrei") ||
      normalized.includes("parfum frei") ||
      normalized.includes("duftstofffrei") ||
      normalized.includes("duftfrei")
        ? true
        : undefined,
  };
}

function detectSpfFilter(message) {
  const rawMessage = String(message || "");
  const labeledMatch = rawMessage.match(/\b(?:spf|lsf|lf)\s*(\d{2,3})\+?\b/i);

  if (labeledMatch) {
    return Number(labeledMatch[1]);
  }

  // Short queries like "50+" usually mean SPF/LSF in this skincare context.
  // Keep this intentionally narrow so "50 ml" does not become an SPF search.
  const compactMessage = rawMessage.trim();
  const bareSpfMatch = compactMessage.match(/^(?:spf|lsf|lf)?\s*(20|25|30|45|50)\+\s*$/i);

  return bareSpfMatch ? Number(bareSpfMatch[1]) : undefined;
}

function detectSunscreenIntent(message) {
  const normalized = normalizeText(message);

  const hasSunscreenIntent = [
    "sunscreen",
    "sun screen",
    "sun protection",
    "sonnenschutz",
    "sonnencreme",
    "uv",
    "spf",
    "lsf",
    "lichtschutzfaktor",
  ].some((term) => normalized.includes(normalizeSearchTerm(term)));

  return hasSunscreenIntent ? true : undefined;
}

function detectPricePreference(message) {
  const normalized = normalizeText(message);

  if (
    [
      "günstig",
      "gunstig",
      "guenstig",
      "billig",
      "preiswert",
      "cheap",
      "cheaper",
      "affordable",
      "budget",
    ].some((term) => normalized.includes(term))
  ) {
    return "cheap";
  }

  return undefined;
}

function parseProductSearchIntentJson(rawIntent) {
  try {
    const jsonText = rawIntent.match(/\{[\s\S]*\}/)?.[0] || rawIntent;
    const parsedIntent = JSON.parse(jsonText);
    const booleanFilters =
      parsedIntent.booleanFilters && typeof parsedIntent.booleanFilters === "object"
        ? parsedIntent.booleanFilters
        : {};
    const category = PRODUCT_CATEGORIES.find(
      (value) => normalizeSearchTerm(value) === normalizeSearchTerm(parsedIntent.productCategory)
    );
    const categoryConfidence = Number(parsedIntent.categoryConfidence);

    return {
      language: String(parsedIntent.language || "unknown"),
      productCategory: category || null,
      categoryConfidence:
        Number.isFinite(categoryConfidence) && categoryConfidence >= 0
          ? Math.min(categoryConfidence, 1)
          : 0,
      hasPositiveProductIntent: parsedIntent.hasPositiveProductIntent === true,
      excludedProductCategories: pickAllowedValues(
        parsedIntent.excludedProductCategories,
        PRODUCT_CATEGORIES
      ),
      booleanFilters: {
        vegan: pickOptionalBoolean(booleanFilters.vegan),
        alcoholFree: pickOptionalBoolean(booleanFilters.alcoholFree),
        fragranceFree: pickOptionalBoolean(booleanFilters.fragranceFree),
      },
      spf: pickOptionalPositiveInteger(parsedIntent.spf),
      pricePreference: pickOptionalPricePreference(parsedIntent.pricePreference),
      skinTypes: pickAllowedValues(parsedIntent.skinTypes, SKIN_TYPE_VALUES),
      concerns: pickAllowedValues(parsedIntent.concerns, CONCERN_VALUES),
      ingredients: normalizeArray(parsedIntent.ingredients).slice(0, 8),
      preferences: normalizeArray(parsedIntent.preferences).slice(0, 8),
      query_de: String(parsedIntent.query_de || "").trim(),
      query_en: String(parsedIntent.query_en || "").trim(),
    };
  } catch {
    return { ...PRODUCT_SEARCH_INTENT_FALLBACK };
  }
}

function buildProductSearchIntentPrompt(message) {
  return `
Extract normalized ecommerce search intent for SelfGlow skincare product retrieval.
Return only JSON. Do not recommend products.
Map any customer language to the fixed taxonomy.

Allowed productCategory values:
${PRODUCT_CATEGORIES.join(", ")}

Allowed skinTypes values:
${SKIN_TYPE_VALUES.join(", ")}

Allowed concerns values:
${CONCERN_VALUES.join(", ")}

Rules:
- productCategory is the product type the customer is explicitly asking to buy/use, not just a benefit mentioned in a product.
- Use productCategory null when the requested product type is unclear.
- For routine requests, keep productCategory null unless the customer explicitly asks for one single product category.
- categoryConfidence is 0 to 1. Use at least 0.75 only when the product type is explicit.
- hasPositiveProductIntent is true only when the customer gives a positive product need, product type, skin concern, ingredient, skin type, or preference to search for.
- hasPositiveProductIntent is false when the customer only rejects a product type or says what they do not want.
- Put rejected product types in excludedProductCategories, for example when the customer says they do not want that type.
- Excluded categories are hard retrieval filters. Do not put a category in both productCategory and excludedProductCategories.
- For "moisturizer", "cream", "hydrating cream", or equivalent in any language, use Feuchtigkeitspflege.
- For "sunscreen", "SPF", "sun protection", or equivalent in any language, use Sonnenschutz.
- For acne-prone skin, set concerns ["Acne"] rather than inventing a skinType.
- booleanFilters may set vegan, alcoholFree, or fragranceFree to true only when explicitly requested.
- spf is a number only when a specific SPF/LSF value is requested, otherwise null.
- pricePreference is "cheap" only when the customer asks for budget/affordable products, otherwise null.
- query_de and query_en should be concise positive retrieval queries, translated/normalized for semantic search.
- Do not include rejected or negated product types in query_de or query_en.
- Keep ingredients and preferences as short normalized terms.

Customer message:
${message}

JSON shape:
{
  "language": "detected ISO-like language code",
  "productCategory": "one allowed value or null",
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
`;
}

async function parseProductSearchIntent(message) {
  if (!process.env.OPENAI_API_KEY) {
    return { ...PRODUCT_SEARCH_INTENT_FALLBACK };
  }

  const rawIntent = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "You extract multilingual skincare shopping search intent. Return only valid JSON.",
      },
      {
        role: "user",
        content: buildProductSearchIntentPrompt(message),
      },
    ],
    JSON.stringify(PRODUCT_SEARCH_INTENT_FALLBACK),
    {
      maxOutputTokens: 350,
    }
  );

  return parseProductSearchIntentJson(rawIntent);
}

function buildRetrievalMessage(
  message,
  searchIntent = PRODUCT_SEARCH_INTENT_FALLBACK,
  options = {}
) {
  const normalizedQueries = [searchIntent.query_de, searchIntent.query_en]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const baseQuery =
    normalizedQueries.length > 0 || !options.useOriginalWhenNoQuery
      ? normalizedQueries.join(" ")
      : message;

  return [
    baseQuery,
    searchIntent.productCategory,
    ...normalizeArray(searchIntent.skinTypes),
    ...normalizeArray(searchIntent.concerns),
    ...normalizeArray(searchIntent.ingredients),
    ...normalizeArray(searchIntent.preferences),
  ]
    .filter(Boolean)
    .join(" ");
}

function hasPositiveRetrievalIntent(searchIntent, filters) {
  return Boolean(
    searchIntent.hasPositiveProductIntent ||
      filters.productCategory ||
      filters.spf ||
      normalizeArray(searchIntent.skinTypes).length > 0 ||
      normalizeArray(searchIntent.concerns).length > 0 ||
      normalizeArray(searchIntent.ingredients).length > 0 ||
      normalizeArray(searchIntent.preferences).length > 0
  );
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

  if (normalizeText(product.category).includes("sonnenschutz")) {
    const bareMatches = text.matchAll(/\b(20|25|30|45|50)\+\b/gi);

    for (const match of bareMatches) {
      values.add(Number(match[1]));
    }
  }

  return values;
}

function productDerivedTerms(product) {
  const terms = [];
  const normalizedCategory = normalizeText(product.category);
  const normalizedConcerns = normalizeText(product.concerns);
  const normalizedSkinTypes = normalizeText(product.skinTypes);
  const spfValues = extractProductSpfValues(product);

  if (normalizedCategory.includes("sonnenschutz")) {
    terms.push(
      "sunscreen",
      "sun protection",
      "sonnenschutz",
      "sonnencreme",
      "uv",
      "spf",
      "lsf",
      "lichtschutzfaktor"
    );
  }

  for (const spfValue of spfValues) {
    terms.push(`spf${spfValue}`, `spf ${spfValue}`, `lsf${spfValue}`, `lsf ${spfValue}`, `${spfValue}+`);
  }

  if (normalizedCategory.includes("reinigung")) {
    terms.push("cleanser", "cleansing", "reinigung", "gesichtsreiniger");
  }

  if (normalizedCategory.includes("serum")) {
    terms.push("serum", "booster");
  }

  if (normalizedCategory.includes("toner")) {
    terms.push("toner", "gesichtswasser");
  }

  if (normalizedCategory.includes("feuchtigkeit")) {
    terms.push("moisturizer", "feuchtigkeitscreme", "feuchtigkeitspflege", "hydrating");
  }

  if (normalizedConcerns.includes("acne")) {
    terms.push("acne", "akne", "blemish", "unreinheiten", "pickel", "mitesser");
  }

  if (normalizedConcerns.includes("anti aging")) {
    terms.push("anti aging", "antiaging", "falten", "wrinkles", "fine lines");
  }

  if (normalizedConcerns.includes("poren")) {
    terms.push("pores", "poren", "large pores", "pore control", "verfeinertes hautbild");
  }

  if (normalizedConcerns.includes("rotungen")) {
    terms.push("redness", "rötungen", "roetungen", "calming", "beruhigend");
  }

  if (normalizedSkinTypes.includes("oily")) {
    terms.push("oily", "ölig", "fettig", "oil control", "mattierend", "talg");
  }

  if (normalizedSkinTypes.includes("dry")) {
    terms.push("dry", "trocken", "feuchtigkeit", "hydrating", "moisturizing");
  }

  if (normalizedSkinTypes.includes("sensitive")) {
    terms.push("sensitive", "empfindlich", "sensibel", "mild", "sanft");
  }

  if (normalizedSkinTypes.includes("combination")) {
    terms.push("combination", "mischhaut");
  }

  if (normalizedSkinTypes.includes("normal")) {
    terms.push("normal", "normale haut");
  }

  return terms;
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
      ...productDerivedTerms(product),
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
  if (
    filters.productCategory &&
    normalizeText(product.category || "").includes(normalizeText(filters.productCategory))
  ) {
    score += 10;
  }
  if (filters.sunscreen) {
    if (normalizeText(product.category).includes("sonnenschutz")) {
      score += 8;
    } else {
      score -= 6;
    }
  }
  if (filters.pricePreference === "cheap") {
    if (product.price <= 15) score += 4;
    else if (product.price <= 25) score += 2;
    else if (product.price >= 40) score -= 2;
  }

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

async function retrieveSunscreenProducts(filters) {
  const where = {
    category: { contains: "Sonnenschutz", mode: "insensitive" },
  };

  for (const [key, value] of Object.entries(filters)) {
    if (
      ["spf", "sunscreen", "pricePreference", "productCategory", "excludedProductCategories"].includes(
        key
      )
    ) {
      continue;
    }

    if (value !== undefined) {
      where[key] = value;
    }
  }

  const orderBy =
    filters.pricePreference === "cheap"
      ? [{ price: "asc" }, { rating: "desc" }, { name: "asc" }]
      : [{ rating: "desc" }, { price: "asc" }, { name: "asc" }];

  let products = await prisma.product.findMany({
    where,
    take: 120,
    orderBy,
  });

  if (filters.spf) {
    products = products.filter((product) => extractProductSpfValues(product).has(filters.spf));
  }

  return products
    .map((product) => ({
      product,
      score: scoreProduct(product, [], filters),
    }))
    .filter(({ score }) => score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => {
      if (filters.pricePreference === "cheap") {
        const priceDifference = a.product.price - b.product.price;

        if (priceDifference !== 0) {
          return priceDifference;
        }
      }

      return b.score - a.score;
    })
    .slice(0, MAX_CONTEXT_PRODUCTS)
    .map(({ product }) => toChatProduct(product));
}

function toPgVector(embedding) {
  return `[${embedding.map(Number).join(",")}]`;
}

function productMatchesFilters(product, filters) {
  if (filters.vegan && !product.vegan) return false;
  if (filters.alcoholFree && !product.alcoholFree) return false;
  if (filters.fragranceFree && !product.fragranceFree) return false;

  const normalizedCategory = normalizeText(product.category || "");

  if (
    filters.excludedProductCategories?.some((category) =>
      normalizedCategory.includes(normalizeText(category))
    )
  ) {
    return false;
  }

  if (
    filters.productCategory &&
    !normalizedCategory.includes(normalizeText(filters.productCategory))
  ) {
    return false;
  }

  if (filters.spf && !extractProductSpfValues(product).has(filters.spf)) {
    return false;
  }

  if (
    filters.sunscreen &&
    !normalizedCategory.includes("sonnenschutz")
  ) {
    return false;
  }

  return true;
}

function sortRetrievedProducts(a, b, filters) {
  if (filters.pricePreference === "cheap") {
    const priceDifference = a.price - b.price;

    if (priceDifference !== 0) {
      return priceDifference;
    }
  }

  return Number(a.distance || 0) - Number(b.distance || 0);
}

function shouldDiversifyCategories(filters) {
  return !filters.productCategory && !filters.sunscreen && !filters.spf;
}

function diversifyByCategory(items, getCategory, limit = MAX_CONTEXT_PRODUCTS) {
  const maxPerCategoryFirstPass = 2;
  const selected = [];
  const selectedIds = new Set();
  const categoryCounts = new Map();

  for (const item of items) {
    const category = normalizeText(getCategory(item) || "unknown");
    const count = categoryCounts.get(category) || 0;

    if (count >= maxPerCategoryFirstPass) {
      continue;
    }

    selected.push(item);
    selectedIds.add(String(item.id ?? item.product?.id));
    categoryCounts.set(category, count + 1);

    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const item of items) {
    const id = String(item.id ?? item.product?.id);

    if (selectedIds.has(id)) {
      continue;
    }

    selected.push(item);
    selectedIds.add(id);

    if (selected.length >= limit) {
      return selected;
    }
  }

  return selected;
}

// Fallback retrieval for local setup and freshly imported products. Product
// embeddings are deleted when products are re-imported, so keyword search keeps
// recommendations working until npm run embed:products is run again.
async function retrieveProductsByKeyword(message, filters) {
  const terms = extractTerms(message);
  const hasFilters = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined
  );

  if (terms.length === 0 && !hasFilters) {
    return [];
  }

  if (filters.sunscreen) {
    return retrieveSunscreenProducts(filters);
  }

  const where = {};

  if (filters.productCategory) {
    where.category = { contains: filters.productCategory, mode: "insensitive" };
  }

  for (const [key, value] of Object.entries(filters)) {
    if (
      ["spf", "sunscreen", "pricePreference", "productCategory", "excludedProductCategories"].includes(
        key
      )
    ) {
      continue;
    }

    if (value !== undefined) {
      where[key] = value;
    }
  }

  const searchClauses = [];

  if (terms.length > 0) {
    searchClauses.push(
      ...terms.flatMap((term) => [
        { name: { contains: term, mode: "insensitive" } },
        { brand: { contains: term, mode: "insensitive" } },
        { category: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { ingredients: { contains: term, mode: "insensitive" } },
        { skinTypes: { contains: term, mode: "insensitive" } },
        { concerns: { contains: term, mode: "insensitive" } },
      ])
    );
  }

  if (filters.spf) {
    const spfValue = String(filters.spf);

    searchClauses.push(
      { category: { contains: "Sonnenschutz", mode: "insensitive" } },
      { name: { contains: `SPF${spfValue}`, mode: "insensitive" } },
      { name: { contains: `SPF ${spfValue}`, mode: "insensitive" } },
      { name: { contains: `LSF${spfValue}`, mode: "insensitive" } },
      { name: { contains: `LSF ${spfValue}`, mode: "insensitive" } },
      { description: { contains: `SPF${spfValue}`, mode: "insensitive" } },
      { description: { contains: `SPF ${spfValue}`, mode: "insensitive" } },
      { description: { contains: `LSF${spfValue}`, mode: "insensitive" } },
      { description: { contains: `LSF ${spfValue}`, mode: "insensitive" } }
    );
  }

  if (searchClauses.length > 0) {
    where.OR = searchClauses;
  }

  const orderBy =
    filters.pricePreference === "cheap"
      ? [{ price: "asc" }, { rating: "desc" }, { name: "asc" }]
      : [{ rating: "desc" }, { name: "asc" }];

  let products = await prisma.product.findMany({
    where,
    take: filters.spf || filters.sunscreen ? 120 : 40,
    orderBy,
  });

  if (products.length < 3 && (terms.length > 0 || filters.spf || hasFilters)) {
    const broadWhere = {};

    if (filters.sunscreen) {
      broadWhere.category = { contains: "Sonnenschutz", mode: "insensitive" };
    } else if (filters.productCategory) {
      broadWhere.category = { contains: filters.productCategory, mode: "insensitive" };
    }

    for (const [key, value] of Object.entries(filters)) {
      if (
        [
          "spf",
          "sunscreen",
          "pricePreference",
          "productCategory",
          "excludedProductCategories",
        ].includes(key)
      ) {
        continue;
      }

      if (value !== undefined) {
        broadWhere[key] = value;
      }
    }

    products = await prisma.product.findMany({
      where: broadWhere,
      take: 200,
      orderBy,
    });
  }

  const rankedProducts = products
    .filter((product) => productMatchesFilters(product, filters))
    .map((product) => ({
      product,
      score: scoreProduct(product, terms, filters),
    }))
    .filter(({ score }) => score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => {
      if (filters.pricePreference === "cheap") {
        const priceDifference = a.product.price - b.product.price;

        if (priceDifference !== 0) {
          return priceDifference;
        }
      }

      return b.score - a.score;
    });
  const selectedProducts = shouldDiversifyCategories(filters)
    ? diversifyByCategory(rankedProducts, (item) => item.product.category)
    : rankedProducts.slice(0, MAX_CONTEXT_PRODUCTS);

  return selectedProducts.map(({ product }) => toChatProduct(product));
}

// Embedding RAG retrieval step. The embedding search finds semantically similar
// products, then code applies hard filters like vegan, parfumfrei, LSF, and price.
async function retrieveProducts(message, providedSearchIntent = null) {
  const searchIntent = providedSearchIntent || (await parseProductSearchIntent(message));
  const retrievalMessage = buildRetrievalMessage(message, searchIntent, {
    useOriginalWhenNoQuery: !process.env.OPENAI_API_KEY,
  });
  const fallbackFilterMessage = retrievalMessage || message;
  const detectedBooleanFilters = detectBooleanFilters(fallbackFilterMessage);
  const productCategory =
    searchIntent.productCategory &&
    searchIntent.categoryConfidence >= PRODUCT_CATEGORY_CONFIDENCE_THRESHOLD
      ? searchIntent.productCategory
      : undefined;
  const wantsOnlySunscreen =
    productCategory && normalizeText(productCategory).includes("sonnenschutz");
  const filters = {
    vegan: searchIntent.booleanFilters.vegan ?? detectedBooleanFilters.vegan,
    alcoholFree: searchIntent.booleanFilters.alcoholFree ?? detectedBooleanFilters.alcoholFree,
    fragranceFree:
      searchIntent.booleanFilters.fragranceFree ?? detectedBooleanFilters.fragranceFree,
    spf: searchIntent.spf ?? detectSpfFilter(fallbackFilterMessage),
    sunscreen: wantsOnlySunscreen
      ? true
      : !process.env.OPENAI_API_KEY
        ? detectSunscreenIntent(fallbackFilterMessage)
        : undefined,
    pricePreference: searchIntent.pricePreference ?? detectPricePreference(fallbackFilterMessage),
    productCategory,
    excludedProductCategories: normalizeArray(searchIntent.excludedProductCategories),
  };
  const hasFilters = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined
  );

  if (process.env.OPENAI_API_KEY && !hasPositiveRetrievalIntent(searchIntent, filters)) {
    return [];
  }

  if (!retrievalMessage.trim() && !hasFilters) {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    return retrieveProductsByKeyword(retrievalMessage, filters);
  }

  try {
    const queryVector = toPgVector(await createEmbedding(retrievalMessage));

    const products = await prisma.$queryRawUnsafe(
      `
        SELECT
          p.*,
          pe.embedding <=> $1::vector AS distance
        FROM "ProductEmbedding" pe
        JOIN "Product" p ON p.id = pe."productId"
        ORDER BY pe.embedding <=> $1::vector
        LIMIT 80
      `,
      queryVector
    );

    const rankedProducts = products
      .filter((product) => productMatchesFilters(product, filters))
      .sort((a, b) => sortRetrievedProducts(a, b, filters));
    const selectedProducts = shouldDiversifyCategories(filters)
      ? diversifyByCategory(rankedProducts, (product) => product.category)
      : rankedProducts.slice(0, MAX_CONTEXT_PRODUCTS);
    const retrievedProducts = selectedProducts
      .map((product) => toChatProduct(product));

    if (retrievedProducts.length > 0) {
      return retrievedProducts;
    }
  } catch (error) {
    console.error("Failed to retrieve products by embedding:", error);
  }

  return retrieveProductsByKeyword(retrievalMessage, filters);
}

// If there is no OpenAI key, no matching context, or the model request fails,
// the endpoint still returns a useful response instead of breaking the chat UI.
function buildFallbackAnswer(products) {
  if (products.length === 0) {
    return "Ich habe in unserem aktuellen Sortiment leider keine gut passenden Produkte gefunden. Versuche es mit einer konkreteren Frage, zum Beispiel Hauttyp, Hautproblem oder gewünschter Eigenschaft wie vegan, alkoholfrei oder parfumfrei.";
  }

  return PRODUCT_RECOMMENDATION_ANSWER;
}

module.exports = {
  buildFallbackAnswer,
  parseProductSearchIntentJson,
  retrieveProducts,
  toChatProduct,
};
