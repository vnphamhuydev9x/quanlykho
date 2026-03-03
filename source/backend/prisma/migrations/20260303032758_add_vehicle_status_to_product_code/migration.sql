-- AlterTable
ALTER TABLE "product_codes" ADD COLUMN     "vehicleStatus" "ManifestStatus",
ADD COLUMN     "vehicleStatusOverridden" BOOLEAN NOT NULL DEFAULT false;
