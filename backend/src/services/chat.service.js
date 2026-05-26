const prisma = require("../config/prisma");

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_OPENAI_TIMEOUT_MS = 20000;
const DEFAULT_OPENAI_MAX_OUTPUT_TOKENS = 450;
const DEFAULT_OPENAI_REASONING_EFFORT = "minimal";
const DEFAULT_OPENAI_VERBOSITY = "low";
const MAX_CONTEXT_PRODUCTS = 6;
const MAX_FOLLOW_UP_HISTORY = 4;
const MAX_FOLLOW_UP_PRODUCTS = 3;
const MAX_PROMPT_DESCRIPTION_LENGTH = 600;
const MAX_PROMPT_INGREDIENTS_LENGTH = 800;
const MIN_RELEVANCE_SCORE = 2;
const PRODUCT_RECOMMENDATION_ANSWER =
  "Ich habe folgende passende Produkte aus unserem Sortiment für dich gefunden. Das ist keine medizinische Diagnose, sondern eine Produktempfehlung auf Basis deiner Anfrage.";
const GENERAL_SKINCARE_FALLBACK_ANSWER =
  "- Ich kann dir bei Hauttyp, Hautpflege-Routine, Inhaltsstoffen und passenden SelfGlow-Produkten helfen.\n- Sag mir gern, welches Hautanliegen du hast oder ob du ein bestimmtes Produkt suchst.";
const OFF_TOPIC_ANSWER =
  "- Ich kann dir hier nur bei Hautpflege, Hauttypen, Inhaltsstoffen und passenden SelfGlow-Produkten helfen.\n- Frag mich gern nach einer Routine, einem Hautanliegen oder Produkteigenschaften wie vegan, parfumfrei oder alkoholfrei.";
const CHAT_DECISION_FALLBACK = {
  intent: "skincare_general",
};
const AI_RESPONSE_FORMAT_INSTRUCTIONS = `
Response style:
- Use clear Markdown formatting.
- Do not start with the fixed heading "**Kurz erklärt**".
- Split the answer into 1-3 short sections with bold section labels only when they add clarity.
- Put a blank line between sections.
- Use bullet points inside each section.
- Write at most 2 bullet points per section unless the customer explicitly asks for more detail.
- Each bullet point should be one concise sentence.
- Add "---" before a final safety or uncertainty note when needed.
- Avoid long paragraphs and marketing language.
`;

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
  "which",
  "with",
  "you",
  "better",
  "best",
  "one",
  "ich",
  "bin",
  "besser",
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
  "welche",
  "welcher",
  "welches",
]);

