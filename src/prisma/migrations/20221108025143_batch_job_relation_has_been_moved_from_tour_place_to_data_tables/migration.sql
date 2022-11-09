/*
  Warnings:

  - You are about to drop the column `batchQueryParamsId` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `batchSearchKeywordId` on the `TourPlace` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_batchQueryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_batchSearchKeywordId_fkey`;

-- AlterTable
ALTER TABLE `GglNearbySearchRes` ADD COLUMN `batchQueryParamsId` INTEGER NULL,
    ADD COLUMN `batchSearchKeywordId` INTEGER NULL;

-- AlterTable
ALTER TABLE `SearchHotelRes` ADD COLUMN `batchQueryParamsId` INTEGER NULL,
    ADD COLUMN `batchSearchKeywordId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` DROP COLUMN `batchQueryParamsId`,
    DROP COLUMN `batchSearchKeywordId`;

-- AlterTable
ALTER TABLE `VisitJejuData` ADD COLUMN `batchQueryParamsId` INTEGER NULL,
    ADD COLUMN `batchSearchKeywordId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchHotelRes` ADD CONSTRAINT `SearchHotelRes_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchHotelRes` ADD CONSTRAINT `SearchHotelRes_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitJejuData` ADD CONSTRAINT `VisitJejuData_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitJejuData` ADD CONSTRAINT `VisitJejuData_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
