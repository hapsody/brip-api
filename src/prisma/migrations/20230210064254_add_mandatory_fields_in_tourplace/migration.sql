/*
  Warnings:

  - You are about to drop the column `shareTripMemTPId` on the `GglPhotos` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `GglPhotos` DROP FOREIGN KEY `GglPhotos_shareTripMemTPId_fkey`;

-- AlterTable
ALTER TABLE `GglPhotos` DROP COLUMN `shareTripMemTPId`;

-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `contact` VARCHAR(191) NULL,
    ADD COLUMN `openWeek` VARCHAR(191) NULL,
    ADD COLUMN `postcode` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `IBPhotos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `key` VARCHAR(191) NULL,
    `url` TEXT NULL,
    `tourPlaceId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
