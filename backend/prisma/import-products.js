const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const filePath = path.join(__dirname, "../db/data/chosen2-products.csv");

function parsePrice(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(",", ".").replace(/[^\d.]/g, "");
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

async function main() {
  const products = [];

  function toBool(value) {
    return String(value).trim().toLowerCase() === "true";
  }

  fs.createReadStream(filePath)
    .pipe(csv({ separator: ";" }))
    .on("data", (row) => {
      if (!row.product_name) return;

      products.push({ name: row.product_name, brand: row.brand_name || "Unknown Brand", category: row.category || "Uncategorized", price: parsePrice(row.search_price), imageUrl: row.merchant_image_url || null, description: row.description || null, ingredients: row.ingredients || null, vegan: toBool(row.vegan), alcoholFree: toBool(row.alcoholFree), fragranceFree: toBool(row.fragranceFree) });
    })
    .on("end", async () => {
      console.log(`Importiere ${products.length} Produkte...`);

      await prisma.product.createMany({
        data: products,
        skipDuplicates: true,
      });

      console.log("Import fertig!");
      await prisma.$disconnect();
    });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
});

