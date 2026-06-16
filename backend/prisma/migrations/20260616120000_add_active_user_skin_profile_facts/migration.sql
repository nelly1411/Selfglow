ALTER TABLE "UserSkinProfileFact"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "UserSkinProfileFact_userId_key_isActive_idx"
ON "UserSkinProfileFact"("userId", "key", "isActive");
