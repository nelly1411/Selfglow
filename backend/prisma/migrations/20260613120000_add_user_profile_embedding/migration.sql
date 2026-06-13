CREATE TABLE "UserProfileEmbedding" (
  "userId" INTEGER PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "UserProfileEmbedding_embedding_idx"
ON "UserProfileEmbedding"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);