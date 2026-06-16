const prisma = require("../config/prisma");
const { requestOpenAI } = require("./chat/chat-openai.service");

const SKIN_TYPES = new Set(["Normal", "Oily", "Dry", "Combination", "Sensitive"]);
const FACT_KEYS = new Set([
  "skin_type",
  "concern",
  "skin_state",
  "sensitivity",
  "ingredient_avoidance",
  "allergy",
  "goal",
  "product_reaction",
  "preference",
]);
const DEPRECATED_FACT_KEYS = ["quiz_answer"];

const FACT_CATALOG = {
  concern: {
    acne: ["acne", "akne", "pickel", "pimple", "pimples", "breakout", "breakouts", "痘", "粉刺"],
    blemishes: ["blemishes", "unreinheiten", "imperfections", "瑕疵"],
    redness: ["redness", "rötung", "roetung", "red skin", "泛红", "红"],
    pores: ["pores", "poren", "large pores", "毛孔"],
    blackheads: ["blackheads", "blackhead", "mitesser", "黑头"],
    dark_spots: ["dark spots", "dark spot", "pigmentflecken", "hyperpigmentation", "色沉", "色斑"],
    dark_circles: ["dark circles", "dark circle", "augenringe", "黑眼圈"],
    wrinkles: ["wrinkles", "wrinkle", "fine lines", "falten", "细纹", "皱纹"],
  },
  skin_state: {
    balanced: ["balanced", "ausgeglichen", "normal skin", "normale haut", "平衡"],
    oily: ["oily", "fettig", "glänzend", "greasy skin", "fettige haut", "油皮", "出油"],
    oily_t_zone: ["oily t-zone", "oily t zone", "t-zone oily", "fettige t-zone", "stirn fettig", "nase fettig", "t区油"],
    dryness: ["dryness", "dry", "trockenheit", "trocken", "干", "干性"],
    dehydration: ["dehydrated", "feuchtigkeitsarm", "wasserarm", "缺水"],
    tightness: ["tightness", "spannt", "spannungsgefühl", "紧绷"],
    flakiness: ["flaky", "flakiness", "schuppt", "schuppig", "起皮"],
    rough_texture: ["rough", "rau", "uneven texture", "raue haut", "粗糙"],
    shine: ["shine", "glanz", "glänzt", "shiny", "泛油光"],
    refined_pores: ["refined pores", "small pores", "kaum sichtbare poren", "fine pores", "细腻毛孔"],
    clear_skin: ["clear skin", "rare blemishes", "selten unreinheiten", "少长痘"],
    matte: ["matte", "matt", "glanzlos", "哑光"],
    combination_zones: ["combination zones", "mischhaut", "gemischt", "混合区域"],
  },
  sensitivity: {
    sensitive: ["sensitive", "sensibel", "sensible", "empfindlich", "敏感", "刺痛"],
    tolerant: ["tolerant", "verträglich", "verträgt fast alles", "耐受"],
  },
  ingredient_avoidance: {
    fragrance: ["avoid fragrance", "without fragrance", "no fragrance", "ohne parfum", "kein parfum", "duftstofffrei", "避开香精"],
    alcohol: ["avoid alcohol", "without alcohol", "no alcohol", "ohne alkohol", "kein alkohol", "避开酒精"],
    retinol: ["avoid retinol", "without retinol", "no retinol", "ohne retinol", "kein retinol", "不用视黄醇"],
    vitamin_c: ["avoid vitamin c", "without vitamin c", "no vitamin c", "ohne vitamin c", "kein vitamin c", "不用维c"],
  },
  allergy: {
    fragrance: ["allergic to fragrance", "allergy to fragrance", "allergisch gegen parfum", "香精过敏"],
    alcohol: ["allergic to alcohol", "allergy to alcohol", "allergisch gegen alkohol", "酒精过敏"],
    retinol: ["allergic to retinol", "allergy to retinol", "视黄醇过敏"],
    niacinamide: ["allergic to niacinamide", "allergy to niacinamide", "niacinamid allergie", "烟酰胺过敏"],
    vitamin_c: ["allergic to vitamin c", "allergy to vitamin c", "维c过敏"],
  },
  goal: {
    hydration: ["hydration", "hydrate", "moisture", "moisturizing", "feuchtigkeit", "feutigkeit", "feuchtigkiet", "mehr feuchtigkeit", "mehr feutigkeit", "保湿", "补水"],
    calming: ["calming", "calm", "soothing", "beruhigung", "beruhigen", "舒缓"],
    glow: ["glow", "radiance", "glowing", "strahlen", "strahlend", "亮泽"],
    anti_aging: ["anti-aging", "anti aging", "anti-age", "aging", "wrinkle care", "falten", "抗老"],
    barrier_support: ["barrier", "skin barrier", "hautbarriere", "barriere", "屏障"],
    exfoliation: ["exfoliation", "exfoliate", "peeling", "aha", "bha", "salicylic", "salicyl", "刷酸", "水杨酸"],
    brightening: ["brightening", "aufhellung", "vitamin c", "vitamin-c", "提亮"],
    sun_protection: ["spf", "sunscreen", "sun protection", "sonnenschutz", "防晒"],
  },
  product_reaction: {
    burning: ["burning", "stinging", "sticht", "brennen", "刺痛", "灼热"],
    breakout: ["breakout", "break out", "pickel bekommen", "长痘", "爆痘"],
    redness: ["redness after", "causes redness", "rötung", "泛红"],
    too_greasy: ["too greasy", "zu fettig", "油腻", "太油"],
    drying: ["drying", "austrocknend", "austrocknet", "拔干", "太干"],
  },
  preference: {
    light_texture: ["lightweight", "light texture", "leichte textur", "leicht", "清爽", "轻薄"],
    rich_texture: ["rich texture", "reichhaltig", "滋润", "厚重"],
    fragrance_free: ["fragrance free", "fragrance-free", "parfumfrei", "duftstofffrei", "无香"],
    alcohol_free: ["alcohol free", "alcohol-free", "alkoholfrei", "无酒精"],
    vegan: ["vegan", "veganer", "vegane", "纯素"],
    non_comedogenic: ["non comedogenic", "non-comedogenic", "nicht komedogen", "不致痘"],
    oil_free: ["oil free", "oil-free", "ölfrei", "oelfrei", "无油"],
    cruelty_free: ["cruelty free", "cruelty-free", "tierversuchsfrei"],
    natural_ingredients: ["natural ingredients", "natürliche inhaltsstoffe", "naturkosmetik", "自然成分"],
  },
};

