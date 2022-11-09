/*
  Warnings:

  - You are about to drop the column `tourPlaceId` on the `GglNearbySearchRes` table. All the data in the column will be lost.
  - You are about to drop the column `tourPlaceId` on the `SearchHotelRes` table. All the data in the column will be lost.
  - You are about to drop the column `tourPlaceId` on the `VisitJejuData` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_tourPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `SearchHotelRes` DROP FOREIGN KEY `SearchHotelRes_tourPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitJejuData` DROP FOREIGN KEY `VisitJejuData_tourPlaceId_fkey`;

-- AlterTable
ALTER TABLE `GglNearbySearchRes` DROP COLUMN `tourPlaceId`;

-- AlterTable
ALTER TABLE `SearchHotelRes` DROP COLUMN `tourPlaceId`;

-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `gglNearbySearchResId` INTEGER NULL,
    ADD COLUMN `searchHotelResId` INTEGER NULL,
    ADD COLUMN `visitJejuDataId` INTEGER NULL;

-- AlterTable
ALTER TABLE `VisitJejuData` DROP COLUMN `tourPlaceId`;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_gglNearbySearchResId_fkey` FOREIGN KEY (`gglNearbySearchResId`) REFERENCES `GglNearbySearchRes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_searchHotelResId_fkey` FOREIGN KEY (`searchHotelResId`) REFERENCES `SearchHotelRes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_visitJejuDataId_fkey` FOREIGN KEY (`visitJejuDataId`) REFERENCES `VisitJejuData`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
