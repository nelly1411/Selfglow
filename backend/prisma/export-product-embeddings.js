// Load DATABASE_URL before creating the Prisma client.
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const outputPath = path.join(__dirname, "data", "product-embeddings.json");

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT
      pe."productId",
      p.name,
      p.brand,
      p.category,
      pe.content,
      pe.model,
      pe.embedding::text AS embedding
    FROM "ProductEmbedding" pe
    JOIN "Product" p ON p.id = pe."productId"
    ORDER BY p.name, p.brand, p.category, pe."productId"
  `;

  const exportData = {
    exportedAt: new Date().toISOString(),
    count: rows.length,
    matchFields: ["name", "brand", "category"],
    embeddings: rows,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(exportData, null, 2)}\n`);

  console.log(`Exported ${rows.length} product embeddings to ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
