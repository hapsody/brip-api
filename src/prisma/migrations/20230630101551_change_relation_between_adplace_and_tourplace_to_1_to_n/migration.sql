/*
  Warnings:

  - You are about to drop the column `tourPlaceId` on the `AdPlace` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `AdPlace` DROP FOREIGN KEY `AdPlace_tourPlaceId_fkey`;

-- AlterTable
ALTER TABLE `AdPlace` DROP COLUMN `tourPlaceId`,
    ADD COLUMN `mainTourPlaceId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `adPlaceId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
