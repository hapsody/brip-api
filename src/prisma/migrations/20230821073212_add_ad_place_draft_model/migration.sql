/*
  Warnings:

  - You are about to alter the column `status` on the `AdPlace` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(12))`.
  - A unique constraint covering the columns `[title,lat,lng,status]` on the table `TourPlace` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `AdPlace` DROP FOREIGN KEY `AdPlace_userId_fkey`;

-- AlterTable
ALTER TABLE `AdPlace` MODIFY `status` ENUM('IN_USE', 'STOP') NOT NULL DEFAULT 'STOP';

-- AlterTable
ALTER TABLE `IBPhotos` ADD COLUMN `adPlaceDraftAsSubId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `adPlaceDraftId` INTEGER NULL;

-- CreateTable
CREATE TABLE `AdPlaceDraft` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('STAGING', 'APPLIED') NOT NULL DEFAULT 'STAGING',
    `title` VARCHAR(191) NOT NULL,
    `mainPhotoId` INTEGER NOT NULL,
    `desc` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `roadAddress` VARCHAR(191) NULL,
    `detailAddress` VARCHAR(191) NULL,
    `openWeek` TEXT NULL,
    `closedDay` TEXT NULL,
    `contact` VARCHAR(191) NULL,
    `siteUrl` TEXT NULL,
    `businessNumber` VARCHAR(191) NULL,
    `businessRegImgKey` VARCHAR(191) NULL,
    `nationalCode` CHAR(7) NOT NULL DEFAULT '82',
    `mainTourPlaceId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `adPlaceId` INTEGER NULL,

    UNIQUE INDEX `AdPlaceDraft_mainPhotoId_key`(`mainPhotoId`),
    UNIQUE INDEX `AdPlaceDraft_businessNumber_key`(`businessNumber`),
    UNIQUE INDEX `AdPlaceDraft_adPlaceId_key`(`adPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AdPlaceDraftToIBTravelTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_AdPlaceDraftToIBTravelTag_AB_unique`(`A`, `B`),
    INDEX `_AdPlaceDraftToIBTravelTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `TourPlace_title_lat_lng_status_key` ON `TourPlace`(`title`, `lat`, `lng`, `status`);

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_adPlaceDraftAsSubId_fkey` FOREIGN KEY (`adPlaceDraftAsSubId`) REFERENCES `AdPlaceDraft`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_adPlaceDraftId_fkey` FOREIGN KEY (`adPlaceDraftId`) REFERENCES `AdPlaceDraft`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlace` ADD CONSTRAINT `AdPlace_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceDraft` ADD CONSTRAINT `AdPlaceDraft_mainPhotoId_fkey` FOREIGN KEY (`mainPhotoId`) REFERENCES `IBPhotos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceDraft` ADD CONSTRAINT `AdPlaceDraft_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceDraft` ADD CONSTRAINT `AdPlaceDraft_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdPlaceDraftToIBTravelTag` ADD CONSTRAINT `_AdPlaceDraftToIBTravelTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `AdPlaceDraft`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdPlaceDraftToIBTravelTag` ADD CONSTRAINT `_AdPlaceDraftToIBTravelTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `IBTravelTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
