/*
  Warnings:

  - Added the required column `comment` to the `ShareTripMemory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ShareTripMemory` DROP FOREIGN KEY `ShareTripMemory_tripMemoryId_fkey`;

-- AlterTable
ALTER TABLE `GglPhotos` ADD COLUMN `shareTripMemTPId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ShareTripMemory` ADD COLUMN `comment` TEXT NOT NULL,
    MODIFY `tripMemoryId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `address` TEXT NULL,
    ADD COLUMN `lat` DOUBLE NULL,
    ADD COLUMN `lng` DOUBLE NULL,
    MODIFY `tourPlaceType` ENUM('BKC_HOTEL', 'GL_RESTAURANT', 'GL_SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT', 'USER_SPOT', 'USER_RESTAURANT') NOT NULL,
    MODIFY `status` ENUM('NEW', 'USER_CREATE_NEW', 'APPROVED', 'IN_USE', 'ARCHIVED') NOT NULL DEFAULT 'NEW';

-- AddForeignKey
ALTER TABLE `GglPhotos` ADD CONSTRAINT `GglPhotos_shareTripMemTPId_fkey` FOREIGN KEY (`shareTripMemTPId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_tripMemoryId_fkey` FOREIGN KEY (`tripMemoryId`) REFERENCES `TripMemory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
