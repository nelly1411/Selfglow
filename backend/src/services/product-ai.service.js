const prisma = require("../config/prisma");
const crypto = require("node:crypto");
const { requestOpenAI } = require("./chat/chat-openai.service");

const PRODUCT_EXPLANATION_PROMPT_VERSION = "product-explanation-v1";
const PRODUCT_AI_FALLBACK =
  "- Die KI-Erklärung ist gerade nicht verfügbar.\n- Du kannst die Inhaltsstoffliste trotzdem prüfen und bei sensibler Haut neue Produkte erst an einer kleinen Stelle testen.";

function compactText(value, maxLength = 1600) {
  if (!value) return "";

  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function parseStoredJson(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getProductContext(product) {
  return {
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: compactText(product.description, 900),
    ingredients: compactText(product.ingredients, 1800),
    skinTypes: product.skinTypes || null,
    concerns: product.concerns || null,
    flags: {
      alcoholFree: product.alcoholFree,
      fragranceFree: product.fragranceFree,
      vegan: product.vegan,
    },
  };
}

function getProductExplanationHash(product) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        promptVersion: PRODUCT_EXPLANATION_PROMPT_VERSION,
        product: getProductContext(product),
      })
    )
    .digest("hex");
}

function isCacheTableUnavailable(error) {
  return (
    error?.code === "P2021" ||
    error?.code === "P2022" ||
    String(error?.message || "").includes("ProductAiExplanation")
  );
}

async function findCachedExplanation(productId) {
  try {
    return await prisma.productAiExplanation.findUnique({
      where: { productId },
    });
  } catch (error) {
    if (isCacheTableUnavailable(error)) {
      console.warn(
        "Product explanation cache table is unavailable; falling back to live AI generation."
      );
      return null;
    }

    throw error;
  }
}

async function saveCachedExplanation(data) {
  try {
    await prisma.productAiExplanation.upsert({
      where: { productId: data.productId },
      create: data,
      update: {
        answer: data.answer,
        contentHash: data.contentHash,
        model: data.model,
        language: data.language,
      },
    });
    return true;
  } catch (error) {
    if (isCacheTableUnavailable(error)) {
      console.warn("Product explanation cache table is unavailable; skipping cache write.");
      return false;
    }

    throw error;
  }
}

function buildExplainMessages(product) {
  const context = getProductContext(product);

  return [
    {
      role: "system",
      content:
        "Du bist ein transparenter Hautpflege-Berater für einen Online-Shop. Antworte auf Deutsch, sachlich und kaufberatend. Erkläre keine medizinische Diagnose. Nutze nur die gelieferten Produktdaten und markiere Unsicherheit klar.",
    },
    {
      role: "user",
      content: `Erkläre dieses Produkt anhand der Inhaltsstoffe für Kundinnen und Kunden.

Produktdaten:
${JSON.stringify(context, null, 2)}

Format:
- Beginne mit einem kurzen Fazit in einem Satz.
- Danach 3 kurze Abschnitte mit fettgedruckten Labels: **Wofür es gedacht ist**, **Wichtige Inhaltsstoffe**, **Worauf du achten solltest**.
- Maximal 2 Bulletpoints pro Abschnitt.
- Wenn Inhaltsstoffe fehlen oder unklar sind, sag das ausdrücklich.
- Keine übertriebenen Wirkversprechen.`,
    },
  ];
}

