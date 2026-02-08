/*
  Warnings:

  - You are about to drop the column `domesticFeeTQ` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `haulingFeeTQ` on the `product_codes` table. All the data in the column will be lost.
  - The `packageCount` column on the `product_codes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `weight` column on the `product_codes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `volume` column on the `product_codes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "product_codes" DROP COLUMN "domesticFeeTQ",
DROP COLUMN "haulingFeeTQ",
ADD COLUMN     "accountingConfirmation" TEXT,
ADD COLUMN     "declarationName" TEXT,
ADD COLUMN     "declarationPolicy" TEXT,
ADD COLUMN     "declarationPrice" DECIMAL(15,2),
ADD COLUMN     "domesticFeeRMB" DECIMAL(15,2),
ADD COLUMN     "feeAmount" DECIMAL(15,2),
ADD COLUMN     "haulingFeeRMB" DECIMAL(15,2),
ADD COLUMN     "infoSource" TEXT,
ADD COLUMN     "packing" TEXT,
ADD COLUMN     "pctConfirmation" TEXT,
ADD COLUMN     "purchaseFee" DECIMAL(15,2),
ADD COLUMN     "transportRateVolume" DECIMAL(15,2),
ADD COLUMN     "unloadingFeeRMB" DECIMAL(15,2),
DROP COLUMN "packageCount",
ADD COLUMN     "packageCount" DECIMAL(15,2),
DROP COLUMN "weight",
ADD COLUMN     "weight" DECIMAL(15,2),
DROP COLUMN "volume",
ADD COLUMN     "volume" DECIMAL(15,3);
