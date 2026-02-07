-- CreateEnum
CREATE TYPE "ProductCodeStatus" AS ENUM ('NHAP_KHO_TQ', 'CHO_XEP_XE', 'DA_XEP_XE', 'KIEM_HOA', 'CHO_THONG_QUAN_VN', 'NHAP_KHO_VN', 'XUAT_THIEU', 'XUAT_DU');

-- AlterTable
ALTER TABLE "product_codes" ADD COLUMN     "status" "ProductCodeStatus" NOT NULL DEFAULT 'NHAP_KHO_TQ';
