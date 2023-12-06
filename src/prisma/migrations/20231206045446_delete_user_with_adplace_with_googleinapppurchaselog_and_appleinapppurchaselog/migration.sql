-- DropForeignKey
ALTER TABLE `AppleInAppPurchaseLog` DROP FOREIGN KEY `AppleInAppPurchaseLog_adPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `GoogleInAppPurchaseLog` DROP FOREIGN KEY `GoogleInAppPurchaseLog_adPlaceId_fkey`;

-- AddForeignKey
ALTER TABLE `GoogleInAppPurchaseLog` ADD CONSTRAINT `GoogleInAppPurchaseLog_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppleInAppPurchaseLog` ADD CONSTRAINT `AppleInAppPurchaseLog_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
