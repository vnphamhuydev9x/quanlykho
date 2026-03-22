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

-- CreateEnum
CREATE TYPE "ExportOrderStatus" AS ENUM ('DA_TAO_LENH', 'DANG_XAC_NHAN_CAN', 'DA_XAC_NHAN_CAN', 'DA_XUAT_KHO');

-- CreateEnum
CREATE TYPE "ManifestStatus" AS ENUM ('CHO_XEP_XE', 'DA_XEP_XE', 'DANG_KIEM_HOA', 'CHO_THONG_QUAN', 'DA_THONG_QUAN', 'DA_NHAP_KHO_VN');

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
    "productCodeId" INTEGER,
    "productItemId" INTEGER,
    "mainStamp" TEXT,
    "subStamp" TEXT,
    "productQuantity" INTEGER,
    "specification" TEXT,
    "productDescription" TEXT,
    "brand" TEXT,
    "sellerTaxCode" TEXT,
    "sellerCompanyName" TEXT,
    "declarationNeed" TEXT,
    "declarationQuantity" INTEGER,
    "invoicePriceBeforeVat" INTEGER,
    "totalLotValueBeforeVat" INTEGER,
    "importTax" DECIMAL(5,2),
    "vatTax" DECIMAL(5,2),
    "importTaxPayable" INTEGER,
    "vatTaxPayable" INTEGER,
    "payableFee" INTEGER,
    "notes" TEXT,
    "entrustmentFee" INTEGER,
    "declarationCost" INTEGER,
    "importCostToCustomer" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_codes" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "customerId" INTEGER,
    "merchandiseConditionId" INTEGER,
    "warehouseId" INTEGER,
    "categoryId" INTEGER,
    "manifestId" INTEGER,
    "khoiPhuTrach" TEXT,
    "entryDate" TIMESTAMP(3),
    "orderCode" TEXT,
    "totalWeight" INTEGER,
    "totalVolume" DECIMAL(15,3),
    "infoSource" TEXT,
    "totalTransportFeeEstimate" DECIMAL(15,2),
    "totalImportCostToCustomer" DECIMAL(15,2),
    "exchangeRate" DECIMAL(15,4),
    "notes" TEXT,
    "vehicleStatus" "ManifestStatus",
    "vehicleStatusOverridden" BOOLEAN NOT NULL DEFAULT false,
    "exportOrderId" INTEGER,
    "exportStatus" "ExportOrderStatus",
    "exportDeliveryDateTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_codes_pkey" PRIMARY KEY ("id")
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
    "actualWeight" INTEGER,
    "actualVolume" DECIMAL(15,3),
    "actualItemTransportFeeEstimate" DECIMAL(15,2),
    "actualImportCostToCustomer" DECIMAL(15,2),
    "useActualData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "product_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifests" (
    "id" SERIAL NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "callerId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ManifestStatus" NOT NULL DEFAULT 'CHO_XEP_XE',
    "note" TEXT,
    "rentalCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_orders" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER,
    "createdById" INTEGER,
    "deliveryDateTime" TIMESTAMP(3),
    "deliveryCost" INTEGER,
    "notes" TEXT,
    "status" "ExportOrderStatus" NOT NULL DEFAULT 'DA_TAO_LENH',
    "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_orders_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT,
    "refId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_inquiries" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "customerName" TEXT,
    "businessType" TEXT,
    "phoneNumber" TEXT,
    "productName" TEXT,
    "material" TEXT,
    "usage" TEXT,
    "size" TEXT,
    "brand" TEXT,
    "specialInfo" TEXT,
    "techSpec" TEXT,
    "demand" TEXT,
    "answer" TEXT,
    "internalNote" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "customer_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_periods" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "openingBalance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_periods_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "images" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "declarationId" INTEGER,
    "inquiryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_deletion_queue" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'LOCAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_deletion_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_customerId_status_createdAt_idx" ON "transactions"("customerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "declarations_productItemId_key" ON "declarations"("productItemId");

-- CreateIndex
CREATE INDEX "export_orders_customerId_status_paymentReceived_createdAt_idx" ON "export_orders"("customerId", "status", "paymentReceived", "createdAt");

-- CreateIndex
CREATE INDEX "debt_periods_year_idx" ON "debt_periods"("year");

-- CreateIndex
CREATE UNIQUE INDEX "debt_periods_customerId_year_key" ON "debt_periods"("customerId", "year");

-- CreateIndex
CREATE INDEX "short_declarations_hash_idx" ON "short_declarations"("hash");

-- CreateIndex
CREATE INDEX "images_declarationId_idx" ON "images"("declarationId");

-- CreateIndex
CREATE INDEX "images_inquiryId_idx" ON "images"("inquiryId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "product_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_merchandiseConditionId_fkey" FOREIGN KEY ("merchandiseConditionId") REFERENCES "merchandise_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "manifests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_exportOrderId_fkey" FOREIGN KEY ("exportOrderId") REFERENCES "export_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_items" ADD CONSTRAINT "product_items_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifests" ADD CONSTRAINT "manifests_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_orders" ADD CONSTRAINT "export_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_orders" ADD CONSTRAINT "export_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_costs" ADD CONSTRAINT "warehouse_costs_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_details" ADD CONSTRAINT "package_details_productCodeId_fkey" FOREIGN KEY ("productCodeId") REFERENCES "product_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_periods" ADD CONSTRAINT "debt_periods_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "declarations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "customer_inquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

