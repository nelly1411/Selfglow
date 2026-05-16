-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "savedAddress" TEXT,
ADD COLUMN     "savedCity" TEXT,
ADD COLUMN     "savedCountry" TEXT,
ADD COLUMN     "savedPhone" TEXT,
ADD COLUMN     "savedPostal" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
