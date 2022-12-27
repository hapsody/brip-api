/*
  Warnings:

  - You are about to drop the column `queryParamsId` on the `TourPlace` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_queryParamsId_fkey`;

-- AlterTable
ALTER TABLE `TourPlace` DROP COLUMN `queryParamsId`;

-- CreateTable
CREATE TABLE `_QueryParamsToTourPlace` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_QueryParamsToTourPlace_AB_unique`(`A`, `B`),
    INDEX `_QueryParamsToTourPlace_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_QueryParamsToTourPlace` ADD CONSTRAINT `_QueryParamsToTourPlace_A_fkey` FOREIGN KEY (`A`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_QueryParamsToTourPlace` ADD CONSTRAINT `_QueryParamsToTourPlace_B_fkey` FOREIGN KEY (`B`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
