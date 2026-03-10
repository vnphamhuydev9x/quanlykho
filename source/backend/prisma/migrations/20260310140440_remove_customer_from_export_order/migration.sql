-- CreateEnum
CREATE TYPE "ExportOrderStatus" AS ENUM ('DA_TAO_LENH', 'DANG_XAC_NHAN_CAN', 'DA_XAC_NHAN_CAN', 'DA_XUAT_KHO');

-- AlterTable
ALTER TABLE "declarations" ADD COLUMN     "declarationCost" INTEGER;

-- AlterTable
ALTER TABLE "product_codes" ADD COLUMN     "exportDeliveryDateTime" TIMESTAMP(3),
ADD COLUMN     "exportOrderId" INTEGER,
ADD COLUMN     "exportStatus" "ExportOrderStatus",
ADD COLUMN     "khoiPhuTrach" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "totalImportCostToCustomer" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "product_items" ADD COLUMN     "actualImportCostToCustomer" DECIMAL(15,2),
ADD COLUMN     "actualItemTransportFeeEstimate" DECIMAL(15,2),
ADD COLUMN     "actualVolume" DECIMAL(15,3),
ADD COLUMN     "actualWeight" INTEGER,
ADD COLUMN     "useActualData" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "export_orders" (
    "id" SERIAL NOT NULL,
    "createdById" INTEGER,
    "deliveryDateTime" TIMESTAMP(3),
    "deliveryCost" INTEGER,
    "notes" TEXT,
    "status" "ExportOrderStatus" NOT NULL DEFAULT 'DA_TAO_LENH',
    "amountReceived" INTEGER,
    "actualShippingCost" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_orders_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_exportOrderId_fkey" FOREIGN KEY ("exportOrderId") REFERENCES "export_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_orders" ADD CONSTRAINT "export_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
