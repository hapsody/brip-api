-- DropForeignKey
ALTER TABLE `RModelBetweenTravelType` DROP FOREIGN KEY `RModelBetweenTravelType_fromId_fkey`;

-- AddForeignKey
ALTER TABLE `RModelBetweenTravelType` ADD CONSTRAINT `RModelBetweenTravelType_fromId_fkey` FOREIGN KEY (`fromId`) REFERENCES `IBTravelTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
