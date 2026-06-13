-- DropForeignKey
ALTER TABLE "UserProfileEmbedding" DROP CONSTRAINT "UserProfileEmbedding_userId_fkey";

-- DropIndex
DROP INDEX "UserProfileEmbedding_embedding_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationCode" TEXT,
ADD COLUMN     "verificationCodeExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserProfileEmbedding" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "UserProfileEmbedding" ADD CONSTRAINT "UserProfileEmbedding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate the pgvector cosine index used by recommendation similarity search.
CREATE INDEX "UserProfileEmbedding_embedding_idx"
ON "UserProfileEmbedding"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);
