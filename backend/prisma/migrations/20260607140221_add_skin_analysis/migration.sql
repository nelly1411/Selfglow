-- CreateTable
CREATE TABLE "SkinAnalysis" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skinType" TEXT NOT NULL,
    "dryness" INTEGER NOT NULL,
    "redness" INTEGER NOT NULL,
    "blemishes" INTEGER NOT NULL,
    "sensitivity" INTEGER NOT NULL,
    "overall" TEXT NOT NULL,
    "tips" TEXT NOT NULL,
    "products" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkinAnalysis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SkinAnalysis" ADD CONSTRAINT "SkinAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
