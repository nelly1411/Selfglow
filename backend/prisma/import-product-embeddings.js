// Load DATABASE_URL before creating the Prisma client.
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const inputPath = path.join(__dirname, "data", "product-embeddings.json");

function productKey(product) {
  return [product.name, product.brand, product.category].join("\u0000");
}

function readExportFile() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing embedding export file: ${inputPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  if (!Array.isArray(parsed.embeddings)) {
    throw new Error("Embedding export file must contain an embeddings array.");
  }

  return parsed.embeddings;
}

async function upsertProductEmbedding(productId, row) {
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
    productId,
    row.content,
    row.model,
    row.embedding
  );
}

async function main() {
  const exportedRows = readExportFile();
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
    },
  });

  const productsByKey = new Map();

  for (const product of products) {
    const key = productKey(product);
    const matches = productsByKey.get(key) || [];
    matches.push(product);
    productsByKey.set(key, matches);
  }

  let imported = 0;
  let skipped = 0;

  for (const row of exportedRows) {
    const matches = productsByKey.get(productKey(row)) || [];

    if (matches.length !== 1) {
      skipped += 1;
      console.warn(
        `Skipped embedding for "${row.name}" because ${matches.length} matching products were found.`
      );
      continue;
    }

    await upsertProductEmbedding(matches[0].id, row);
    imported += 1;
  }

  console.log(`Imported ${imported} product embeddings. Skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
