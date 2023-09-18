/*
  Warnings:

  - Added the required column `expiryTime` to the `GoogleInAppPurchaseLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `GoogleInAppPurchaseLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `GoogleInAppPurchaseLog` ADD COLUMN `expiryTime` INTEGER NOT NULL,
    ADD COLUMN `startTime` INTEGER NOT NULL;
