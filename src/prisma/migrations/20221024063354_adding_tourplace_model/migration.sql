/*
  Warnings:

  - You are about to drop the column `batchQueryParamsId` on the `GglNearbySearchRes` table. All the data in the column will be lost.
  - You are about to drop the column `batchSearchKeywordId` on the `GglNearbySearchRes` table. All the data in the column will be lost.
  - You are about to drop the column `queryParamsId` on the `GglNearbySearchRes` table. All the data in the column will be lost.
  - You are about to drop the column `queryParamsId` on the `SearchHotelRes` table. All the data in the column will be lost.
  - You are about to drop the column `hotelId` on the `VisitSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `restaurantId` on the `VisitSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `spotId` on the `VisitSchedule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tourPlaceId]` on the table `GglNearbySearchRes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tourPlaceId]` on the table `SearchHotelRes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tourPlaceId` to the `GglNearbySearchRes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tourPlaceId` to the `SearchHotelRes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_batchQueryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_batchSearchKeywordId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `SearchHotelRes` DROP FOREIGN KEY `SearchHotelRes_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitSchedule` DROP FOREIGN KEY `VisitSchedule_hotelId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitSchedule` DROP FOREIGN KEY `VisitSchedule_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitSchedule` DROP FOREIGN KEY `VisitSchedule_spotId_fkey`;

-- AlterTable
ALTER TABLE `GglNearbySearchRes` DROP COLUMN `batchQueryParamsId`,
    DROP COLUMN `batchSearchKeywordId`,
    DROP COLUMN `queryParamsId`,
    ADD COLUMN `tourPlaceId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `SearchHotelRes` DROP COLUMN `queryParamsId`,
    ADD COLUMN `tourPlaceId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `VisitSchedule` DROP COLUMN `hotelId`,
    DROP COLUMN `restaurantId`,
    DROP COLUMN `spotId`,
    ADD COLUMN `tourPlaceId` INTEGER NULL;

-- CreateTable
CREATE TABLE `TourPlace` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `queryParamsId` INTEGER NULL,
    `batchQueryParamsId` INTEGER NULL,
    `batchSearchKeywordId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `GglNearbySearchRes_tourPlaceId_key` ON `GglNearbySearchRes`(`tourPlaceId`);

-- CreateIndex
CREATE UNIQUE INDEX `SearchHotelRes_tourPlaceId_key` ON `SearchHotelRes`(`tourPlaceId`);

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchHotelRes` ADD CONSTRAINT `SearchHotelRes_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
