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

function isFactTableUnavailable(error) {
  return (
    error?.code === "P2021" ||
    error?.code === "P2022" ||
    String(error?.message || "").includes("UserSkinProfileFact")
  );
}

function normalizeSkinType(value) {
  const text = String(value || "").trim().toLowerCase();

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

function looksProfileRelated(message) {
  const text = String(message || "").toLowerCase();
  const terms = [
    "my skin",
    "skin type",
    "sensitive",
    "dry",
    "oily",
    "acne",
    "pimple",
    "redness",
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
    "allerg",
    "vertragen",
    "肤质",
    "皮肤",
    "敏感",
    "干皮",
    "干性",
    "油皮",
    "油性",
    "混合皮",
    "痘",
    "泛红",
    "过敏",
    "不耐受",
    "避开",
  ];

  return terms.some((term) => text.includes(term));
}

function extractHeuristicFacts(message) {
  const text = String(message || "");
  const lower = text.toLowerCase();
  const facts = [];
  const skinType = normalizeSkinType(text);

  if (skinType) {
    facts.push({
      key: "skin_type",
      value: skinType,
      confidence: 0.86,
      evidence: text.slice(0, 240),
    });
  }

  const concernMatches = [
    { value: "acne", terms: ["acne", "akne", "pickel", "pimple", "breakout", "痘", "粉刺"] },
    { value: "redness", terms: ["redness", "rötung", "red", "泛红", "红"] },
    { value: "pores", terms: ["pores", "poren", "毛孔"] },
    { value: "dark_spots", terms: ["dark spots", "pigment", "色沉", "斑"] },
  ];

  for (const match of concernMatches) {
    if (match.terms.some((term) => lower.includes(term))) {
      facts.push({
        key: "concern",
        value: match.value,
        confidence: 0.76,
        evidence: text.slice(0, 240),
      });
    }
  }

  if (["dry", "trocken", "干", "紧绷", "起皮"].some((term) => lower.includes(term))) {
    facts.push({ key: "skin_state", value: "dryness", confidence: 0.76, evidence: text.slice(0, 240) });
  }

  if (["sensitive", "sensibel", "empfindlich", "敏感", "刺痛"].some((term) => lower.includes(term))) {
    facts.push({ key: "sensitivity", value: "sensitive", confidence: 0.78, evidence: text.slice(0, 240) });
  }

  return facts;
}

function normalizeFact(fact, message) {
  if (!fact || typeof fact !== "object") return null;

  const key = String(fact.key || "").trim();
  const rawValue = String(fact.value || "").trim();

  if (!FACT_KEYS.has(key) || !rawValue) return null;

  const value = key === "skin_type" ? normalizeSkinType(rawValue) : rawValue.slice(0, 80);
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

async function extractFacts(message) {
  const heuristicFacts = extractHeuristicFacts(message);

  if (!process.env.OPENAI_API_KEY) {
    return uniqueFacts(heuristicFacts);
  }

  const fallbackJson = JSON.stringify({ facts: heuristicFacts });
  const answer = await requestOpenAI(
    [
      {
        role: "system",
        content:
          "Extract only explicit skincare profile facts from the user's message. Do not infer. Return valid JSON only.",
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
      "value": "short normalized value",
      "confidence": 0.0-1.0,
      "evidence": "short exact phrase from user"
    }
  ]
}

Allowed skin_type values: Normal, Oily, Dry, Combination, Sensitive.
Examples:
- "我是敏感肌" -> {"key":"skin_type","value":"Sensitive"}
- "meine Haut ist sehr trocken" -> {"key":"skin_type","value":"Dry"}
- "I break out from fragrance" -> {"key":"ingredient_avoidance","value":"fragrance"}, {"key":"concern","value":"acne"}`,
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
      .filter(Boolean);

    return uniqueFacts([...heuristicFacts, ...normalizedFacts]);
  } catch {
    return uniqueFacts(heuristicFacts);
  }
}

async function saveSkinType(userId, facts) {
  const skinTypeFact = facts
    .filter((fact) => fact.key === "skin_type" && SKIN_TYPES.has(fact.value))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (!skinTypeFact || skinTypeFact.confidence < 0.72) return null;

  await prisma.user.update({
    where: { id: userId },
    data: { skinType: skinTypeFact.value },
  });

  return skinTypeFact.value;
}

async function saveFacts(userId, facts, source = "chat") {
  const saved = [];

  for (const fact of facts) {
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

  const skinType = await saveSkinType(userId, facts);
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

  const skinType = await saveSkinType(userId, facts);
  const savedFacts = await saveFacts(userId, facts, "review");

  return { facts: savedFacts, skinType };
}

async function captureUserSkinProfileFromMessage(userId, message) {
  if (!userId || !looksProfileRelated(message)) {
    return { facts: [], skinType: null };
  }

  const facts = await extractFacts(message);
  if (facts.length === 0) return { facts: [], skinType: null };

  const skinType = await saveSkinType(userId, facts);
  const savedFacts = await saveFacts(userId, facts);

  return { facts: savedFacts, skinType };
}

async function getUserSkinProfileFacts(userId) {
  if (!userId) return [];

  try {
    return await prisma.userSkinProfileFact.findMany({
      where: { userId },
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
};
