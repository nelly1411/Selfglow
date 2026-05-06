/*
  Warnings:

  - You are about to drop the column `naturalCosmetics` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "naturalCosmetics",
ADD COLUMN     "alcoholFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "concerns" TEXT,
ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "skinTypes" TEXT;
