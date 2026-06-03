CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "ProductEmbedding" (
  "productId" INTEGER PRIMARY KEY REFERENCES "Product"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ProductEmbedding_embedding_idx"
ON "ProductEmbedding"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

/*
creates a separate table for embeddings instead of adding the vector directly to Product
*/