const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      {
        name: "Balea Aqua Gel 2",
        brand: "Balea",
        category: "moisturizer",
        price: 2.99,
        description: "Lightweight moisturizer for combination skin",
        fragranceFree: true,
        vegan: false,
        naturalCosmetics: false,
        rating: 4.2,
      },
      {
        name: "CeraVe Moisturizing Lotion",
        brand: "CeraVe",
        category: "moisturizer",
        price: 12.99,
        description: "Moisturizer for dry and sensitive skin",
        fragranceFree: true,
        vegan: false,
        naturalCosmetics: false,
        rating: 4.6,
      }
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });