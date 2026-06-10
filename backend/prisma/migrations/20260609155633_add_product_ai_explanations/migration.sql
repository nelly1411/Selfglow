-- CreateTable
CREATE TABLE "ProductAiExplanation" (
    "productId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'de',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAiExplanation_pkey" PRIMARY KEY ("productId")
);

-- AddForeignKey
ALTER TABLE "ProductAiExplanation" ADD CONSTRAINT "ProductAiExplanation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