const ALLOWED_FACT_VALUES = Object.fromEntries(
  Object.entries(FACT_CATALOG).map(([key, values]) => [key, new Set(Object.keys(values))])
);
const PREFERENCE_VALUES = Object.keys(FACT_CATALOG.preference);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ");
}

function isFactTableUnavailable(error) {
  return (
    error?.code === "P2021" ||
    error?.code === "P2022" ||
    String(error?.message || "").includes("UserSkinProfileFact")
  );
}

function normalizeSkinType(value) {
  const text = normalizeText(value);

  if (["normal", "normale haut", "normal skin", "正常"].includes(text)) return "Normal";
  if (["oily", "fettig", "fettige haut", "油", "油性", "油皮"].includes(text)) return "Oily";
  if (["dry", "trocken", "trockene haut", "干", "干性", "干皮"].includes(text)) return "Dry";
  if (["combination", "mischhaut", "mixed", "混合", "混合皮"].includes(text)) return "Combination";
  if (["sensitive", "sensibel", "sensible haut", "empfindlich", "敏感", "敏感肌"].includes(text)) return "Sensitive";

  const compact = text.replace(/\s+/g, " ");
  if (compact.includes("sensitive") || compact.includes("sensibel") || compact.includes("敏感")) return "Sensitive";
  if (compact.includes("oily") || compact.includes("fettig") || compact.includes("油")) return "Oily";
  if (compact.includes("dry") || compact.includes("trocken") || compact.includes("干")) return "Dry";
  if (compact.includes("combination") || compact.includes("mischhaut") || compact.includes("混合")) return "Combination";
  if (compact.includes("normal") || compact.includes("正常")) return "Normal";

  return null;
}

