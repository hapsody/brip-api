/*
  Warnings:

  - You are about to drop the column `types` on the `GglNearbySearchRes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `GglNearbySearchRes` DROP COLUMN `types`;

-- CreateTable
CREATE TABLE `GglNearbySearchResType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NULL,

    UNIQUE INDEX `GglNearbySearchResType_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GglNearbySearchResToGglNearbySearchResType` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_GglNearbySearchResToGglNearbySearchResType_AB_unique`(`A`, `B`),
    INDEX `_GglNearbySearchResToGglNearbySearchResType_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResToGglNearbySearchResType` ADD FOREIGN KEY (`A`) REFERENCES `GglNearbySearchRes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResToGglNearbySearchResType` ADD FOREIGN KEY (`B`) REFERENCES `GglNearbySearchResType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
