/*
  Warnings:

  - You are about to drop the column `accountingConfirmation` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `additionalInfo` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `cbm` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `customerCodeInput` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `customsExchangeRate` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `declarationName` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `declarationPolicy` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `declarationPrice` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `declarationQuantityDeclared` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `domesticFeeRMB` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `entryDate` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `grossWeight` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `haulingFeeRMB` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `hsCode` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `importTaxPercent` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `importTaxUSD` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `importTaxVND` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `infoSource` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `invoicePrice` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `netWeight` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `orderCode` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `packageCount` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `packageCountDeclared` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `productImage` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `qualityControlFee` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `subTag` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `totalTransportFeeEstimate` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `transportRate` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `transportRateVolume` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `unloadingFeeRMB` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `vatAmount` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `vatPercent` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `volume` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `declarations` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `manifests` table. All the data in the column will be lost.
  - The `status` column on the `manifests` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `accountingConfirmation` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `customerCodeInput` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `declarationId` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `declarationName` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `declarationNeed` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `declarationPolicy` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `declarationPrice` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `declarationQuantity` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `domesticFeeRMB` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `domesticFeeVN` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `feeAmount` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `haulingFeeRMB` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `importPolicy` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `importTax` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `invoicePriceExport` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `invoicePriceXXX` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `mainTag` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `otherFee` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `otherNotes` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `packageCount` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `packageUnit` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `packing` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `partnerName` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `pctConfirmation` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `productDescription` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `productQuantity` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseFee` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `specification` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `subTag` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `supplierName` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `supplierTaxCode` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `taggedImages` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `totalImportCost` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `totalValueExport` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `transportRate` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `transportRateVolume` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `trustFee` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `unloadingFeeRMB` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `vatExportStatus` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `vatImportTax` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `volume` on the `product_codes` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `product_codes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productItemId]` on the table `declarations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `licensePlate` to the `manifests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ManifestStatus" AS ENUM ('CHO_XEP_XE', 'DA_XEP_XE', 'DANG_KIEM_HOA', 'CHO_THONG_QUAN', 'DA_THONG_QUAN', 'DA_NHAP_KHO_VN');

-- DropForeignKey
ALTER TABLE "declarations" DROP CONSTRAINT "declarations_customerId_fkey";

-- DropForeignKey
ALTER TABLE "product_codes" DROP CONSTRAINT "product_codes_declarationId_fkey";

-- AlterTable
ALTER TABLE "declarations" DROP COLUMN "accountingConfirmation",
DROP COLUMN "additionalInfo",
DROP COLUMN "cbm",
DROP COLUMN "customerCodeInput",
DROP COLUMN "customerId",
DROP COLUMN "customsExchangeRate",
DROP COLUMN "declarationName",
DROP COLUMN "declarationPolicy",
DROP COLUMN "declarationPrice",
DROP COLUMN "declarationQuantityDeclared",
DROP COLUMN "domesticFeeRMB",
DROP COLUMN "entryDate",
DROP COLUMN "grossWeight",
DROP COLUMN "haulingFeeRMB",
DROP COLUMN "hsCode",
DROP COLUMN "importTaxPercent",
DROP COLUMN "importTaxUSD",
DROP COLUMN "importTaxVND",
DROP COLUMN "infoSource",
DROP COLUMN "invoicePrice",
DROP COLUMN "netWeight",
DROP COLUMN "note",
DROP COLUMN "orderCode",
DROP COLUMN "packageCount",
DROP COLUMN "packageCountDeclared",
DROP COLUMN "productImage",
DROP COLUMN "productName",
DROP COLUMN "qualityControlFee",
DROP COLUMN "subTag",
DROP COLUMN "totalTransportFeeEstimate",
DROP COLUMN "transportRate",
DROP COLUMN "transportRateVolume",
DROP COLUMN "unit",
DROP COLUMN "unloadingFeeRMB",
DROP COLUMN "value",
DROP COLUMN "vatAmount",
DROP COLUMN "vatPercent",
DROP COLUMN "volume",
DROP COLUMN "weight",
ADD COLUMN     "declarationQuantity" INTEGER,
ADD COLUMN     "entrustmentFee" INTEGER,
ADD COLUMN     "images" TEXT,
ADD COLUMN     "importCostToCustomer" INTEGER,
ADD COLUMN     "importTax" DECIMAL(5,2),
ADD COLUMN     "importTaxPayable" INTEGER,
ADD COLUMN     "invoicePriceBeforeVat" INTEGER,
ADD COLUMN     "mainStamp" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payableFee" INTEGER,
ADD COLUMN     "productCodeId" INTEGER,
ADD COLUMN     "productItemId" INTEGER,
ADD COLUMN     "sellerCompanyName" TEXT,
ADD COLUMN     "sellerTaxCode" TEXT,
ADD COLUMN     "subStamp" TEXT,
ADD COLUMN     "totalLotValueBeforeVat" INTEGER,
ADD COLUMN     "vatTax" DECIMAL(5,2),
ADD COLUMN     "vatTaxPayable" INTEGER;

-- AlterTable
ALTER TABLE "manifests" DROP COLUMN "name",
ADD COLUMN     "callerId" INTEGER,
ADD COLUMN     "licensePlate" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ManifestStatus" NOT NULL DEFAULT 'CHO_XEP_XE';

-- AlterTable
ALTER TABLE "product_codes" DROP COLUMN "accountingConfirmation",
DROP COLUMN "brand",
DROP COLUMN "customerCodeInput",
DROP COLUMN "declarationId",
DROP COLUMN "declarationName",
DROP COLUMN "declarationNeed",
DROP COLUMN "declarationPolicy",
DROP COLUMN "declarationPrice",
DROP COLUMN "declarationQuantity",
DROP COLUMN "domesticFeeRMB",
DROP COLUMN "domesticFeeVN",
DROP COLUMN "feeAmount",
DROP COLUMN "haulingFeeRMB",
DROP COLUMN "images",
DROP COLUMN "importPolicy",
DROP COLUMN "importTax",
DROP COLUMN "invoicePriceExport",
DROP COLUMN "invoicePriceXXX",
DROP COLUMN "mainTag",
DROP COLUMN "notes",
DROP COLUMN "otherFee",
DROP COLUMN "otherNotes",
DROP COLUMN "packageCount",
DROP COLUMN "packageUnit",
DROP COLUMN "packing",
DROP COLUMN "partnerName",
DROP COLUMN "pctConfirmation",
DROP COLUMN "productDescription",
DROP COLUMN "productName",
DROP COLUMN "productQuantity",
DROP COLUMN "purchaseFee",
DROP COLUMN "specification",
DROP COLUMN "status",
DROP COLUMN "subTag",
DROP COLUMN "supplierName",
DROP COLUMN "supplierTaxCode",
DROP COLUMN "taggedImages",
DROP COLUMN "totalImportCost",
DROP COLUMN "totalValueExport",
DROP COLUMN "transportRate",
DROP COLUMN "transportRateVolume",
DROP COLUMN "trustFee",
DROP COLUMN "unloadingFeeRMB",
DROP COLUMN "vatExportStatus",
DROP COLUMN "vatImportTax",
DROP COLUMN "volume",
DROP COLUMN "weight",
ADD COLUMN     "employeeId" INTEGER,
ADD COLUMN     "merchandiseConditionId" INTEGER,
ADD COLUMN     "totalVolume" DECIMAL(15,3),
ADD COLUMN     "totalWeight" INTEGER;

-- CreateTable
CREATE TABLE "merchandise_conditions" (
    "id" SERIAL NOT NULL,
    "name_vi" TEXT NOT NULL,
    "name_zh" TEXT,
    "canLoadVehicle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "merchandise_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_items" (
    "id" SERIAL NOT NULL,
    "productCodeId" INTEGER NOT NULL,
    "productName" TEXT,
    "packageCount" INTEGER,
    "packageUnit" TEXT,
    "weight" INTEGER,
    "volume" DECIMAL(15,3),
    "volumeFee" INTEGER,
    "weightFee" INTEGER,
    "domesticFeeTQ" DECIMAL(15,2),
    "haulingFeeTQ" DECIMAL(15,2),
    "unloadingFeeRMB" DECIMAL(15,2),
    "itemTransportFeeEstimate" DECIMAL(15,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_declarations" (
    "id" SERIAL NOT NULL,
    "productName" TEXT,
    "hsCode" TEXT,
    "origin" TEXT,
    "unit1" TEXT,
    "unit2" TEXT,
    "importTaxCode" TEXT,
    "importTaxRate" DECIMAL(5,2),
    "vatTaxCode" TEXT,
    "vatTaxRate" DECIMAL(5,2),
    "hash" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "short_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "short_declarations_hash_idx" ON "short_declarations"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "declarations_productItemId_key" ON "declarations"("productItemId");

-- AddForeignKey
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "product_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_merchandiseConditionId_fkey" FOREIGN KEY ("merchandiseConditionId") REFERENCES "merchandise_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_items" ADD CONSTRAINT "product_items_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
