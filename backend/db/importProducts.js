const fs = require("fs");
const csv = require("csv-parser");
const prisma = require("../src/config/prisma");

const results = [];

fs.createReadStream("./db/data/test-products.csv")
  .pipe(csv())
  .on("data", (row) => {
    results.push(row);
  })
  .on("end", async () => {
    console.log("CSV geladen:", results.length);

    for (const row of results) {
      try {
        await prisma.product.create({
          data: {
            name: row.product_name,
            brand: row.brand_name || "Unknown",
            category: row.product_type || "Unknown",

            // 🔥 DAS ist dein Fix
            imageUrl: row.merchant_image_url,

            description: row.description || "",
            price: parseFloat(row.search_price) || 0,

            rating: parseFloat(row.average_rating) || 0,

            fragranceFree: false,
            vegan: false,
            naturalCosmetics: false,
          },
        });
      } catch (error) {
        console.error("Fehler bei Produkt:", row.product_name);
      }
    }

    console.log("Import fertig 🚀");
    process.exit();
  });