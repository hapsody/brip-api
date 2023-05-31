-- AlterTable
ALTER TABLE `IBPhotos` ADD COLUMN `adBusinessPlaceId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` MODIFY `tourPlaceType` ENUM('GL_RESTAURANT', 'GL_SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT', 'USER_SPOT', 'USER_RESTAURANT', 'USER_PRIV_MEMORY_SPOT', 'PUBLICDATAPORTAL_RESTAURANT', 'PUBLICDATAPORTAL_SPOT', 'TOUR4_SPOT', 'TOUR4_RESTAURANT', 'ADBUSINESS_SPOT', 'ADBUSINESS_RESTAURANT') NOT NULL;

-- CreateTable
CREATE TABLE `AdBusinessPlace` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('NEW', 'APPROVED', 'IN_USE', 'STOP', 'REOPEN_WAIT') NOT NULL DEFAULT 'NEW',
    `subscribe` BOOLEAN NOT NULL DEFAULT false,
    `title` VARCHAR(191) NOT NULL,
    `mainImgUrl` VARCHAR(191) NULL,
    `desc` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `roadAddress` VARCHAR(191) NULL,
    `openWeek` TEXT NULL,
    `closedDay` TEXT NULL,
    `contact` VARCHAR(191) NULL,
    `siteUrl` TEXT NULL,
    `businessNumber` VARCHAR(191) NULL,
    `businessRegImgKey` VARCHAR(191) NULL,
    `nationalCode` CHAR(7) NOT NULL DEFAULT '82',
    `tourPlaceId` INTEGER NULL,

    UNIQUE INDEX `AdBusinessPlace_businessNumber_key`(`businessNumber`),
    UNIQUE INDEX `AdBusinessPlace_tourPlaceId_key`(`tourPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdBusinessPlaceCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `primaryCategory` VARCHAR(191) NOT NULL,
    `secondaryCategory` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AdBusinessPlaceCategory_primaryCategory_secondaryCategory_key`(`primaryCategory`, `secondaryCategory`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AdBusinessPlaceToAdBusinessPlaceCategory` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_AdBusinessPlaceToAdBusinessPlaceCategory_AB_unique`(`A`, `B`),
    INDEX `_AdBusinessPlaceToAdBusinessPlaceCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_adBusinessPlaceId_fkey` FOREIGN KEY (`adBusinessPlaceId`) REFERENCES `AdBusinessPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdBusinessPlace` ADD CONSTRAINT `AdBusinessPlace_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdBusinessPlaceToAdBusinessPlaceCategory` ADD CONSTRAINT `_AdBusinessPlaceToAdBusinessPlaceCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `AdBusinessPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdBusinessPlaceToAdBusinessPlaceCategory` ADD CONSTRAINT `_AdBusinessPlaceToAdBusinessPlaceCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `AdBusinessPlaceCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
