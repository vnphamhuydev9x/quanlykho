-- CreateTable
CREATE TABLE "customer_inquiries" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
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
