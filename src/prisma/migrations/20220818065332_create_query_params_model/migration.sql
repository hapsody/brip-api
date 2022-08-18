/*
  Warnings:

  - The primary key for the `GglNearbySearchRes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GglPhotos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GglPlusCode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Gglgeometry` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MockBookingDotComHotelResource` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `SearchHotelRes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `queryParamsId` to the `SearchHotelRes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_gglgeometryId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_plus_codeId_fkey`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` DROP FOREIGN KEY `_GglNearbySearchResToGglPhotos_ibfk_1`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` DROP FOREIGN KEY `_GglNearbySearchResToGglPhotos_ibfk_2`;

-- AlterTable
ALTER TABLE `GglNearbySearchRes` DROP PRIMARY KEY,
    ADD COLUMN `queryParamsId` BIGINT NULL,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `plus_codeId` BIGINT NULL,
    MODIFY `gglgeometryId` BIGINT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `GglPhotos` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `GglPlusCode` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Gglgeometry` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `MockBookingDotComHotelResource` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `SearchHotelRes` DROP PRIMARY KEY,
    ADD COLUMN `queryParamsId` BIGINT NOT NULL,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `User` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `_GglNearbySearchResToGglPhotos` MODIFY `A` BIGINT NOT NULL,
    MODIFY `B` BIGINT NOT NULL;

-- CreateTable
CREATE TABLE `QueryParams` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `keyword` VARCHAR(191) NULL,
    `latitude` VARCHAR(191) NOT NULL,
    `longitude` VARCHAR(191) NOT NULL,
    `radius` DOUBLE NULL,
    `hotelOrderBy` VARCHAR(191) NOT NULL,
    `hotelAdultsNumber` INTEGER NOT NULL,
    `hotelUnits` VARCHAR(191) NOT NULL,
    `hotelRoomNumber` INTEGER NOT NULL,
    `hotelCheckinDate` DATETIME(3) NOT NULL,
    `hotelCheckoutDate` DATETIME(3) NOT NULL,
    `hotelFilterByCurrency` VARCHAR(191) NOT NULL,
    `searchHotelResId` BIGINT NULL,
    `gglNearbySearchResId` BIGINT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_plus_codeId_fkey` FOREIGN KEY (`plus_codeId`) REFERENCES `GglPlusCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_gglgeometryId_fkey` FOREIGN KEY (`gglgeometryId`) REFERENCES `Gglgeometry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchHotelRes` ADD CONSTRAINT `SearchHotelRes_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` ADD FOREIGN KEY (`A`) REFERENCES `GglNearbySearchRes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` ADD FOREIGN KEY (`B`) REFERENCES `GglPhotos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
