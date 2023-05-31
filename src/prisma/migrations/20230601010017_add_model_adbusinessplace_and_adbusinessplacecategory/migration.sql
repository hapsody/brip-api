-- AlterTable
ALTER TABLE `IBPhotos` ADD COLUMN `adPlaceId` INTEGER NULL;

-- AlterTable
ALTER TABLE `TourPlace` MODIFY `tourPlaceType` ENUM('GL_RESTAURANT', 'GL_SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT', 'USER_SPOT', 'USER_RESTAURANT', 'USER_PRIV_MEMORY_SPOT', 'PUBLICDATAPORTAL_RESTAURANT', 'PUBLICDATAPORTAL_SPOT', 'TOUR4_SPOT', 'TOUR4_RESTAURANT', 'ADPLACE_SPOT', 'ADPLACE_RESTAURANT') NOT NULL;

-- CreateTable
CREATE TABLE `AdPlace` (
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

    UNIQUE INDEX `AdPlace_businessNumber_key`(`businessNumber`),
    UNIQUE INDEX `AdPlace_tourPlaceId_key`(`tourPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPlaceCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `primary` VARCHAR(191) NOT NULL,
    `secondary` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AdPlaceCategory_primary_secondary_key`(`primary`, `secondary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AdPlaceToAdPlaceCategory` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_AdPlaceToAdPlaceCategory_AB_unique`(`A`, `B`),
    INDEX `_AdPlaceToAdPlaceCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlace` ADD CONSTRAINT `AdPlace_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdPlaceToAdPlaceCategory` ADD CONSTRAINT `_AdPlaceToAdPlaceCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `AdPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdPlaceToAdPlaceCategory` ADD CONSTRAINT `_AdPlaceToAdPlaceCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `AdPlaceCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
