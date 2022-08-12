/*
  Warnings:

  - You are about to drop the column `photosId` on the `GglNearbySearchRes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_photosId_fkey`;

-- AlterTable
ALTER TABLE `GglNearbySearchRes` DROP COLUMN `photosId`;

-- CreateTable
CREATE TABLE `_GglNearbySearchResToGglPhotos` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_GglNearbySearchResToGglPhotos_AB_unique`(`A`, `B`),
    INDEX `_GglNearbySearchResToGglPhotos_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` ADD FOREIGN KEY (`A`) REFERENCES `GglNearbySearchRes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResToGglPhotos` ADD FOREIGN KEY (`B`) REFERENCES `GglPhotos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