// Phase 1 does not use embeddings, so we manually expand common skincare words.
// This makes keyword search more forgiving across English/German wording and
// common synonyms, e.g. "acne", "Akne", "Pickel", and "Unreinheiten".
const queryAliases = {
  acne: [
    "acne",
    "akne",
    "blemish",
    "blemishes",
    "unreinheiten",
    "pickel",
    "mitesser",
    "breakout",
    "breakouts",
    "hautunreinheiten",
    "unreine",
    "unrein",
  ],
  aging: [
    "aging",
    "anti-aging",
    "antiaging",
    "anti age",
    "anti-age",
    "falten",
    "age",
    "wrinkle",
    "wrinkles",
    "fine lines",
    "linien",
    "straffend",
    "firming",
  ],
  barrier: [
    "barrier",
    "skin barrier",
    "hautbarriere",
    "schutzbarriere",
    "barriere",
    "repair",
    "reparierend",
    "regeneration",
    "regenerierend",
  ],
  blackheads: ["blackhead", "blackheads", "mitesser", "komedonen", "comedones"],
  brightening: [
    "brightening",
    "glow",
    "glowing",
    "radiance",
    "strahlen",
    "strahlend",
    "ausstrahlung",
    "teint",
    "dull",
    "dullness",
    "fahl",
  ],
  cleanser: [
    "cleanser",
    "cleansing",
    "clean",
    "reinigung",
    "reiniger",
    "gesichtsreiniger",
    "gesischtsreinigung",
    "reinigungsgel",
    "reinigungsschaum",
    "schaum",
    "reinigungsoel",
    "reinigungsöl",
    "cleansing oil",
    "balsam",
    "balm",
    "make-up-entferner",
    "abschminken",
    "abschmink",
    "makeup",
    "make-up",
  ],
  combination: ["combination", "combination skin", "mischhaut"],
  darkSpots: [
    "dark spot",
    "dark spots",
    "pigment",
    "pigmentflecken",
    "anti pigment",
    "hyperpigmentation",
    "melasma",
    "flecken",
    "spots",
    "uneven tone",
    "unregelmaessiger teint",
    "unregelmäßiger teint",
  ],
  dry: [
    "dry",
    "dry skin",
    "trocken",
    "trockene",
    "trockene haut",
    "hydrating",
    "hydration",
    "hydrate",
    "feuchtigkeit",
    "feuchtigkeitsspendend",
    "moisture",
    "moisturizing",
    "dehydrated",
    "dehydriert",
  ],
  exfoliation: [
    "exfoliant",
    "exfoliating",
    "exfoliate",
    "peeling",
    "peel",
    "aha",
    "bha",
    "pha",
    "salicylic",
    "salicylsaure",
    "salicylsäure",
    "glycolic",
    "glykol",
    "lactic",
    "milchsäure",
    "milchsaure",
  ],
  eyeCare: ["eye cream", "augencreme", "augenpflege", "eye", "eyes", "augen"],
  mask: ["mask", "maske", "sheet mask", "tuchmaske", "overnight mask", "sleeping mask"],
  moisturizer: [
    "moisturizer",
    "moisturiser",
    "moisturizing",
    "feuchtigkeitscreme",
    "feuchtigkeitspflege",
    "tagescreme",
    "nachtcreme",
    "day cream",
    "night cream",
    "cream",
    "creme",
    "lotion",
    "gel cream",
    "gel-creme",
  ],
  normal: ["normal", "normal skin", "normale haut"],
  oily: [
    "oily",
    "oily skin",
    "ölig",
    "oelige",
    "oelig",
    "fettig",
    "fettige",
    "oil control",
    "oil-control",
    "mattierend",
    "mattifying",
    "shine",
    "glanz",
    "talg",
    "sebum",
  ],
  pores: [
    "pores",
    "poren",
    "large pores",
    "enlarged pores",
    "grosse poren",
    "große poren",
    "pore",
    "pore control",
    "verfeinert",
    "verfeinertes hautbild",
  ],
  redness: [
    "redness",
    "red",
    "rötungen",
    "roetungen",
    "beruhigend",
    "beruhigen",
    "calming",
    "soothing",
    "irritation",
    "irritationen",
  ],
  sensitive: [
    "sensitive",
    "sensitive skin",
    "sensibel",
    "empfindlich",
    "empfindliche haut",
    "reizungen",
    "irritationen",
    "gentle",
    "mild",
    "sanft",
    "verträglich",
    "vertraeglich",
  ],
  serum: ["serum", "ampoule", "ampulle", "essence", "essenz", "booster", "concentrate"],
  sunscreen: [
    "sunscreen",
    "sun screen",
    "sun protection",
    "sonnenschutz",
    "sonnencreme",
    "uv",
    "spf",
    "lsf",
    "lf",
    "lichtschutzfaktor",
  ],
  texture: [
    "texture",
    "textur",
    "uneven texture",
    "hautbild",
    "glatt",
    "smooth",
    "smoother",
    "ebenmaessig",
    "ebenmäßig",
  ],
  toner: ["toner", "tonic", "gesichtswasser", "pads", "toner-pads", "lotion tonique"],
  vitaminC: ["vitamin c", "vitamin-c", "ascorbic", "ascorbinsäure", "ascorbinsaure"],
};

