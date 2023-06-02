/*
  Warnings:

  - You are about to drop the `AdPlaceCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AdPlaceToAdPlaceCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_AdPlaceToAdPlaceCategory` DROP FOREIGN KEY `_AdPlaceToAdPlaceCategory_A_fkey`;

-- DropForeignKey
ALTER TABLE `_AdPlaceToAdPlaceCategory` DROP FOREIGN KEY `_AdPlaceToAdPlaceCategory_B_fkey`;

-- DropTable
DROP TABLE `AdPlaceCategory`;

-- DropTable
DROP TABLE `_AdPlaceToAdPlaceCategory`;

-- CreateTable
CREATE TABLE `_AdPlaceToIBTravelTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_AdPlaceToIBTravelTag_AB_unique`(`A`, `B`),
    INDEX `_AdPlaceToIBTravelTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_AdPlaceToIBTravelTag` ADD CONSTRAINT `_AdPlaceToIBTravelTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `AdPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdPlaceToIBTravelTag` ADD CONSTRAINT `_AdPlaceToIBTravelTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `IBTravelTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
