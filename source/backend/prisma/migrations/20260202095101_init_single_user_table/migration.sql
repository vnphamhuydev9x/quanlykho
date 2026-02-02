-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('EMPLOYEE', 'CUSTOMER');

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

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_customerCode_key" ON "users"("customerCode");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
