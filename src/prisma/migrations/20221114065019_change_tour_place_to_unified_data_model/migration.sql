/*
  Warnings:

  - You are about to drop the column `gglNearbySearchResId` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `searchHotelResId` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `visitJejuDataId` on the `TourPlace` table. All the data in the column will be lost.
  - The values [HOTEL,RESTAURANT,SPOT] on the enum `TourPlace_tourPlaceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `dataId` on the `VisitSchedule` table. All the data in the column will be lost.
  - You are about to drop the `GglNearbySearchRes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GglPlusCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Gglgeometry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SearchHotelRes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisitJejuData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GglNearbySearchResToGglNearbySearchResType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GglNearbySearchResToGglPhotos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_VisitJejuDataToVisitJejuTag` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[gl_place_id]` on the table `TourPlace` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vj_contentsid]` on the table `TourPlace` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_batchQueryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_batchSearchKeywordId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_gglgeometryId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_plus_codeId_fkey`;

-- DropForeignKey
ALTER TABLE `SearchHotelRes` DROP FOREIGN KEY `SearchHotelRes_batchQueryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `SearchHotelRes` DROP FOREIGN KEY `SearchHotelRes_batchSearchKeywordId_fkey`;

-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_gglNearbySearchResId_fkey`;

-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_searchHotelResId_fkey`;

-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_visitJejuDataId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitJejuData` DROP FOREIGN KEY `VisitJejuData_batchQueryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitJejuData` DROP FOREIGN KEY `VisitJejuData_batchSearchKeywordId_fkey`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglNearbySearchResType` DROP FOREIGN KEY `_GglNearbySearchResToGglNearbySearchResType_ibfk_1`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglNearbySearchResType` DROP FOREIGN KEY `_GglNearbySearchResToGglNearbySearchResType_ibfk_2`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` DROP FOREIGN KEY `_GglNearbySearchResToGglPhotos_ibfk_1`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` DROP FOREIGN KEY `_GglNearbySearchResToGglPhotos_ibfk_2`;

-- DropForeignKey
ALTER TABLE `_VisitJejuDataToVisitJejuTag` DROP FOREIGN KEY `_VisitJejuDataToVisitJejuTag_A_fkey`;

-- DropForeignKey
ALTER TABLE `_VisitJejuDataToVisitJejuTag` DROP FOREIGN KEY `_VisitJejuDataToVisitJejuTag_B_fkey`;

-- AlterTable
ALTER TABLE `GglPhotos` ADD COLUMN `tourPlaceId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` DROP COLUMN `gglNearbySearchResId`,
    DROP COLUMN `searchHotelResId`,
    DROP COLUMN `visitJejuDataId`,
    ADD COLUMN `accommodation_type_name` VARCHAR(191) NULL,
    ADD COLUMN `batchQueryParamsId` INTEGER NULL,
    ADD COLUMN `batchSearchKeywordId` INTEGER NULL,
    ADD COLUMN `bkc_address` VARCHAR(191) NULL,
    ADD COLUMN `bkc_checkin` VARCHAR(191) NULL,
    ADD COLUMN `bkc_checkout` VARCHAR(191) NULL,
    ADD COLUMN `bkc_city` VARCHAR(191) NULL,
    ADD COLUMN `bkc_city_name_en` VARCHAR(191) NULL,
    ADD COLUMN `bkc_countrycode` VARCHAR(191) NULL,
    ADD COLUMN `bkc_currency_code` VARCHAR(191) NULL,
    ADD COLUMN `bkc_default_language` VARCHAR(191) NULL,
    ADD COLUMN `bkc_distance` DOUBLE NULL,
    ADD COLUMN `bkc_gross_amount` DOUBLE NULL,
    ADD COLUMN `bkc_gross_amount_per_night` DOUBLE NULL DEFAULT -1,
    ADD COLUMN `bkc_hotelClass` INTEGER NULL DEFAULT -1,
    ADD COLUMN `bkc_hotel_facilities` TEXT NULL,
    ADD COLUMN `bkc_hotel_id` INTEGER NULL,
    ADD COLUMN `bkc_hotel_name` VARCHAR(191) NULL,
    ADD COLUMN `bkc_included_taxes_and_charges_amount` DOUBLE NULL,
    ADD COLUMN `bkc_latitude` DOUBLE NULL,
    ADD COLUMN `bkc_longitude` DOUBLE NULL,
    ADD COLUMN `bkc_main_photo_url` VARCHAR(191) NULL,
    ADD COLUMN `bkc_max_photo_url` VARCHAR(191) NULL,
    ADD COLUMN `bkc_min_total_price` DOUBLE NULL,
    ADD COLUMN `bkc_net_amount` DOUBLE NULL,
    ADD COLUMN `bkc_review_score` DOUBLE NULL,
    ADD COLUMN `bkc_review_score_word` VARCHAR(191) NULL,
    ADD COLUMN `bkc_timezone` VARCHAR(191) NULL,
    ADD COLUMN `bkc_unit_configuration_label` VARCHAR(191) NULL,
    ADD COLUMN `bkc_urgency_message` VARCHAR(191) NULL,
    ADD COLUMN `bkc_url` VARCHAR(191) NULL,
    ADD COLUMN `bkc_zip` VARCHAR(191) NULL,
    ADD COLUMN `gl_formatted_address` VARCHAR(191) NULL,
    ADD COLUMN `gl_icon` VARCHAR(191) NULL,
    ADD COLUMN `gl_icon_background_color` VARCHAR(191) NULL,
    ADD COLUMN `gl_icon_mask_base_uri` VARCHAR(191) NULL,
    ADD COLUMN `gl_lat` DOUBLE NULL,
    ADD COLUMN `gl_lng` DOUBLE NULL,
    ADD COLUMN `gl_name` VARCHAR(191) NULL,
    ADD COLUMN `gl_opening_hours` BOOLEAN NULL,
    ADD COLUMN `gl_place_id` VARCHAR(191) NULL,
    ADD COLUMN `gl_price_level` INTEGER NULL,
    ADD COLUMN `gl_rating` DOUBLE NULL,
    ADD COLUMN `gl_user_ratings_total` INTEGER NULL,
    ADD COLUMN `gl_vicinity` VARCHAR(191) NULL,
    ADD COLUMN `gl_viewport_ne_lat` DOUBLE NULL,
    ADD COLUMN `gl_viewport_ne_lng` DOUBLE NULL,
    ADD COLUMN `gl_viewport_sw_lat` DOUBLE NULL,
    ADD COLUMN `gl_viewport_sw_lng` DOUBLE NULL,
    ADD COLUMN `vj_address` VARCHAR(191) NULL,
    ADD COLUMN `vj_contentscdLabel` VARCHAR(191) NULL,
    ADD COLUMN `vj_contentscdRefId` VARCHAR(191) NULL,
    ADD COLUMN `vj_contentscdValue` VARCHAR(191) NULL,
    ADD COLUMN `vj_contentsid` VARCHAR(191) NULL,
    ADD COLUMN `vj_introduction` TEXT NULL,
    ADD COLUMN `vj_latitude` DOUBLE NULL,
    ADD COLUMN `vj_longitude` DOUBLE NULL,
    ADD COLUMN `vj_phoneno` VARCHAR(191) NULL,
    ADD COLUMN `vj_postcode` VARCHAR(191) NULL,
    ADD COLUMN `vj_region1cdLabel` VARCHAR(191) NULL,
    ADD COLUMN `vj_region1cdRefId` VARCHAR(191) NULL,
    ADD COLUMN `vj_region1cdValue` VARCHAR(191) NULL,
    ADD COLUMN `vj_region2cdLabel` VARCHAR(191) NULL,
    ADD COLUMN `vj_region2cdRefId` VARCHAR(191) NULL,
    ADD COLUMN `vj_region2cdValue` VARCHAR(191) NULL,
    ADD COLUMN `vj_roadaddress` VARCHAR(191) NULL,
    ADD COLUMN `vj_title` VARCHAR(191) NULL,
    MODIFY `tourPlaceType` ENUM('BKC_HOTEL', 'GL_RESTAURANT', 'GL_SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT') NOT NULL;

-- AlterTable
ALTER TABLE `VisitSchedule` DROP COLUMN `dataId`;

-- DropTable
DROP TABLE `GglNearbySearchRes`;

-- DropTable
DROP TABLE `GglPlusCode`;

-- DropTable
DROP TABLE `Gglgeometry`;

-- DropTable
DROP TABLE `SearchHotelRes`;

-- DropTable
DROP TABLE `VisitJejuData`;

-- DropTable
DROP TABLE `_GglNearbySearchResToGglNearbySearchResType`;

-- DropTable
DROP TABLE `_GglNearbySearchResToGglPhotos`;

-- DropTable
DROP TABLE `_VisitJejuDataToVisitJejuTag`;

-- CreateTable
CREATE TABLE `_GglNearbySearchResTypeToTourPlace` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_GglNearbySearchResTypeToTourPlace_AB_unique`(`A`, `B`),
    INDEX `_GglNearbySearchResTypeToTourPlace_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TourPlaceToVisitJejuTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TourPlaceToVisitJejuTag_AB_unique`(`A`, `B`),
    INDEX `_TourPlaceToVisitJejuTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `TourPlace_gl_place_id_key` ON `TourPlace`(`gl_place_id`);

-- CreateIndex
CREATE UNIQUE INDEX `TourPlace_vj_contentsid_key` ON `TourPlace`(`vj_contentsid`);

-- CreateIndex
CREATE INDEX `TourPlace_gl_place_id_vj_contentsid_idx` ON `TourPlace`(`gl_place_id`, `vj_contentsid`);

-- AddForeignKey
ALTER TABLE `GglPhotos` ADD CONSTRAINT `GglPhotos_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResTypeToTourPlace` ADD CONSTRAINT `_GglNearbySearchResTypeToTourPlace_A_fkey` FOREIGN KEY (`A`) REFERENCES `GglNearbySearchResType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResTypeToTourPlace` ADD CONSTRAINT `_GglNearbySearchResTypeToTourPlace_B_fkey` FOREIGN KEY (`B`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToVisitJejuTag` ADD CONSTRAINT `_TourPlaceToVisitJejuTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToVisitJejuTag` ADD CONSTRAINT `_TourPlaceToVisitJejuTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `VisitJejuTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