const ingredientAliases = {
  aloe: ["aloe", "aloe vera"],
  allantoin: ["allantoin"],
  azelaic: ["azelaic", "azelainsäure", "azelainsaure"],
  bakuchiol: ["bakuchiol"],
  ceramide: ["ceramide", "ceramides", "ceramid", "ceramide"],
  centella: ["centella", "cica", "asiatica"],
  collagen: ["collagen", "kollagen"],
  ectoin: ["ectoin", "ectoine"],
  glycerin: ["glycerin", "glycerine"],
  ginseng: ["ginseng"],
  glycolic: ["glycolic", "glycolsäure", "glycolsaure", "glykolsaure", "glykol"],
  greenTea: ["green tea", "grüner tee", "gruener tee", "tea extract"],
  heartleaf: ["heartleaf", "houttuynia", "houttuynia cordata"],
  hyaluronic: [
    "hyaluronic",
    "hyaluron",
    "hyaluronsäure",
    "hyaluronsaure",
    "sodium hyaluronate",
  ],
  lactic: ["lactic", "lactic acid", "milchsäure", "milchsaure"],
  niacinamide: ["niacinamide", "niacinamid"],
  oat: ["oat", "hafer", "avena"],
  peptide: ["peptide", "peptides", "peptid", "peptide"],
  panthenol: ["panthenol", "vitamin b5", "b5"],
  retinol: ["retinol", "retinal", "retinoid"],
  salicylic: ["salicylic", "salicylsäure", "salicylsaure", "bha"],
  shea: ["shea", "shea butter", "shea-butter", "sheabutter", "karite"],
  squalane: ["squalane", "squalan"],
  teaTree: ["tea tree", "teebaum"],
  tranexamic: ["tranexamic", "tranexamsäure", "tranexamsaure", "txa"],
  urea: ["urea"],
  zinc: ["zinc", "zink", "zinc pca"],
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

function normalizeSearchTerm(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function truncatePromptText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();

  if (!text) {
    return "not available";
  }

  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function addTermVariants(term, terms) {
  terms.add(term);

  if (term.length > 4) {
    terms.add(term.replace(/(en|er|es|e|s)$/i, ""));
  }

  if (term.includes(" ")) {
    terms.add(term.replace(/\s+/g, ""));
  }
}

// Extract searchable terms from the customer message. The result becomes the
// keyword part of the RAG retrieval step.
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
    if (["spf", "sunscreen", "pricePreference"].includes(key)) continue;

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

// Keyword RAG retrieval step. Instead of vector search, this uses Prisma
// contains queries over the current Product table, then reranks candidates in JS.
async function retrieveProducts(message) {
  const terms = extractTerms(message);
  const filters = {
    ...detectBooleanFilters(message),
    spf: detectSpfFilter(message),
    sunscreen: detectSunscreenIntent(message),
    pricePreference: detectPricePreference(message),
  };
  const hasFilters = Object.values(filters).some((value) => value !== undefined);

  if (terms.length === 0 && !hasFilters) {
    return [];
  }

  if (filters.sunscreen) {
    return retrieveSunscreenProducts(filters);
  }

  const where = {};

  // Add exact boolean filters first. Example: "parfumfrei" should prefer only
  // products where fragranceFree is true.
  for (const [key, value] of Object.entries(filters)) {
    if (["spf", "sunscreen", "pricePreference"].includes(key)) continue;

    if (value !== undefined && key !== "category") {
      where[key] = value;
    }
  }

  // Search the most useful product text fields. Prisma combines this OR block
  // with any exact boolean filters above.
  const searchClauses = [];

  if (terms.length > 0 && !filters.sunscreen) {
    searchClauses.push(...terms.flatMap((term) => [
      { name: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { ingredients: { contains: term, mode: "insensitive" } },
      { skinTypes: { contains: term, mode: "insensitive" } },
      { concerns: { contains: term, mode: "insensitive" } },
    ]));
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

  // Fallback retrieval: SQL contains search can miss terms because of accents,
  // spelling variants, or language differences. If it finds too few rows, fetch
  // a broader filtered set and let the local scoring function rank it.
  if (products.length < 3 && (terms.length > 0 || filters.spf)) {
    const broadWhere = {};

    if (filters.sunscreen) {
      broadWhere.category = { contains: "Sonnenschutz", mode: "insensitive" };
    }

    for (const [key, value] of Object.entries(filters)) {
      if (["spf", "sunscreen", "pricePreference"].includes(key)) continue;

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

  if (filters.spf) {
    const exactSpfProducts = products.filter((product) =>
      extractProductSpfValues(product).has(filters.spf)
    );

    if (exactSpfProducts.length > 0) {
      products = exactSpfProducts;
    }
  }

  if (filters.sunscreen) {
    const sunscreenProducts = products.filter((product) =>
      normalizeText(product.category).includes("sonnenschutz")
    );

    if (sunscreenProducts.length > 0) {
      products = sunscreenProducts;
    }
  }

  // Score, sort, limit, and shape the retrieved products before sending them to
  // the model or frontend. These products are the "context" in keyword RAG.
  return products
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
    })
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

function readPositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function buildOpenAIRequestBody(messages, maxOutputTokens) {
  const instructions = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .filter(Boolean)
    .join("\n\n");
  const input = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  return {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    instructions,
    input,
    max_output_tokens: maxOutputTokens,
    reasoning: {
      effort: process.env.OPENAI_REASONING_EFFORT || DEFAULT_OPENAI_REASONING_EFFORT,
    },
    text: {
      verbosity: process.env.OPENAI_VERBOSITY || DEFAULT_OPENAI_VERBOSITY,
    },
  };
}

function extractOpenAIText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  const outputText = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        outputText.push(content.text);
      }
    }
  }

  return outputText.join("").trim();
}

async function requestOpenAI(messages, fallbackAnswer, options = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnswer;
  }

  const timeoutMs = readPositiveInteger(
    process.env.OPENAI_TIMEOUT_MS,
    DEFAULT_OPENAI_TIMEOUT_MS
  );
  const maxOutputTokens = readPositiveInteger(
    options.maxOutputTokens || process.env.OPENAI_MAX_OUTPUT_TOKENS,
    DEFAULT_OPENAI_MAX_OUTPUT_TOKENS
  );
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        ...buildOpenAIRequestBody(messages, maxOutputTokens),
        ...(options.textFormat ? { text: options.textFormat } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return fallbackAnswer;
    }

    const data = await response.json();
    return extractOpenAIText(data) || fallbackAnswer;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`OpenAI API request timed out after ${timeoutMs}ms`);
    } else {
      console.error("OpenAI API request failed:", error);
    }
    return fallbackAnswer;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function streamOpenAI(messages, fallbackAnswer, onDelta) {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnswer;
  }

  const timeoutMs = readPositiveInteger(
    process.env.OPENAI_TIMEOUT_MS,
    DEFAULT_OPENAI_TIMEOUT_MS
  );
  const maxOutputTokens = readPositiveInteger(
    process.env.OPENAI_MAX_OUTPUT_TOKENS,
    DEFAULT_OPENAI_MAX_OUTPUT_TOKENS
  );
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let fullAnswer = "";

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        ...buildOpenAIRequestBody(messages, maxOutputTokens),
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API stream error:", errorText);
      return fallbackAnswer;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const delta = extractSseTextDelta(event);

        if (delta) {
          fullAnswer += delta;
          onDelta(delta);
        }
      }
    }

    buffer += decoder.decode();
    const finalDelta = extractSseTextDelta(buffer);

    if (finalDelta) {
      fullAnswer += finalDelta;
      onDelta(finalDelta);
    }

    return fullAnswer.trim() || fallbackAnswer;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`OpenAI API stream timed out after ${timeoutMs}ms`);
    } else {
      console.error("OpenAI API stream failed:", error);
    }
    return fullAnswer.trim() || fallbackAnswer;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractSseTextDelta(event) {
  const dataLines = event
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  for (const dataLine of dataLines) {
    if (!dataLine || dataLine === "[DONE]") continue;

    try {
      const data = JSON.parse(dataLine);

      if (data.type === "response.output_text.delta" && typeof data.delta === "string") {
        return data.delta;
      }
    } catch {
      // Ignore non-JSON stream housekeeping lines.
    }
  }

  return "";
}

