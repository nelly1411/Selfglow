const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";

async function createEmbedding(input) {
  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function searchByEmbedding(prisma, queryText, limit = 60) {
  const embedding = await createEmbedding(queryText);
  const vectorStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRawUnsafe(
    `
    SELECT
      p.*,
      1 - (pe.embedding <=> $1::vector) AS similarity
    FROM "ProductEmbedding" pe
    JOIN "Product" p ON p.id = pe."productId"
    ORDER BY pe.embedding <=> $1::vector
    LIMIT $2
    `,
    vectorStr,
    limit
  );

  return results;
}

module.exports = {
  EMBEDDING_MODEL,
  createEmbedding,
  searchByEmbedding,
};


//  It reads your existing products, 
// creates embeddings for them, 
// and stores them in ProductEmbedding