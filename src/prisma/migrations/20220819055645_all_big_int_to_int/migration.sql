/*
  Warnings:

  - The primary key for the `GglNearbySearchRes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `GglNearbySearchRes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `plus_codeId` on the `GglNearbySearchRes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `gglgeometryId` on the `GglNearbySearchRes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `queryParamsId` on the `GglNearbySearchRes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `GglPhotos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `GglPhotos` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `GglPlusCode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `GglPlusCode` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `Gglgeometry` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Gglgeometry` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `MockBookingDotComHotelResource` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `MockBookingDotComHotelResource` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `QueryParams` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `QueryParams` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `SearchHotelRes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `SearchHotelRes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `queryParamsId` on the `SearchHotelRes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `A` on the `_GglNearbySearchResToGglPhotos` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.
  - You are about to alter the column `B` on the `_GglNearbySearchResToGglPhotos` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_gglgeometryId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_plus_codeId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `SearchHotelRes` DROP FOREIGN KEY `SearchHotelRes_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` DROP FOREIGN KEY `_GglNearbySearchResToGglPhotos_ibfk_1`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` DROP FOREIGN KEY `_GglNearbySearchResToGglPhotos_ibfk_2`;

-- AlterTable
ALTER TABLE `GglNearbySearchRes` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `plus_codeId` INTEGER NULL,
    MODIFY `gglgeometryId` INTEGER NULL,
    MODIFY `queryParamsId` INTEGER NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `GglPhotos` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `GglPlusCode` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Gglgeometry` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `MockBookingDotComHotelResource` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `QueryParams` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `SearchHotelRes` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `queryParamsId` INTEGER NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `User` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `_GglNearbySearchResToGglPhotos` MODIFY `A` INTEGER NOT NULL,
    MODIFY `B` INTEGER NOT NULL;

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
