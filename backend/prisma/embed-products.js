// Load DATABASE_URL and OPENAI_API_KEY before creating the Prisma client or embeddings.
require("dotenv").config();

// Import Prisma for database access and the shared OpenAI embedding helper.
const { PrismaClient } = require("@prisma/client");
const {
  EMBEDDING_MODEL,
  createEmbedding,
} = require("../src/services/embedding.service");

// Create one Prisma client for all reads and writes in this backfill script.
const prisma = new PrismaClient();

// Convert a product row into the text that will be embedded for semantic search.
function buildProductEmbeddingText(product) {
  return [
    `Name: ${product.name}`,
    `Brand: ${product.brand}`,
    `Category: ${product.category}`,
    `Description: ${product.description || ""}`,
    `Ingredients: ${product.ingredients || ""}`,
    `Application: ${product.application || ""}`,
    `Skin types: ${product.skinTypes || ""}`,
    `Concerns: ${product.concerns || ""}`,
    product.vegan ? "vegan" : "",
    product.alcoholFree ? "alcohol free alkoholfrei" : "",
    product.fragranceFree ? "fragrance free parfumfrei duftstofffrei" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Insert a new product embedding, or replace the existing one for the same product.
async function upsertProductEmbedding(product, content, embedding) {
  // pgvector accepts vectors as a bracketed list, then casts it with $4::vector.
  const vector = `[${embedding.map(Number).join(",")}]`;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "ProductEmbedding" ("productId", "content", "model", "embedding", "updatedAt")
      VALUES ($1, $2, $3, $4::vector, NOW())
      ON CONFLICT ("productId")
      DO UPDATE SET
        "content" = EXCLUDED."content",
        "model" = EXCLUDED."model",
        "embedding" = EXCLUDED."embedding",
        "updatedAt" = NOW()
    `,
    product.id,
    content,
    EMBEDDING_MODEL,
    vector
  );
}

// Main backfill flow: read products, create embeddings, and store them.
async function main() {
  // Without an API key the script cannot call the OpenAI embeddings endpoint.
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to create product embeddings.");
  }

  // Fetch every product from the current database in a stable order.
  const products = await prisma.product.findMany({
    orderBy: { id: "asc" },
  });

  console.log(`Creating embeddings for ${products.length} products...`);

  // Process products sequentially to avoid sending too many embedding requests at once.
  for (const [index, product] of products.entries()) {
    // Build the searchable product text, embed it, then persist the vector.
    const content = buildProductEmbeddingText(product);
    const embedding = await createEmbedding(content);

    await upsertProductEmbedding(product, content, embedding);

    console.log(`${index + 1}/${products.length}: ${product.name}`);
  }

  console.log("Product embedding backfill finished.");
}

// Run the script, report failures, and always close the database connection.
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
