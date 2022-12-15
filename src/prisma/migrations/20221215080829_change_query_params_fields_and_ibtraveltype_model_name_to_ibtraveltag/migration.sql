/*
  Warnings:

  - You are about to drop the `IBTravelType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_IBTravelTypeToTourPlace` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `RModelBetweenTravelType` DROP FOREIGN KEY `RModelBetweenTravelType_fromId_fkey`;

-- DropForeignKey
ALTER TABLE `RModelBetweenTravelType` DROP FOREIGN KEY `RModelBetweenTravelType_toId_fkey`;

-- DropForeignKey
ALTER TABLE `_IBTravelTypeToTourPlace` DROP FOREIGN KEY `_IBTravelTypeToTourPlace_A_fkey`;

-- DropForeignKey
ALTER TABLE `_IBTravelTypeToTourPlace` DROP FOREIGN KEY `_IBTravelTypeToTourPlace_B_fkey`;

-- AlterTable
ALTER TABLE `QueryParams` ADD COLUMN `companion` VARCHAR(191) NULL,
    ADD COLUMN `destination` VARCHAR(191) NULL,
    ADD COLUMN `familyOpt` VARCHAR(191) NULL,
    ADD COLUMN `ingNow` VARCHAR(191) NULL,
    ADD COLUMN `maxFriend` INTEGER NULL,
    ADD COLUMN `minFriend` INTEGER NULL,
    ADD COLUMN `period` INTEGER NULL,
    ADD COLUMN `travelType` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `IBTravelType`;

-- DropTable
DROP TABLE `_IBTravelTypeToTourPlace`;

-- CreateTable
CREATE TABLE `IBTravelTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `minDifficulty` INTEGER NULL,
    `maxDifficulty` INTEGER NULL,
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `IBTravelTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_IBTravelTagToTourPlace` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_IBTravelTagToTourPlace_AB_unique`(`A`, `B`),
    INDEX `_IBTravelTagToTourPlace_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RModelBetweenTravelType` ADD CONSTRAINT `RModelBetweenTravelType_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `IBTravelTag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RModelBetweenTravelType` ADD CONSTRAINT `RModelBetweenTravelType_fromId_fkey` FOREIGN KEY (`fromId`) REFERENCES `IBTravelTag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBTravelTagToTourPlace` ADD CONSTRAINT `_IBTravelTagToTourPlace_A_fkey` FOREIGN KEY (`A`) REFERENCES `IBTravelTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBTravelTagToTourPlace` ADD CONSTRAINT `_IBTravelTagToTourPlace_B_fkey` FOREIGN KEY (`B`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
