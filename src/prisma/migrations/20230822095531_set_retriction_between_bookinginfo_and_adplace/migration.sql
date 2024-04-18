-- DropForeignKey
ALTER TABLE `BookingInfo` DROP FOREIGN KEY `BookingInfo_adPlaceId_fkey`;

-- AddForeignKey
ALTER TABLE `BookingInfo` ADD CONSTRAINT `BookingInfo_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
