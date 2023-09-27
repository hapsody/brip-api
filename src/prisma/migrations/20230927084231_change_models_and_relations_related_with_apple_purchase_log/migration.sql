/*
  Warnings:

  - You are about to drop the column `RIautoRenewProductId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIautoRenewStatus` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIenvironment` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIexpirationIntent` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIgracePeriodExpiresDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIisInBillingRetryPeriod` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIofferIdentifier` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIofferType` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIoriginalTransactionId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIpriceIncreaseStatus` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIproductId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIrecentSubscriptionStartDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIrenewalDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `RIsignedDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIappAccountToken` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIbundleId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIenvironment` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIexpiresDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIinAppOwnershipType` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIisUpgraded` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIofferIdentifier` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIofferType` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIoriginalPurchaseDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIoriginalTransactionId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIproductId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIpurchaseDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIquantity` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIrevocationDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIrevocationReason` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIsignedDate` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIstorefront` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIstorefrontId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIsubscriptionGroupIdentifier` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TItransactionId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TItransactionReason` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TItype` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - You are about to drop the column `TIwebOrderLineItemId` on the `AppleInAppPurchaseAutoHookLog` table. All the data in the column will be lost.
  - Added the required column `notificationType` to the `AppleInAppPurchaseAutoHookLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notificationUUID` to the `AppleInAppPurchaseAutoHookLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signedDate` to the `AppleInAppPurchaseAutoHookLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `version` to the `AppleInAppPurchaseAutoHookLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `AppleInAppPurchaseAutoHookLog` DROP FOREIGN KEY `AppleInAppPurchaseAutoHookLog_appleInAppPurchaseLogId_fkey`;

-- DropIndex
DROP INDEX `AppleInAppPurchaseAutoHookLog_TItransactionId_key` ON `AppleInAppPurchaseAutoHookLog`;

-- AlterTable
ALTER TABLE `AppleInAppPurchaseAutoHookLog` DROP COLUMN `RIautoRenewProductId`,
    DROP COLUMN `RIautoRenewStatus`,
    DROP COLUMN `RIenvironment`,
    DROP COLUMN `RIexpirationIntent`,
    DROP COLUMN `RIgracePeriodExpiresDate`,
    DROP COLUMN `RIisInBillingRetryPeriod`,
    DROP COLUMN `RIofferIdentifier`,
    DROP COLUMN `RIofferType`,
    DROP COLUMN `RIoriginalTransactionId`,
    DROP COLUMN `RIpriceIncreaseStatus`,
    DROP COLUMN `RIproductId`,
    DROP COLUMN `RIrecentSubscriptionStartDate`,
    DROP COLUMN `RIrenewalDate`,
    DROP COLUMN `RIsignedDate`,
    DROP COLUMN `TIappAccountToken`,
    DROP COLUMN `TIbundleId`,
    DROP COLUMN `TIenvironment`,
    DROP COLUMN `TIexpiresDate`,
    DROP COLUMN `TIinAppOwnershipType`,
    DROP COLUMN `TIisUpgraded`,
    DROP COLUMN `TIofferIdentifier`,
    DROP COLUMN `TIofferType`,
    DROP COLUMN `TIoriginalPurchaseDate`,
    DROP COLUMN `TIoriginalTransactionId`,
    DROP COLUMN `TIproductId`,
    DROP COLUMN `TIpurchaseDate`,
    DROP COLUMN `TIquantity`,
    DROP COLUMN `TIrevocationDate`,
    DROP COLUMN `TIrevocationReason`,
    DROP COLUMN `TIsignedDate`,
    DROP COLUMN `TIstorefront`,
    DROP COLUMN `TIstorefrontId`,
    DROP COLUMN `TIsubscriptionGroupIdentifier`,
    DROP COLUMN `TItransactionId`,
    DROP COLUMN `TItransactionReason`,
    DROP COLUMN `TItype`,
    DROP COLUMN `TIwebOrderLineItemId`,
    ADD COLUMN `notificationType` VARCHAR(191) NOT NULL,
    ADD COLUMN `notificationUUID` VARCHAR(191) NOT NULL,
    ADD COLUMN `signedDate` DATETIME(3) NOT NULL,
    ADD COLUMN `subType` VARCHAR(191) NULL,
    ADD COLUMN `version` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `AppleHookLogData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appAppleId` VARCHAR(191) NOT NULL,
    `bundleId` VARCHAR(191) NOT NULL,
    `bundleVersion` INTEGER NOT NULL,
    `environment` VARCHAR(191) NOT NULL,
    `status` INTEGER NULL,
    `appleInAppPurchaseAutoHookLogId` INTEGER NOT NULL,

    UNIQUE INDEX `AppleHookLogData_appleInAppPurchaseAutoHookLogId_key`(`appleInAppPurchaseAutoHookLogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppleTransactionInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appAccountToken` VARCHAR(191) NULL,
    `bundleId` VARCHAR(191) NOT NULL,
    `environment` VARCHAR(191) NOT NULL,
    `expiresDate` INTEGER NULL,
    `inAppOwnershipType` VARCHAR(191) NOT NULL,
    `isUpgraded` BOOLEAN NULL,
    `offerIdentifier` VARCHAR(191) NULL,
    `offerType` INTEGER NULL,
    `originalPurchaseDate` INTEGER NOT NULL,
    `originalTransactionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `purchaseDate` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `revocationDate` INTEGER NULL,
    `revocationReason` INTEGER NULL,
    `signedDate` INTEGER NOT NULL,
    `storefront` VARCHAR(191) NOT NULL,
    `storefrontId` VARCHAR(191) NOT NULL,
    `subscriptionGroupIdentifier` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `transactionReason` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `webOrderLineItemId` VARCHAR(191) NOT NULL,
    `appleHookLogDataId` INTEGER NOT NULL,

    UNIQUE INDEX `AppleTransactionInfo_transactionId_key`(`transactionId`),
    UNIQUE INDEX `AppleTransactionInfo_appleHookLogDataId_key`(`appleHookLogDataId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppleRenewalInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `autoRenewProductId` VARCHAR(191) NOT NULL,
    `autoRenewStatus` INTEGER NOT NULL,
    `environment` VARCHAR(191) NOT NULL,
    `expirationIntent` INTEGER NULL,
    `gracePeriodExpiresDate` INTEGER NULL,
    `isInBillingRetryPeriod` BOOLEAN NULL,
    `offerIdentifier` VARCHAR(191) NULL,
    `offerType` INTEGER NULL,
    `originalTransactionId` VARCHAR(191) NOT NULL,
    `priceIncreaseStatus` INTEGER NULL,
    `productId` VARCHAR(191) NOT NULL,
    `recentSubscriptionStartDate` INTEGER NOT NULL,
    `renewalDate` INTEGER NOT NULL,
    `signedDate` INTEGER NOT NULL,
    `appleHookLogDataId` INTEGER NOT NULL,

    UNIQUE INDEX `AppleRenewalInfo_appleHookLogDataId_key`(`appleHookLogDataId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AppleInAppPurchaseAutoHookLog` ADD CONSTRAINT `AppleInAppPurchaseAutoHookLog_appleInAppPurchaseLogId_fkey` FOREIGN KEY (`appleInAppPurchaseLogId`) REFERENCES `AppleInAppPurchaseLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppleHookLogData` ADD CONSTRAINT `AppleHookLogData_appleInAppPurchaseAutoHookLogId_fkey` FOREIGN KEY (`appleInAppPurchaseAutoHookLogId`) REFERENCES `AppleInAppPurchaseAutoHookLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppleTransactionInfo` ADD CONSTRAINT `AppleTransactionInfo_appleHookLogDataId_fkey` FOREIGN KEY (`appleHookLogDataId`) REFERENCES `AppleHookLogData`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppleRenewalInfo` ADD CONSTRAINT `AppleRenewalInfo_appleHookLogDataId_fkey` FOREIGN KEY (`appleHookLogDataId`) REFERENCES `AppleHookLogData`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
