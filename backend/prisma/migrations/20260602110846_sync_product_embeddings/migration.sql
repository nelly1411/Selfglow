-- DropForeignKey
ALTER TABLE "ProductEmbedding" DROP CONSTRAINT "ProductEmbedding_productId_fkey";

-- DropIndex
DROP INDEX "ProductEmbedding_embedding_idx";

-- AlterTable
ALTER TABLE "ProductEmbedding" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ProductEmbedding" ADD CONSTRAINT "ProductEmbedding_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
