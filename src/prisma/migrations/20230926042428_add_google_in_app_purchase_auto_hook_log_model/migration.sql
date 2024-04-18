-- AlterTable
ALTER TABLE `AppleInAppPurchaseLog` ADD COLUMN `expireDateFormat` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `GoogleInAppPurchaseLog` ADD COLUMN `expireDateFormat` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `GoogleInAppPurchaseAutoHookLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `packageName` VARCHAR(191) NOT NULL,
    `notificationType` INTEGER NOT NULL,
    `purchaseToken` CHAR(255) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `publishTime` VARCHAR(191) NOT NULL,
    `googleInAppPurchaseLogId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GoogleInAppPurchaseAutoHookLog` ADD CONSTRAINT `GoogleInAppPurchaseAutoHookLog_googleInAppPurchaseLogId_fkey` FOREIGN KEY (`googleInAppPurchaseLogId`) REFERENCES `GoogleInAppPurchaseLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
