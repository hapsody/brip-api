-- DropForeignKey
ALTER TABLE `AdPlaceDailyStat` DROP FOREIGN KEY `AdPlaceDailyStat_adPlaceStatisticsId_fkey`;

-- DropForeignKey
ALTER TABLE `AdPlaceMonthlyStat` DROP FOREIGN KEY `AdPlaceMonthlyStat_adPlaceStatisticsId_fkey`;

-- DropForeignKey
ALTER TABLE `AdPlaceStatistics` DROP FOREIGN KEY `AdPlaceStatistics_adPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `AdPlaceWeeklyStat` DROP FOREIGN KEY `AdPlaceWeeklyStat_adPlaceStatisticsId_fkey`;

-- DropForeignKey
ALTER TABLE `AdPlaceYearlyStat` DROP FOREIGN KEY `AdPlaceYearlyStat_adPlaceStatisticsId_fkey`;

-- AddForeignKey
ALTER TABLE `AdPlaceStatistics` ADD CONSTRAINT `AdPlaceStatistics_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceDailyStat` ADD CONSTRAINT `AdPlaceDailyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceWeeklyStat` ADD CONSTRAINT `AdPlaceWeeklyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceMonthlyStat` ADD CONSTRAINT `AdPlaceMonthlyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlaceYearlyStat` ADD CONSTRAINT `AdPlaceYearlyStat_adPlaceStatisticsId_fkey` FOREIGN KEY (`adPlaceStatisticsId`) REFERENCES `AdPlaceStatistics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