function isNegatedNear(text, term) {
  const index = text.indexOf(term);
  if (index < 0) return false;

  const before = text.slice(Math.max(0, index - 28), index);
  const after = text.slice(index + term.length, index + term.length + 28);
  return /\b(no|not|dont|don't|without|kein|keine|nicht|avoid|meiden|ohne)\b/.test(before) ||
    /\b(no|not|dont|don't|kein|keine|nicht|avoid|meiden)\b/.test(after) ||
    /(不要|不用|不想|避免|避开)$/.test(before) ||
    /^(不要|不用|不想|避免|避开)/.test(after);
}

function getEditDistance(a, b, maxDistance) {
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[b.length];
}

function getFuzzyThreshold(term) {
  const length = term.replace(/\s+/g, "").length;
  if (length < 4) return 0;
  if (length < 6) return 1;
  if (length < 8) return 2;
  return 2;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExactTerm(text, normalizedTerm) {
  if (!/^[a-z0-9 ]+$/i.test(normalizedTerm)) {
    return text.includes(normalizedTerm);
  }

  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedTerm)}($|[^\\p{L}\\p{N}])`, "u");
  return pattern.test(text);
}

function getPhraseCandidates(text, wordCount) {
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  const candidates = [];

  for (let i = 0; i <= words.length - wordCount; i += 1) {
    candidates.push(words.slice(i, i + wordCount).join(" "));
  }

  return candidates;
}

function fuzzyTermMatches(text, normalizedTerm) {
  const threshold = getFuzzyThreshold(normalizedTerm);
  if (threshold === 0) return false;

  const wordCount = normalizedTerm.split(/\s+/).filter(Boolean).length;
  const termCompact = normalizedTerm.replace(/\s+/g, "");

  return getPhraseCandidates(text, wordCount).some((candidate) => {
    const candidateCompact = candidate.replace(/\s+/g, "");
    if (Math.abs(candidateCompact.length - termCompact.length) > threshold) return false;
    return getEditDistance(candidateCompact, termCompact, threshold) <= threshold &&
      !isNegatedNear(text, candidate);
  });
}

function termMatchType(text, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return null;

  if (hasExactTerm(text, normalizedTerm)) {
    return isNegatedNear(text, normalizedTerm) ? null : "exact";
  }

  if (fuzzyTermMatches(text, normalizedTerm)) {
    return "fuzzy";
  }

  return null;
}

function termMatches(text, term) {
  return Boolean(termMatchType(text, term));
}

function matchCatalogFacts(message) {
  const text = normalizeText(message);
  const evidence = String(message || "").slice(0, 240);
  const facts = [];

  for (const [key, values] of Object.entries(FACT_CATALOG)) {
    for (const [value, terms] of Object.entries(values)) {
      const matchType = terms.map((term) => termMatchType(text, term)).find(Boolean);

      if (matchType) {
        facts.push({ key, value, confidence: matchType === "exact" ? 0.78 : 0.7, evidence });
      }
    }
  }

  return facts;
}

function matchNegatedPreferenceValues(message) {
  const text = normalizeText(message);
  const values = [];

  for (const [value, terms] of Object.entries(FACT_CATALOG.preference)) {
    if (terms.some((term) => {
      const normalizedTerm = normalizeText(term);
      return text.includes(normalizedTerm) && isNegatedNear(text, normalizedTerm);
    })) {
      values.push(value);
    }
  }

  return [...new Set(values)];
}

function normalizeFactValue(key, value) {
  if (key === "skin_type") return normalizeSkinType(value);

  const text = normalizeText(value).replace(/[\s-]+/g, "_");
  const allowedValues = ALLOWED_FACT_VALUES[key];
  if (!allowedValues) return null;
  if (allowedValues.has(text)) return text;

  const catalog = FACT_CATALOG[key] || {};
  for (const [canonicalValue, terms] of Object.entries(catalog)) {
    if (canonicalValue === text || terms.some((term) => normalizeText(term).replace(/[\s-]+/g, "_") === text)) {
      return canonicalValue;
    }
  }

  return null;
}

function looksProfileRelated(message) {
  const text = normalizeText(message);
  const terms = [
    "my skin",
    "skin type",
    "sensitive",
    "dry",
    "oily",
    "acne",
    "pimple",
    "redness",
    "product",
    "products",
    "preference",
    "prefer",
    "i want",
    "i need",
    "looking for",
    "searching for",
    "vegan",
    "fragrance free",
    "fragrance-free",
    "alcohol free",
    "alcohol-free",
    "non comedogenic",
    "non-comedogenic",
    "oil free",
    "oil-free",
    "cruelty free",
    "cruelty-free",
    "natural ingredients",
    "allergy",
    "allergic",
    "avoid",
    "meine haut",
    "hauttyp",
    "sensibel",
    "empfindlich",
    "trocken",
    "fettig",
    "pickel",
    "akne",
    "rötung",
    "produkt",
    "produkte",
    "vorliebe",
    "vegan",
    "parfumfrei",
    "alkoholfrei",
    "nicht komedogen",
    "ölfrei",
    "tierversuchsfrei",
    "naturkosmetik",
    "allerg",
    "vertragen",
    ...Object.values(FACT_CATALOG)
      .flatMap((values) => Object.values(values))
      .flat()
  ];

  return terms.some((term) => text.includes(normalizeText(term)));
}

function extractHeuristicFacts(message) {
  const text = String(message || "");
  const facts = matchCatalogFacts(text);
  const skinType = normalizeSkinType(text);

  if (skinType) {
    facts.push({
      key: "skin_type",
      value: skinType,
      confidence: 0.86,
      evidence: text.slice(0, 240),
    });
  }

  return uniqueFacts(facts);
}

function normalizeFact(fact, message) {
  if (!fact || typeof fact !== "object") return null;

  const key = String(fact.key || "").trim();
  const rawValue = String(fact.value || "").trim();

  if (!FACT_KEYS.has(key) || !rawValue) return null;

  const value = normalizeFactValue(key, rawValue);
  if (!value) return null;

  return {
    key,
    value,
    confidence: Math.max(0, Math.min(1, Number(fact.confidence) || 0.7)),
    evidence: String(fact.evidence || message).slice(0, 240),
  };
}

function uniqueFacts(facts) {
  const seen = new Set();
  const result = [];

  for (const fact of facts) {
    const id = `${fact.key}:${fact.value}`;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(fact);
  }

  return result;
}

async function extractPreferenceFacts(message, heuristicPreferenceFacts) {
  const heuristicNegativePreferences = matchNegatedPreferenceValues(message);

  if (!process.env.OPENAI_API_KEY) {
    return {
      positiveFacts: heuristicPreferenceFacts,
      negativeValues: heuristicNegativePreferences,
    };
  }

  const fallbackJson = JSON.stringify({
    preferences: heuristicPreferenceFacts.map((fact) => ({
      value: fact.value,
      polarity: "positive",
      confidence: fact.confidence,
      evidence: fact.evidence,
    })),
  });

  const answer = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "Classify explicit skincare product preferences from the user's message. Return only valid JSON. Do not infer. Negative preferences must not be saved as positive preferences.",
      },
      {
        role: "user",
        content: `Message:
${message}

Return JSON:
{
  "preferences": [
    {
      "value": "one allowed preference value",
      "polarity": "positive|negative|neutral",
      "confidence": 0.0-1.0,
      "evidence": "short exact phrase from user"
    }
  ]
}

Allowed preference values:
${PREFERENCE_VALUES.join(", ")}

Rules:
- positive means the user wants, likes, prefers, needs, or requests this preference.
- negative means the user rejects, dislikes, avoids, or says they do not want this preference.
- neutral means the user only asks about a product/ingredient/property without expressing a personal preference.
- Return no item for product names, full questions, temporary browsing intent, or unknown values.
- Save only durable user profile preferences, not every product search query.

Examples:
- "I want vegan products" -> {"value":"vegan","polarity":"positive"}
- "ich mag vegan nicht" -> {"value":"vegan","polarity":"negative"}
- "I don't want vegan products" -> {"value":"vegan","polarity":"negative"}
- "Ist dieses Produkt vegan?" -> {"value":"vegan","polarity":"neutral"}
- "ohne Alkohol bitte" -> {"value":"alcohol_free","polarity":"positive"}`,
      },
    ],
    fallbackJson,
    { maxOutputTokens: 260 }
  );

  try {
    const parsed = JSON.parse(answer.replace(/```json|```/g, "").trim());
    const preferences = Array.isArray(parsed.preferences) ? parsed.preferences : [];
    const negativeValues = preferences
      .filter((item) => item && item.polarity === "negative")
      .map((item) => normalizeFactValue("preference", item.value))
      .filter(Boolean);
    const allNegativeValues = [...new Set([...heuristicNegativePreferences, ...negativeValues])];
    const positiveFacts = preferences
      .filter((item) => item && item.polarity === "positive")
      .map((item) => normalizeFact({
        key: "preference",
        value: item.value,
        confidence: item.confidence,
        evidence: item.evidence,
      }, message))
      .filter(Boolean)
      .filter((fact) => !allNegativeValues.includes(fact.value));

    return {
      positiveFacts,
      negativeValues: allNegativeValues,
    };
  } catch {
    return {
      positiveFacts: heuristicPreferenceFacts,
      negativeValues: heuristicNegativePreferences,
    };
  }
}

async function extractFacts(message) {
  const heuristicFacts = extractHeuristicFacts(message);
  const heuristicNonPreferenceFacts = heuristicFacts.filter((fact) => fact.key !== "preference");
  const heuristicPreferenceFacts = heuristicFacts.filter((fact) => fact.key === "preference");
  const preferenceExtraction = await extractPreferenceFacts(message, heuristicPreferenceFacts);

  if (!process.env.OPENAI_API_KEY) {
    return {
      facts: uniqueFacts([...heuristicNonPreferenceFacts, ...preferenceExtraction.positiveFacts]),
      negativePreferenceValues: preferenceExtraction.negativeValues,
    };
  }

  const fallbackJson = JSON.stringify({ facts: heuristicFacts });
  const answer = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "Extract only explicit, durable skincare profile facts from the user's message. Do not infer. Do not store product names, full questions, temporary shopping intent, or unknown values. Return valid JSON only.",
      },
      {
        role: "user",
        content: `Message:
${message}

Return JSON:
{
  "facts": [
    {
      "key": "skin_type|concern|skin_state|sensitivity|ingredient_avoidance|allergy|goal|product_reaction|preference",
      "value": "one allowed value listed below",
      "confidence": 0.0-1.0,
      "evidence": "short exact phrase from user"
    }
  ]
}

Allowed skin_type values: Normal, Oily, Dry, Combination, Sensitive.
Allowed concern values: acne, blemishes, redness, pores, blackheads, dark_spots, dark_circles, wrinkles.
Allowed skin_state values: dryness, oily_t_zone.
Allowed sensitivity values: sensitive.
Allowed ingredient_avoidance values: fragrance, alcohol, retinol, vitamin_c.
Allowed allergy values: fragrance, alcohol, retinol, niacinamide, vitamin_c.
Allowed goal values: hydration, calming, glow, anti_aging, barrier_support, exfoliation, brightening, sun_protection.
Allowed product_reaction values: burning, breakout, redness, too_greasy, drying.
Allowed preference values: light_texture, rich_texture, fragrance_free, alcohol_free, vegan, non_comedogenic, oil_free, cruelty_free, natural_ingredients.
Examples:
- "我是敏感肌" -> {"key":"skin_type","value":"Sensitive"}
- "meine Haut ist sehr trocken" -> {"key":"skin_type","value":"Dry"}
- "I want vegan products" -> {"key":"preference","value":"vegan"}
- "I break out from fragrance" -> {"key":"ingredient_avoidance","value":"fragrance"}, {"key":"product_reaction","value":"breakout"}
- "Does product X suit oily skin?" -> {"key":"skin_type","value":"Oily"} only if the user states oily skin as their own skin type; otherwise return no facts.`,
      },
    ],
    fallbackJson,
    { maxOutputTokens: 350 }
  );

  try {
    const parsed = JSON.parse(answer.replace(/```json|```/g, "").trim());
    const facts = Array.isArray(parsed.facts) ? parsed.facts : [];
    const normalizedFacts = facts
      .map((fact) => normalizeFact(fact, message))
      .filter(Boolean)
      .filter((fact) => fact.key !== "preference");

    return {
      facts: uniqueFacts([...heuristicNonPreferenceFacts, ...normalizedFacts, ...preferenceExtraction.positiveFacts]),
      negativePreferenceValues: preferenceExtraction.negativeValues,
    };
  } catch {
    return {
      facts: uniqueFacts([...heuristicNonPreferenceFacts, ...preferenceExtraction.positiveFacts]),
      negativePreferenceValues: preferenceExtraction.negativeValues,
    };
  }
}

function getCurrentSkinTypeFromFacts(facts) {
  const skinTypeFact = facts
    .filter((fact) => fact.key === "skin_type" && SKIN_TYPES.has(fact.value))
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      if (aTime !== bTime) return bTime - aTime;
      return Number(b.confidence || 0) - Number(a.confidence || 0);
    })[0];

  return skinTypeFact?.value || null;
}

function getBestExtractedSkinTypeFact(facts) {
  return facts
    .filter((fact) => fact.key === "skin_type" && SKIN_TYPES.has(fact.value))
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0] || null;
}

async function saveSkinType(userId, facts, source = "chat") {
  const skinTypeFact = getBestExtractedSkinTypeFact(facts);

  if (!skinTypeFact || skinTypeFact.confidence < 0.72) return null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { skinType: skinTypeFact.value },
    });

    await tx.userSkinProfileFact.deleteMany({
      where: {
        userId,
        key: "skin_type",
      },
    });

    await tx.userSkinProfileFact.create({
      data: {
        userId,
        key: "skin_type",
        value: skinTypeFact.value,
        source,
        confidence: skinTypeFact.confidence,
        evidence: skinTypeFact.evidence,
      },
    });
  });

  return skinTypeFact.value;
}

async function saveFacts(userId, facts, source = "chat") {
  const saved = [];

  for (const fact of facts) {
    if (!FACT_KEYS.has(fact.key) || DEPRECATED_FACT_KEYS.includes(fact.key)) continue;
    if (fact.key === "skin_type") continue;

    try {
      await prisma.userSkinProfileFact.upsert({
        where: {
          userId_key_value: {
            userId,
            key: fact.key,
            value: fact.value,
          },
        },
        create: {
          userId,
          key: fact.key,
          value: fact.value,
          source,
          confidence: fact.confidence,
          evidence: fact.evidence,
        },
        update: {
          source,
          confidence: fact.confidence,
          evidence: fact.evidence,
        },
      });
      saved.push(fact);
    } catch (error) {
      if (isFactTableUnavailable(error)) {
        console.warn("User skin profile facts table is unavailable; skipping fact storage.");
        return saved;
      }

      throw error;
    }
  }

  return saved;
}

function buildSkinAnalysisFacts(analysis) {
  const facts = [];
  const skinType = normalizeSkinType(analysis.skinType);
  const evidence = analysis.overall || `Skin analysis ${analysis.id}`;

  if (skinType) {
    facts.push({
      key: "skin_type",
      value: skinType,
      confidence: 0.92,
      evidence,
    });
  }

  if (Number(analysis.dryness) >= 55) {
    facts.push({
      key: "skin_state",
      value: "dryness",
      confidence: Math.min(0.95, Number(analysis.dryness) / 100),
      evidence: `Skin analysis dryness: ${analysis.dryness}/100. ${evidence}`,
    });
  }

  if (Number(analysis.redness) >= 45) {
    facts.push({
      key: "concern",
      value: "redness",
      confidence: Math.min(0.95, Number(analysis.redness) / 100),
      evidence: `Skin analysis redness: ${analysis.redness}/100. ${evidence}`,
    });
  }

  if (Number(analysis.blemishes) >= 45) {
    facts.push({
      key: "concern",
      value: "blemishes",
      confidence: Math.min(0.95, Number(analysis.blemishes) / 100),
      evidence: `Skin analysis blemishes: ${analysis.blemishes}/100. ${evidence}`,
    });
  }

  if (Number(analysis.sensitivity) >= 45) {
    facts.push({
      key: "sensitivity",
      value: "sensitive",
      confidence: Math.min(0.95, Number(analysis.sensitivity) / 100),
      evidence: `Skin analysis sensitivity: ${analysis.sensitivity}/100. ${evidence}`,
    });
  }

  return uniqueFacts(facts);
}

async function captureSkinAnalysisProfileFacts(userId, analysis) {
  if (!userId || !analysis) return { facts: [], skinType: null };

  const facts = buildSkinAnalysisFacts(analysis);
  if (facts.length === 0) return { facts: [], skinType: null };

  const skinType = await saveSkinType(userId, facts, "skin_analysis");
  const savedFacts = await saveFacts(userId, facts, "skin_analysis");

  return { facts: savedFacts, skinType };
}

function extractReviewFacts(reviewText, product) {
  const text = String(reviewText || "");
  const lower = text.toLowerCase();
  const facts = extractHeuristicFacts(text);
  const evidencePrefix = product?.name ? `${product.name}: ` : "";

  const reactionMatches = [
    { value: "burning", terms: ["burn", "brennen", "sticht", "刺痛", "灼热"] },
    { value: "breakout", terms: ["breakout", "pickel", "akne", "pimple", "长痘", "爆痘"] },
    { value: "redness", terms: ["redness", "rötung", "泛红"] },
    { value: "too_greasy", terms: ["too greasy", "zu fettig", "油腻", "太油"] },
    { value: "drying", terms: ["drying", "austrockn", "trocken", "拔干", "太干"] },
  ];

  for (const match of reactionMatches) {
    if (match.terms.some((term) => lower.includes(term))) {
      facts.push({
        key: "product_reaction",
        value: match.value,
        confidence: 0.76,
        evidence: `${evidencePrefix}${text}`.slice(0, 240),
      });
    }
  }

  const preferenceMatches = [
    { value: "light_texture", terms: ["lightweight", "leicht", "轻薄", "清爽"] },
    { value: "rich_texture", terms: ["reichhaltig", "rich", "滋润", "厚重"] },
    { value: "fragrance_free", terms: ["parfumfrei", "fragrance free", "无香"] },
    { value: "alcohol_free", terms: ["alkoholfrei", "alcohol free", "无酒精"] },
    { value: "vegan", terms: ["vegan", "veganer", "vegane", "纯素"] },
    { value: "non_comedogenic", terms: ["nicht komedogen", "non comedogenic", "non-comedogenic", "不致痘"] },
    { value: "oil_free", terms: ["ölfrei", "oil free", "oil-free", "无油"] },
    { value: "cruelty_free", terms: ["tierversuchsfrei", "cruelty free", "cruelty-free"] },
    { value: "natural_ingredients", terms: ["natürliche inhaltsstoffe", "natural ingredients", "自然成分"] },
  ];

  for (const match of preferenceMatches) {
    if (match.terms.some((term) => lower.includes(term))) {
      facts.push({
        key: "preference",
        value: match.value,
        confidence: 0.7,
        evidence: `${evidencePrefix}${text}`.slice(0, 240),
      });
    }
  }

  return uniqueFacts(facts);
}

async function captureReviewProfileFacts(userId, reviewText, product) {
  if (!userId || !reviewText) return { facts: [], skinType: null };

  const facts = extractReviewFacts(reviewText, product);
  if (facts.length === 0) return { facts: [], skinType: null };

  const skinType = await saveSkinType(userId, facts, "review");
  const savedFacts = await saveFacts(userId, facts, "review");

  return { facts: savedFacts, skinType };
}

async function captureUserSkinProfileFromMessage(userId, message) {
  if (!userId || !looksProfileRelated(message)) {
    return { facts: [], skinType: null, changed: false, removedPreferences: [] };
  }

  const { facts, negativePreferenceValues } = await extractFacts(message);
  let removedPreferences = [];

  if (negativePreferenceValues.length > 0) {
    const deleteResult = await prisma.userSkinProfileFact.deleteMany({
      where: {
        userId,
        key: "preference",
        value: { in: negativePreferenceValues },
      },
    });
    if (deleteResult.count > 0) {
      removedPreferences = negativePreferenceValues;
    }
  }

  if (facts.length === 0) {
    return {
      facts: [],
      skinType: null,
      changed: removedPreferences.length > 0,
      removedPreferences,
    };
  }

  const skinType = await saveSkinType(userId, facts);
  const savedFacts = await saveFacts(userId, facts);

  return {
    facts: savedFacts,
    skinType,
    changed: savedFacts.length > 0 || Boolean(skinType) || removedPreferences.length > 0,
    removedPreferences,
  };
}

async function getUserSkinProfileFacts(userId) {
  if (!userId) return [];

  try {
    await prisma.userSkinProfileFact.deleteMany({
      where: {
        userId,
        key: { in: DEPRECATED_FACT_KEYS },
      },
    });

    return await prisma.userSkinProfileFact.findMany({
      where: {
        userId,
        key: { notIn: DEPRECATED_FACT_KEYS },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
  } catch (error) {
    if (isFactTableUnavailable(error)) return [];
    throw error;
  }
}

module.exports = {
  captureUserSkinProfileFromMessage,
  captureSkinAnalysisProfileFacts,
  captureReviewProfileFacts,
  getUserSkinProfileFacts,
  getCurrentSkinTypeFromFacts,
};
