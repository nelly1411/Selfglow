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

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function pickAllowedValues(values, allowedValues) {
  const allowedByNormalized = new Map(
    allowedValues.map((value) => [normalizeSearchTerm(value), value])
  );

  return normalizeArray(values)
    .map((value) => allowedByNormalized.get(normalizeSearchTerm(value)))
    .filter(Boolean);
}

function pickOptionalBoolean(value) {
  return value === true ? true : undefined;
}

function pickOptionalPositiveInteger(value) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function pickOptionalPricePreference(value) {
  return value === "cheap" ? value : undefined;
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

module.exports = {
  normalizeText,
  normalizeSearchTerm,
  normalizeArray,
  pickAllowedValues,
  pickOptionalBoolean,
  pickOptionalPositiveInteger,
  pickOptionalPricePreference,
  truncatePromptText,
  addTermVariants,
};
