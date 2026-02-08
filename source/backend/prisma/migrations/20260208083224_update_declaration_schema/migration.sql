/*
  Warnings:

  - You are about to drop the column `declarationQuantity` on the `declarations` table. All the data in the column will be lost.
  - The `invoicePrice` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `declarationQuantityDeclared` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `declarationPrice` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `value` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `packageCountDeclared` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `netWeight` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `grossWeight` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cbm` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `vatPercent` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `vatAmount` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `importTaxPercent` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `importTaxUSD` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `importTaxVND` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `customsExchangeRate` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `qualityControlFee` column on the `declarations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "declarations" DROP COLUMN "declarationQuantity",
ADD COLUMN     "subTag" TEXT,
ADD COLUMN     "transportRateVolume" DECIMAL(15,2),
ALTER COLUMN "packageCount" SET DATA TYPE DECIMAL(15,2),
DROP COLUMN "invoicePrice",
ADD COLUMN     "invoicePrice" DECIMAL(15,2),
DROP COLUMN "declarationQuantityDeclared",
ADD COLUMN     "declarationQuantityDeclared" DECIMAL(15,2),
DROP COLUMN "declarationPrice",
ADD COLUMN     "declarationPrice" DECIMAL(15,2),
DROP COLUMN "value",
ADD COLUMN     "value" DECIMAL(15,2),
DROP COLUMN "packageCountDeclared",
ADD COLUMN     "packageCountDeclared" DECIMAL(15,2),
DROP COLUMN "netWeight",
ADD COLUMN     "netWeight" DECIMAL(15,2),
DROP COLUMN "grossWeight",
ADD COLUMN     "grossWeight" DECIMAL(15,2),
DROP COLUMN "cbm",
ADD COLUMN     "cbm" DECIMAL(15,3),
DROP COLUMN "vatPercent",
ADD COLUMN     "vatPercent" DECIMAL(5,2),
DROP COLUMN "vatAmount",
ADD COLUMN     "vatAmount" DECIMAL(15,2),
DROP COLUMN "importTaxPercent",
ADD COLUMN     "importTaxPercent" DECIMAL(5,2),
DROP COLUMN "importTaxUSD",
ADD COLUMN     "importTaxUSD" DECIMAL(15,2),
DROP COLUMN "importTaxVND",
ADD COLUMN     "importTaxVND" DECIMAL(15,2),
DROP COLUMN "customsExchangeRate",
ADD COLUMN     "customsExchangeRate" DECIMAL(15,2),
DROP COLUMN "qualityControlFee",
ADD COLUMN     "qualityControlFee" DECIMAL(15,2);
