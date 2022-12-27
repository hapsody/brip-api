-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_gglgeometryId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_plus_codeId_fkey`;

-- DropForeignKey
ALTER TABLE `GglNearbySearchRes` DROP FOREIGN KEY `GglNearbySearchRes_tourPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `MetaScheduleInfo` DROP FOREIGN KEY `MetaScheduleInfo_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `ScheduleBank` DROP FOREIGN KEY `ScheduleBank_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `SearchHotelRes` DROP FOREIGN KEY `SearchHotelRes_tourPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_batchQueryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_batchSearchKeywordId_fkey`;

-- DropForeignKey
ALTER TABLE `TourPlace` DROP FOREIGN KEY `TourPlace_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitSchedule` DROP FOREIGN KEY `VisitSchedule_queryParamsId_fkey`;

-- DropForeignKey
ALTER TABLE `VisitSchedule` DROP FOREIGN KEY `VisitSchedule_tourPlaceId_fkey`;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_plus_codeId_fkey` FOREIGN KEY (`plus_codeId`) REFERENCES `GglPlusCode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_gglgeometryId_fkey` FOREIGN KEY (`gglgeometryId`) REFERENCES `Gglgeometry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleBank` ADD CONSTRAINT `ScheduleBank_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SearchHotelRes` ADD CONSTRAINT `SearchHotelRes_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaScheduleInfo` ADD CONSTRAINT `MetaScheduleInfo_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