function buildFitMessages(product, user, latestAnalysis) {
  const context = getProductContext(product);
  const analysisContext = latestAnalysis
    ? {
        skinType: latestAnalysis.skinType,
        dryness: latestAnalysis.dryness,
        redness: latestAnalysis.redness,
        blemishes: latestAnalysis.blemishes,
        sensitivity: latestAnalysis.sensitivity,
        overall: latestAnalysis.overall,
        tips: parseStoredJson(latestAnalysis.tips, []),
        createdAt: latestAnalysis.createdAt,
      }
    : null;

  return [
    {
      role: "system",
      content:
        "Du bist ein transparenter Hautpflege-Berater. Antworte auf Deutsch. Ziel ist eine vorsichtige Einschätzung der Produkt-Passform mit 1 bis 5 Sternen. Verwende keine direkte Kaufaufforderung und schreibe nicht Kaufen, Nicht kaufen oder Eher nicht kaufen als Ergebnis. Keine medizinische Diagnose, keine Heilversprechen. Begründe jede Einschätzung mit Produktdaten und Nutzerprofil.",
    },
    {
      role: "user",
      content: `Prüfe, ob dieses Produkt zur Person passt.

Produktdaten:
${JSON.stringify(context, null, 2)}

Nutzerprofil:
${JSON.stringify(
  {
    skinTypeFromQuiz: user.skinType || null,
    gender: user.gender || null,
    latestSkinAnalysis: analysisContext,
  },
  null,
  2
)}

Format:
- Erste Zeile exakt in diesem Stil: **Passform:** 4/5 Sterne
- Danach 3 kurze Abschnitte mit fettgedruckten Labels: **Warum es passen kann**, **Mögliche Risiken**, **Was noch fehlt**.
- Maximal 2 Bulletpoints pro Abschnitt.
- Wenn das Nutzerprofil wenig Daten enthält, sag das klar und bleibe vorsichtig.
- Beziehe dich explizit auf Quiz-Hauttyp oder Analysewerte, wenn vorhanden.`,
    },
  ];
}

async function explainProduct(productId, options = {}) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) return null;

  if (!product.ingredients) {
    return {
      productId,
      answer:
        "- Für dieses Produkt sind noch keine Inhaltsstoffe hinterlegt.\n- Eine transparente Erklärung ist erst sinnvoll, wenn die INCI-Liste verfügbar ist.",
    };
  }

  const contentHash = getProductExplanationHash(product);
  const cachedExplanation = options.forceRefresh
    ? null
    : await findCachedExplanation(productId);

  if (
    cachedExplanation &&
    cachedExplanation.contentHash === contentHash
  ) {
    return {
      productId,
      answer: cachedExplanation.answer,
      cached: true,
    };
  }

  const answer = await requestOpenAI(
    buildExplainMessages(product),
    PRODUCT_AI_FALLBACK,
    { maxOutputTokens: 650 }
  );

  if (answer !== PRODUCT_AI_FALLBACK) {
    await saveCachedExplanation({
      productId,
      answer,
      contentHash,
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      language: "de",
    });
  }

  return { productId, answer, cached: false };
}

async function generateProductExplanations(options = {}) {
  const products = await prisma.product.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const results = [];

  for (const product of products) {
    try {
      const result = await explainProduct(product.id, {
        forceRefresh: options.forceRefresh,
      });
      results.push({
        productId: product.id,
        ok: Boolean(result),
        cached: result?.cached ?? false,
      });
    } catch (error) {
      console.error(`Failed to generate explanation for product ${product.id}:`, error);
      results.push({
        productId: product.id,
        ok: false,
        cached: false,
        error: error.message,
      });
    }
  }

  return results;
}

async function assessProductFit(productId, userId) {
  const [product, user, latestAnalysis] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        skinType: true,
        gender: true,
      },
    }),
    prisma.skinAnalysis.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!product) return null;

  if (!product.ingredients) {
    return {
      productId,
      answer:
        "**Passform:** 2/5 Sterne\n\n- Für dieses Produkt sind noch keine Inhaltsstoffe hinterlegt.\n- Eine persönliche Einschätzung wäre ohne INCI-Liste zu unsicher.",
    };
  }

  const answer = await requestOpenAI(
    buildFitMessages(product, user || {}, latestAnalysis),
    PRODUCT_AI_FALLBACK,
    { maxOutputTokens: 700 }
  );

  return { productId, answer };
}

module.exports = {
  explainProduct,
  assessProductFit,
  generateProductExplanations,
};
