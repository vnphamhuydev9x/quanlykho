/*
  Warnings:

  - You are about to drop the column `taggedImage` on the `product_codes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "product_codes" DROP COLUMN "taggedImage",
ADD COLUMN     "taggedImages" TEXT[];
