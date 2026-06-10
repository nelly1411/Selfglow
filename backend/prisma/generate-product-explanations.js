require("dotenv").config();

const prisma = require("../src/config/prisma");
const {
  generateProductExplanations,
} = require("../src/services/product-ai.service");

async function main() {
  const forceRefresh = process.argv.includes("--force");
  const results = await generateProductExplanations({ forceRefresh });
  const generated = results.filter((result) => result.ok && !result.cached).length;
  const cached = results.filter((result) => result.ok && result.cached).length;
  const failed = results.filter((result) => !result.ok).length;

  console.log(
    `Product explanations finished: ${generated} generated, ${cached} cached, ${failed} failed.`
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Product explanation generation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
