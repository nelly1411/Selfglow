const {
  OPENAI_API_URL,
  DEFAULT_MODEL,
  DEFAULT_OPENAI_TIMEOUT_MS,
  DEFAULT_OPENAI_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_REASONING_EFFORT,
  DEFAULT_OPENAI_VERBOSITY,
} = require("./chat.constants");

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

module.exports = {
  requestOpenAI,
  streamOpenAI,
};
