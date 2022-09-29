/*
  Warnings:

  - You are about to drop the column `dataId` on the `VisitSchedule` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `VisitSchedule` DROP COLUMN `dataId`,
    ADD COLUMN `hotelId` INTEGER NULL,
    ADD COLUMN `restaurantId` INTEGER NULL,
    ADD COLUMN `spotId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_spotId_fkey` FOREIGN KEY (`spotId`) REFERENCES `GglNearbySearchRes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `GglNearbySearchRes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `SearchHotelRes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
