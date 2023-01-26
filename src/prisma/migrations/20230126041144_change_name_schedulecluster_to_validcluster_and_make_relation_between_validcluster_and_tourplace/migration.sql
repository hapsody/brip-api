/*
  Warnings:

  - You are about to drop the `ScheduleCluster` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ScheduleCluster` DROP FOREIGN KEY `ScheduleCluster_queryParamsId_fkey`;

-- DropTable
DROP TABLE `ScheduleCluster`;

-- CreateTable
CREATE TABLE `ValidCluster` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `transitionNo` INTEGER NOT NULL,
    `stayPeriod` INTEGER NOT NULL,
    `checkin` DATETIME(3) NOT NULL,
    `checkout` DATETIME(3) NOT NULL,
    `numOfVisitSpotInCluster` INTEGER NOT NULL,
    `ratio` DOUBLE NOT NULL,
    `queryParamsId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TourPlaceToValidCluster` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TourPlaceToValidCluster_AB_unique`(`A`, `B`),
    INDEX `_TourPlaceToValidCluster_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ValidCluster` ADD CONSTRAINT `ValidCluster_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToValidCluster` ADD CONSTRAINT `_TourPlaceToValidCluster_A_fkey` FOREIGN KEY (`A`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToValidCluster` ADD CONSTRAINT `_TourPlaceToValidCluster_B_fkey` FOREIGN KEY (`B`) REFERENCES `ValidCluster`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
