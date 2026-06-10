-- CreateTable
CREATE TABLE "UserSkinProfileFact" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'chat',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSkinProfileFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSkinProfileFact_userId_key_idx" ON "UserSkinProfileFact"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkinProfileFact_userId_key_value_key" ON "UserSkinProfileFact"("userId", "key", "value");

-- AddForeignKey
ALTER TABLE "UserSkinProfileFact" ADD CONSTRAINT "UserSkinProfileFact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
