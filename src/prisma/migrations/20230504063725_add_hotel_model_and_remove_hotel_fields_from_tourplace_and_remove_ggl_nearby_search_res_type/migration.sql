/*
  Warnings:

  - You are about to drop the column `bkc_accommodation_type_name` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_address` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_checkin` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_checkout` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_city` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_city_name_en` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_countrycode` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_currency_code` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_default_language` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_distance` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_gross_amount` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_gross_amount_per_night` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_hotelClass` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_hotel_facilities` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_hotel_id` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_hotel_name` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_included_taxes_and_charges_amount` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_latitude` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_longitude` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_main_photo_url` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_max_photo_url` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_min_total_price` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_net_amount` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_review_score` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_review_score_word` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_timezone` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_unit_configuration_label` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_urgency_message` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_url` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `bkc_zip` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gglNearbySearchResTypeId` on the `TourPlace` table. All the data in the column will be lost.
  - The values [BKC_HOTEL] on the enum `TourPlace_tourPlaceType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `GglNearbySearchResType` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_gglNearbySearchResTypeId_fkey`;

-- AlterTable
ALTER TABLE `IBPhotos` ADD COLUMN `hotelId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` DROP COLUMN `bkc_accommodation_type_name`,
    DROP COLUMN `bkc_address`,
    DROP COLUMN `bkc_checkin`,
    DROP COLUMN `bkc_checkout`,
    DROP COLUMN `bkc_city`,
    DROP COLUMN `bkc_city_name_en`,
    DROP COLUMN `bkc_countrycode`,
    DROP COLUMN `bkc_currency_code`,
    DROP COLUMN `bkc_default_language`,
    DROP COLUMN `bkc_distance`,
    DROP COLUMN `bkc_gross_amount`,
    DROP COLUMN `bkc_gross_amount_per_night`,
    DROP COLUMN `bkc_hotelClass`,
    DROP COLUMN `bkc_hotel_facilities`,
    DROP COLUMN `bkc_hotel_id`,
    DROP COLUMN `bkc_hotel_name`,
    DROP COLUMN `bkc_included_taxes_and_charges_amount`,
    DROP COLUMN `bkc_latitude`,
    DROP COLUMN `bkc_longitude`,
    DROP COLUMN `bkc_main_photo_url`,
    DROP COLUMN `bkc_max_photo_url`,
    DROP COLUMN `bkc_min_total_price`,
    DROP COLUMN `bkc_net_amount`,
    DROP COLUMN `bkc_review_score`,
    DROP COLUMN `bkc_review_score_word`,
    DROP COLUMN `bkc_timezone`,
    DROP COLUMN `bkc_unit_configuration_label`,
    DROP COLUMN `bkc_urgency_message`,
    DROP COLUMN `bkc_url`,
    DROP COLUMN `bkc_zip`,
    DROP COLUMN `gglNearbySearchResTypeId`,
    MODIFY `tourPlaceType` ENUM('GL_RESTAURANT', 'GL_SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT', 'USER_SPOT', 'USER_RESTAURANT', 'USER_PRIV_MEMORY_SPOT', 'PUBLICDATAPORTAL_RESTAURANT', 'PUBLICDATAPORTAL_SPOT', 'TOUR4_SPOT', 'TOUR4_RESTAURANT') NOT NULL;

-- AlterTable
ALTER TABLE `VisitSchedule` ADD COLUMN `hotelId` INTEGER NULL;

-- DropTable
DROP TABLE `GglNearbySearchResType`;

-- CreateTable
CREATE TABLE `Hotel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hotelType` ENUM('BOOKINGDOTCOM') NOT NULL,
    `status` ENUM('NEW', 'USER_CREATE_NEW', 'APPROVED', 'IN_USE', 'ARCHIVED', 'DUPLICATED') NOT NULL DEFAULT 'NEW',
    `bkc_unit_configuration_label` VARCHAR(191) NULL,
    `bkc_min_total_price` DOUBLE NULL,
    `bkc_gross_amount_per_night` DOUBLE NULL,
    `bkc_gross_amount` DOUBLE NULL,
    `bkc_included_taxes_and_charges_amount` DOUBLE NULL,
    `bkc_net_amount` DOUBLE NULL,
    `bkc_hotelClass` INTEGER NULL,
    `bkc_countrycode` VARCHAR(191) NULL,
    `bkc_default_language` VARCHAR(191) NULL,
    `bkc_address` VARCHAR(191) NULL,
    `bkc_city` VARCHAR(191) NULL,
    `bkc_city_name_en` VARCHAR(191) NULL,
    `bkc_checkin` VARCHAR(191) NULL,
    `bkc_checkout` VARCHAR(191) NULL,
    `bkc_distance` DOUBLE NULL,
    `bkc_review_score_word` VARCHAR(191) NULL,
    `bkc_review_score` DOUBLE NULL,
    `bkc_currency_code` VARCHAR(191) NULL,
    `bkc_timezone` VARCHAR(191) NULL,
    `bkc_urgency_message` VARCHAR(191) NULL,
    `bkc_hotel_id` INTEGER NULL,
    `bkc_hotel_name` VARCHAR(191) NULL,
    `bkc_latitude` DOUBLE NULL,
    `bkc_longitude` DOUBLE NULL,
    `bkc_url` VARCHAR(191) NULL,
    `bkc_accommodation_type_name` VARCHAR(191) NULL,
    `bkc_zip` VARCHAR(191) NULL,
    `bkc_main_photo_url` VARCHAR(191) NULL,
    `bkc_max_photo_url` VARCHAR(191) NULL,
    `bkc_hotel_facilities` TEXT NULL,
    `title` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `address` TEXT NULL,
    `roadAddress` TEXT NULL,
    `contact` VARCHAR(191) NULL,
    `postcode` VARCHAR(191) NULL,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `desc` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_HotelToQueryParams` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_HotelToQueryParams_AB_unique`(`A`, `B`),
    INDEX `_HotelToQueryParams_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HotelToQueryParams` ADD CONSTRAINT `_HotelToQueryParams_A_fkey` FOREIGN KEY (`A`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HotelToQueryParams` ADD CONSTRAINT `_HotelToQueryParams_B_fkey` FOREIGN KEY (`B`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
