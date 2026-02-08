-- AlterTable
ALTER TABLE "product_codes" ADD COLUMN     "manifestId" INTEGER;

-- CreateTable
CREATE TABLE "manifests" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "manifests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "product_codes" ADD CONSTRAINT "product_codes_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "manifests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
