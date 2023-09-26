/*
  Warnings:

  - You are about to drop the column `expiresDate` on the `AppleInAppPurchaseLog` table. All the data in the column will be lost.
  - You are about to drop the column `packageName` on the `GoogleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `GoogleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `expiryTime` on the `GoogleInAppPurchaseLog` table. All the data in the column will be lost.
  - You are about to drop the column `packageName` on the `GoogleInAppPurchaseLog` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `GoogleInAppPurchaseLog` table. All the data in the column will be lost.
  - Made the column `expireDateFormat` on table `AppleInAppPurchaseLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expireDateFormat` on table `GoogleInAppPurchaseLog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `AppleInAppPurchaseLog` DROP COLUMN `expiresDate`,
    MODIFY `expireDateFormat` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `GoogleInAppPurchaseAutoHookLog` DROP COLUMN `packageName`,
    DROP COLUMN `subscriptionId`;

-- AlterTable
ALTER TABLE `GoogleInAppPurchaseLog` DROP COLUMN `expiryTime`,
    DROP COLUMN `packageName`,
    DROP COLUMN `productId`,
    MODIFY `purchaseTime` VARCHAR(191) NULL,
    MODIFY `expireDateFormat` DATETIME(3) NOT NULL;
