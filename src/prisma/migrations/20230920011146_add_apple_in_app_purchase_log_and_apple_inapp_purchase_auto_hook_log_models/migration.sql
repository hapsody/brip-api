-- CreateTable
CREATE TABLE `AppleInAppPurchaseLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `originalTransactionDate` INTEGER NOT NULL,
    `originalTransactionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `transactionDate` INTEGER NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `adPlaceId` INTEGER NOT NULL,

    UNIQUE INDEX `AppleInAppPurchaseLog_originalTransactionId_key`(`originalTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppleInAppPurchaseAutoHookLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `TIappAccountToken` VARCHAR(191) NULL,
    `TIbundleId` VARCHAR(191) NOT NULL,
    `TIenvironment` VARCHAR(191) NOT NULL,
    `TIexpiresDate` INTEGER NULL,
    `TIinAppOwnershipType` VARCHAR(191) NOT NULL,
    `TIisUpgraded` BOOLEAN NULL,
    `TIofferIdentifier` VARCHAR(191) NULL,
    `TIofferType` INTEGER NULL,
    `TIoriginalPurchaseDate` INTEGER NOT NULL,
    `TIoriginalTransactionId` VARCHAR(191) NOT NULL,
    `TIproductId` VARCHAR(191) NOT NULL,
    `TIpurchaseDate` INTEGER NOT NULL,
    `TIquantity` INTEGER NOT NULL,
    `TIrevocationDate` INTEGER NULL,
    `TIrevocationReason` INTEGER NULL,
    `TIsignedDate` INTEGER NOT NULL,
    `TIstorefront` VARCHAR(191) NOT NULL,
    `TIstorefrontId` VARCHAR(191) NOT NULL,
    `TIsubscriptionGroupIdentifier` VARCHAR(191) NULL,
    `TItransactionId` VARCHAR(191) NOT NULL,
    `TItransactionReason` VARCHAR(191) NOT NULL,
    `TItype` VARCHAR(191) NOT NULL,
    `TIwebOrderLineItemId` VARCHAR(191) NOT NULL,
    `RIautoRenewProductId` VARCHAR(191) NOT NULL,
    `RIautoRenewStatus` INTEGER NOT NULL,
    `RIenvironment` VARCHAR(191) NOT NULL,
    `RIexpirationIntent` INTEGER NULL,
    `RIgracePeriodExpiresDate` INTEGER NULL,
    `RIisInBillingRetryPeriod` BOOLEAN NULL,
    `RIofferIdentifier` VARCHAR(191) NULL,
    `RIofferType` INTEGER NULL,
    `RIoriginalTransactionId` VARCHAR(191) NOT NULL,
    `RIpriceIncreaseStatus` INTEGER NULL,
    `RIproductId` VARCHAR(191) NOT NULL,
    `RIrecentSubscriptionStartDate` INTEGER NOT NULL,
    `RIrenewalDate` INTEGER NOT NULL,
    `RIsignedDate` INTEGER NOT NULL,
    `appleInAppPurchaseLogId` INTEGER NULL,

    UNIQUE INDEX `AppleInAppPurchaseAutoHookLog_TItransactionId_key`(`TItransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AppleInAppPurchaseLog` ADD CONSTRAINT `AppleInAppPurchaseLog_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppleInAppPurchaseAutoHookLog` ADD CONSTRAINT `AppleInAppPurchaseAutoHookLog_appleInAppPurchaseLogId_fkey` FOREIGN KEY (`appleInAppPurchaseLogId`) REFERENCES `AppleInAppPurchaseLog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
