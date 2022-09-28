-- CreateTable
CREATE TABLE `MetaScheduleInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalHotelSearchCount` INTEGER NOT NULL,
    `totalRestaurantSearchCount` INTEGER NOT NULL,
    `totalSpotSearchCount` INTEGER NOT NULL,
    `spotPerDay` INTEGER NOT NULL,
    `mealPerDay` INTEGER NOT NULL,
    `mealSchedule` VARCHAR(191) NOT NULL,
    `travelNights` INTEGER NOT NULL,
    `travelDays` INTEGER NOT NULL,
    `hotelTransition` INTEGER NOT NULL,
    `transitionTerm` INTEGER NOT NULL,
    `recommendedMinHotelCount` INTEGER NOT NULL,
    `recommendedMidHotelCount` INTEGER NOT NULL,
    `recommendedMaxHotelCount` INTEGER NOT NULL,
    `visitSchedulesCount` INTEGER NOT NULL,
    `queryParamsId` INTEGER NOT NULL,

    UNIQUE INDEX `MetaScheduleInfo_queryParamsId_key`(`queryParamsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dayNo` INTEGER NOT NULL,
    `from` ENUM('MIN', 'MID', 'MAX') NOT NULL,
    `queryParamsId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitCourse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` ENUM('HOTEL', 'RESTAURANT', 'SPOT') NOT NULL,
    `dataId` INTEGER NOT NULL,
    `visitScheduleId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MetaScheduleInfo` ADD CONSTRAINT `MetaScheduleInfo_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitCourse` ADD CONSTRAINT `VisitCourse_visitScheduleId_fkey` FOREIGN KEY (`visitScheduleId`) REFERENCES `VisitSchedule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
