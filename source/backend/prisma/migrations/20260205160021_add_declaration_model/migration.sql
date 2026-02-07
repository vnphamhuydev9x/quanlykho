-- CreateTable
CREATE TABLE "declarations" (
    "id" SERIAL NOT NULL,
    "invoiceRequestName" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "productNameVi" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPackages" INTEGER NOT NULL,
    "totalWeight" DECIMAL(15,2) NOT NULL,
    "totalVolume" DECIMAL(15,3) NOT NULL,
    "productDescription" TEXT,
    "contractPrice" DECIMAL(15,2) NOT NULL,
    "productUsage" TEXT,
    "productUnit" TEXT NOT NULL,
    "declarationPriceVND" DECIMAL(15,0) NOT NULL,
    "importTaxPercent" DECIMAL(5,2) NOT NULL,
    "vatPercent" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "serviceFeePercent" DECIMAL(5,2) NOT NULL,
    "isDeclared" BOOLEAN NOT NULL DEFAULT false,
    "supplierName" TEXT,
    "supplierAddress" TEXT,
    "labelCode" TEXT,
    "labelDate" TIMESTAMP(3),
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "declarations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
