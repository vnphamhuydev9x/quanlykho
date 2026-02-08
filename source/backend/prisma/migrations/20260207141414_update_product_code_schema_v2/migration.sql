-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('EMPLOYEE', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('SHIP_NOI_DIA', 'PHI_NANG_HANG', 'PHI_HA_HANG', 'PHI_KEO_HANG', 'PHI_GIA_CO', 'PHI_DONG_GO', 'PHI_KIEM_DEM', 'PHI_LUU_KHO', 'PHI_CAN', 'PHI_KIEM_TRA_CHAT_LUONG', 'PHI_TU_CONG_BO', 'PHI_XU_LY_HAI_QUAN', 'PHI_THUONG_KIEM', 'PHI_KHAC');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('YUAN', 'VND');

-- CreateEnum
CREATE TYPE "CostCalculationMethod" AS ENUM ('AUTO', 'BY_WEIGHT', 'BY_VOLUME');

-- CreateEnum
CREATE TYPE "ProductCodeStatus" AS ENUM ('NHAP_KHO_TQ', 'CHO_XEP_XE', 'DA_XEP_XE', 'KIEM_HOA', 'CHO_THONG_QUAN_VN', 'NHAP_KHO_VN', 'XUAT_THIEU', 'XUAT_DU');

-- CreateEnum
CREATE TYPE "WarehouseStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "type" "UserType" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customerCode" TEXT,
    "address" TEXT,
    "saleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WarehouseStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "content" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declarations" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3),
    "customerCodeInput" TEXT,
    "productName" TEXT,
    "orderCode" TEXT,
    "packageCount" INTEGER,
    "weight" DECIMAL(15,2),
    "volume" DECIMAL(15,3),
    "infoSource" TEXT,
    "domesticFeeRMB" DECIMAL(15,2),
    "haulingFeeRMB" DECIMAL(15,2),
    "unloadingFeeRMB" DECIMAL(15,2),
    "transportRate" DECIMAL(15,2),
    "totalTransportFeeEstimate" DECIMAL(15,2),
    "note" TEXT,
    "productImage" TEXT,
    "productQuantity" INTEGER,
    "specification" TEXT,
    "productDescription" TEXT,
    "brand" TEXT,
    "declarationNeed" TEXT,
    "declarationPolicy" TEXT,
    "declarationQuantity" TEXT,
    "invoicePrice" TEXT,
    "additionalInfo" TEXT,
    "declarationName" TEXT,
    "declarationQuantityDeclared" TEXT,
    "unit" TEXT,
    "declarationPrice" TEXT,
    "value" TEXT,
    "packageCountDeclared" TEXT,
    "netWeight" TEXT,
    "grossWeight" TEXT,
    "cbm" TEXT,
    "hsCode" TEXT,
    "vatPercent" TEXT,
    "vatAmount" TEXT,
    "importTaxPercent" TEXT,
    "importTaxUSD" TEXT,
    "importTaxVND" TEXT,
    "customsExchangeRate" TEXT,
    "qualityControlFee" TEXT,
    "accountingConfirmation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_codes" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER,
    "warehouseId" INTEGER,
    "categoryId" INTEGER,
    "declarationId" INTEGER,
    "entryDate" TIMESTAMP(3),
    "customerCodeInput" TEXT,
    "orderCode" TEXT,
    "productName" TEXT,
    "packageCount" TEXT,
    "weight" TEXT,
    "volume" TEXT,
    "domesticFeeTQ" DECIMAL(15,2),
    "haulingFeeTQ" DECIMAL(15,2),
    "exchangeRate" DECIMAL(15,4),
    "transportRate" DECIMAL(15,2),
    "totalTransportFeeEstimate" DECIMAL(15,2),
    "domesticFeeVN" DECIMAL(15,2),
    "notes" TEXT,
    "status" TEXT,
    "images" TEXT[],
    "mainTag" TEXT,
    "subTag" TEXT,
    "taggedImage" TEXT,
    "productQuantity" DECIMAL(15,2),
    "specification" TEXT,
    "productDescription" TEXT,
    "brand" TEXT,
    "supplierTaxCode" TEXT,
    "supplierName" TEXT,
    "declarationNeed" TEXT,
    "declarationQuantity" DECIMAL(15,2),
    "invoicePriceXXX" DECIMAL(15,2),
    "invoicePriceExport" DECIMAL(15,2),
    "totalValueExport" DECIMAL(15,2),
    "importPolicy" TEXT,
    "otherFee" DECIMAL(15,2),
    "otherNotes" TEXT,
    "vatImportTax" DECIMAL(15,0),
    "importTax" DECIMAL(15,0),
    "trustFee" DECIMAL(15,2),
    "totalImportCost" DECIMAL(15,2),
    "vatExportStatus" TEXT,
    "partnerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_costs" (
    "id" SERIAL NOT NULL,
    "productCodeId" INTEGER NOT NULL,
    "costType" "CostType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "originalCost" DECIMAL(15,2) NOT NULL,
    "otherFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_details" (
    "id" SERIAL NOT NULL,
    "productCodeId" INTEGER NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "length" DECIMAL(10,2) NOT NULL,
    "width" DECIMAL(10,2) NOT NULL,
    "height" DECIMAL(10,2) NOT NULL,
    "totalWeight" DECIMAL(15,2) NOT NULL,
    "totalPackages" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_details_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_costs" ADD CONSTRAINT "warehouse_costs_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_details" ADD CONSTRAINT "package_details_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
