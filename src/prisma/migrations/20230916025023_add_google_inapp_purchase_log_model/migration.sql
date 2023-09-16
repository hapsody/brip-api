-- CreateTable
CREATE TABLE `GoogleInAppPurchaseLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `orderId` VARCHAR(191) NOT NULL,
    `packageName` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `purchaseTime` VARCHAR(191) NOT NULL,
    `purchaseState` INTEGER NOT NULL,
    `purchaseToken` VARCHAR(255) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `autoRenewing` BOOLEAN NOT NULL,
    `acknowledged` BOOLEAN NOT NULL,
    `adPlaceId` INTEGER NOT NULL,

    UNIQUE INDEX `GoogleInAppPurchaseLog_orderId_key`(`orderId`),
    UNIQUE INDEX `GoogleInAppPurchaseLog_purchaseToken_key`(`purchaseToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GoogleInAppPurchaseLog` ADD CONSTRAINT `GoogleInAppPurchaseLog_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
