-- CreateEnum
CREATE TYPE "CostType" AS ENUM ('SHIP_NOI_DIA', 'PHI_NANG_HANG', 'PHI_HA_HANG', 'PHI_KEO_HANG', 'PHI_GIA_CO', 'PHI_DONG_GO', 'PHI_KIEM_DEM', 'PHI_LUU_KHO', 'PHI_CAN', 'PHI_KIEM_TRA_CHAT_LUONG', 'PHI_TU_CONG_BO', 'PHI_XU_LY_HAI_QUAN', 'PHI_THUONG_KIEM', 'PHI_KHAC');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('YUAN', 'VND');

-- CreateEnum
CREATE TYPE "CostCalculationMethod" AS ENUM ('AUTO', 'BY_WEIGHT', 'BY_VOLUME');

-- CreateTable
CREATE TABLE "product_codes" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "partnerName" TEXT NOT NULL,
    "warehouseId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "exchangeRate" DECIMAL(15,4) NOT NULL,
    "declarationId" INTEGER,
    "notes" TEXT,
    "separateTax" BOOLEAN NOT NULL DEFAULT false,
    "originalWeightPrice" DECIMAL(15,2) NOT NULL,
    "originalVolumePrice" DECIMAL(15,2) NOT NULL,
    "serviceFee" DECIMAL(15,2) NOT NULL,
    "importTax" DECIMAL(15,0),
    "vat" DECIMAL(15,0),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "incidentalFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "incidentalNotes" TEXT,
    "profit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalWeight" DECIMAL(15,2) NOT NULL,
    "totalVolume" DECIMAL(15,3) NOT NULL,
    "totalPackages" INTEGER NOT NULL,
    "costCalculationMethod" "CostCalculationMethod" NOT NULL DEFAULT 'AUTO',
    "weightPrice" DECIMAL(15,2) NOT NULL,
    "volumePrice" DECIMAL(15,2) NOT NULL,
    "images" TEXT[],
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
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_costs" ADD CONSTRAINT "warehouse_costs_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_details" ADD CONSTRAINT "package_details_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
