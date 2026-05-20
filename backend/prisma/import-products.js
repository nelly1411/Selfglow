const fs = require("fs");
const path = require("path");
require("dotenv").config();
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const filePath = path.join(__dirname, "../db/data/chosen2-products_inWork.csv");

function parsePrice(value) {
  if (!value) return 0;
  const cleaned = String(value).replace(",", ".").replace(/[^\d.]/g, "");
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

function toBool(value) {
  return String(value).trim().toLowerCase() === "true";
}

function detectSkinTypes(row) {
  const text = `${row.description || ""} ${row.ingredients || ""}`.toLowerCase();
  const types = new Set();

  if (
    text.includes("salicylic") ||
    text.includes("niacinamide") ||
    text.includes("zinc pca") ||
    text.includes("oil control") ||
    text.includes("mattierend")
  ) {
    types.add("Oily");
    types.add("Combination");
  }

  if (
    text.includes("hyaluronic") ||
    text.includes("glycerin") ||
    text.includes("ceramide") ||
    text.includes("squalane") ||
    text.includes("shea butter")
  ) {
    types.add("Dry");
    types.add("Normal");
  }

  if (
    text.includes("aloe") ||
    text.includes("centella") ||
    text.includes("panthenol") ||
    text.includes("fragrance-free") ||
    text.includes("parfümfrei")
  ) {
    types.add("Sensitive");
  }

  if (types.size === 0) {
    types.add("Normal");
  }

  return Array.from(types).join(",");
}

function detectConcerns(row) {
  const text = `${row.description || ""} ${row.ingredients || ""}`.toLowerCase();
  const concerns = new Set();

  if (
    text.includes("salicylic") ||
    text.includes("benzoyl peroxide") ||
    text.includes("tea tree") ||
    text.includes("zinc pca") ||
    text.includes("akne") ||
    text.includes("unreinheiten")
  ) {
    concerns.add("Acne");
  }

  if (
    text.includes("retinol") ||
    text.includes("peptide") ||
    text.includes("collagen") ||
    text.includes("vitamin c") ||
    text.includes("ascorbic")
  ) {
    concerns.add("Anti-Aging");
  }

  if (
    text.includes("niacinamide") ||
    text.includes("pore") ||
    text.includes("poren") ||
    text.includes("mattierend")
  ) {
    concerns.add("Grosse Poren");
  }

  if (
    text.includes("aloe") ||
    text.includes("centella") ||
    text.includes("panthenol") ||
    text.includes("rötungen") ||
    text.includes("redness") ||
    text.includes("calming")
  ) {
    concerns.add("Rötungen");
  }

  return Array.from(concerns).join(",");
}

async function main() {
  const products = [];

  fs.createReadStream(filePath)
    .pipe(csv({ separator: ";" }))
    .on("data", (row) => {
      if (!row.product_name) return;

      products.push({
        name: row.product_name,
        brand: row.brand_name || "Unknown Brand",
        category: row.category || "Uncategorized",
        price: parsePrice(row.search_price),
        imageUrl: row.merchant_image_url || null,
        description: row.description || null,
        ingredients: row.ingredients || null,
        vegan: toBool(row.vegan),
        alcoholFree: toBool(row.alcoholFree),
        fragranceFree: toBool(row.fragranceFree),
        skinTypes: detectSkinTypes(row),
        concerns: detectConcerns(row),
        application: row.Anwendung || null,
      });
    })
    .on("end", async () => {
      console.log(`Importiere ${products.length} Produkte...`);

      await prisma.product.deleteMany();

      await prisma.product.createMany({
        data: products,
      });

      console.log("Import fertig!");
      await prisma.$disconnect();
    });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
});