function parseChatDecision(rawDecision, message) {
  try {
    const jsonText = rawDecision.match(/\{[\s\S]*\}/)?.[0] || rawDecision;
    const parsedDecision = JSON.parse(jsonText);
    const allowedIntents = new Set([
      "product_search",
      "skincare_general",
      "greeting",
      "off_topic",
    ]);

    if (allowedIntents.has(parsedDecision.intent)) {
      return {
        intent: parsedDecision.intent,
      };
    }
  } catch {
    // Fall through to the conservative local fallback.
  }

  return inferChatIntentLocally(message);
}

async function decideChatIntent(message, history = []) {
  if (!process.env.OPENAI_API_KEY) {
    return inferChatIntentLocally(message);
  }

  const conversationHistory = history
    .slice(-MAX_FOLLOW_UP_HISTORY)
    .map((item) => `${item.role === "assistant" ? "Assistant" : "Customer"}: ${item.content}`)
    .join("\n");

  const rawDecision = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "Classify SelfGlow chat messages. Return only JSON with one key: intent.",
      },
      {
        role: "user",
        content: `
Choose exactly one intent:
- product_search: customer wants suitable products, recommendations, shopping help, a routine with products, or asks which product to buy/use.
- skincare_general: customer asks a general skincare, ingredient, skin type, routine, or cosmetic-use question without asking for concrete products.
- greeting: customer only greets, thanks, or starts small talk in a skincare assistant context.
- off_topic: customer asks about anything outside skincare, beauty routines, cosmetic ingredients, or SelfGlow shopping support.

Recent conversation:
${conversationHistory || "No previous conversation."}

Customer message:
${message}

JSON only:
`,
      },
    ],
    JSON.stringify(CHAT_DECISION_FALLBACK),
    {
      maxOutputTokens: 80,
    }
  );

  return parseChatDecision(rawDecision, message);
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
  const decision = await decideChatIntent(message, history);

  if (decision.intent === "off_topic") {
    return {
      answer: OFF_TOPIC_ANSWER,
      products: [],
      canExplainProducts: false,
      usedFallback: false,
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

  const products = await retrieveProducts(message);
  const contextProducts =
    products.length === 0 && process.env.OPENAI_API_KEY
      ? await getContextProducts(contextProductIds)
      : [];
  const answer = await createOpenAIAnswer(message, products, history, contextProducts);

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
  const decision = await decideChatIntent(message, history);

  if (decision.intent === "off_topic") {
    return {
      answer: OFF_TOPIC_ANSWER,
      products: [],
      canExplainProducts: false,
      usedFallback: false,
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

  const products = await retrieveProducts(message);
  const contextProducts =
    products.length === 0 && process.env.OPENAI_API_KEY
      ? await getContextProducts(contextProductIds)
      : [];

  if (products.length > 0 || !process.env.OPENAI_API_KEY) {
    return {
      answer: await createOpenAIAnswer(message, products, history, contextProducts),
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
        content: buildGeneralPrompt(message, history, contextProducts),
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
