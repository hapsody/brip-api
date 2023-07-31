-- CreateTable
CREATE TABLE `AdPlaceUserLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` ENUM('EXPOSURE', 'VALID_CLICK', 'VALID_CONVERSION') NOT NULL,
    `adPlaceId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPlaceStatistics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adPlaceId` INTEGER NOT NULL,

    UNIQUE INDEX `AdPlaceStatistics_adPlaceId_key`(`adPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPlaceDailyStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `targetYear` INTEGER NOT NULL,
    `targetMonth` INTEGER NOT NULL,
    `targetDay` INTEGER NOT NULL,
    `exposureCnt` INTEGER NOT NULL DEFAULT 0,
    `validClickCnt` INTEGER NOT NULL DEFAULT 0,
    `validConversionCnt` INTEGER NOT NULL DEFAULT 0,
    `adPlaceStatisticsId` INTEGER NOT NULL,

    INDEX `AdPlaceDailyStat_targetYear_targetMonth_targetDay_idx`(`targetYear`, `targetMonth`, `targetDay`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPlaceWeeklyStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `targetYear` INTEGER NOT NULL,
    `targetWeek` INTEGER NOT NULL,
    `exposureCnt` INTEGER NOT NULL DEFAULT 0,
    `validClickCnt` INTEGER NOT NULL DEFAULT 0,
    `validConversionCnt` INTEGER NOT NULL DEFAULT 0,
    `adPlaceStatisticsId` INTEGER NOT NULL,

    INDEX `AdPlaceWeeklyStat_targetYear_targetWeek_idx`(`targetYear`, `targetWeek`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPlaceMonthlyStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `targetYear` INTEGER NOT NULL,
    `targetMonth` INTEGER NOT NULL,
    `exposureCnt` INTEGER NOT NULL DEFAULT 0,
    `validClickCnt` INTEGER NOT NULL DEFAULT 0,
    `validConversionCnt` INTEGER NOT NULL DEFAULT 0,
    `adPlaceStatisticsId` INTEGER NOT NULL,

    INDEX `AdPlaceMonthlyStat_targetYear_targetMonth_idx`(`targetYear`, `targetMonth`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdPlaceYearlyStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `targetYear` INTEGER NOT NULL,
    `exposureCnt` INTEGER NOT NULL DEFAULT 0,
    `validClickCnt` INTEGER NOT NULL DEFAULT 0,
    `validConversionCnt` INTEGER NOT NULL DEFAULT 0,
    `adPlaceStatisticsId` INTEGER NOT NULL,

    INDEX `AdPlaceYearlyStat_targetYear_idx`(`targetYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdPlaceStatistics` ADD CONSTRAINT `AdPlaceStatistics_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceDailyStat` ADD CONSTRAINT `AdPlaceDailyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceWeeklyStat` ADD CONSTRAINT `AdPlaceWeeklyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceMonthlyStat` ADD CONSTRAINT `AdPlaceMonthlyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceYearlyStat` ADD CONSTRAINT `AdPlaceYearlyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
