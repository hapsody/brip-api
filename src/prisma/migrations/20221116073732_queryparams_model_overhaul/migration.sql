/*
  Warnings:

  - You are about to drop the column `hotelAdultsNumber` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelCategoriesFilterIds` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelCheckinDate` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelCheckoutDate` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelChildrenAges` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelChildrenNumber` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelFilterByCurrency` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelIncludeAdjacency` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelOrderBy` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelRoomNumber` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `hotelUnits` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `keyword` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `radius` on the `QueryParams` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `MetaScheduleInfo` MODIFY `totalHotelSearchCount` INTEGER NULL,
    MODIFY `totalRestaurantSearchCount` INTEGER NULL,
    MODIFY `totalSpotSearchCount` INTEGER NULL,
    MODIFY `spotPerDay` INTEGER NULL,
    MODIFY `mealPerDay` INTEGER NULL,
    MODIFY `mealSchedule` VARCHAR(191) NULL,
    MODIFY `travelNights` INTEGER NULL,
    MODIFY `travelDays` INTEGER NULL,
    MODIFY `hotelTransition` INTEGER NULL,
    MODIFY `transitionTerm` INTEGER NULL,
    MODIFY `recommendedMinHotelCount` INTEGER NULL,
    MODIFY `recommendedMidHotelCount` INTEGER NULL,
    MODIFY `recommendedMaxHotelCount` INTEGER NULL,
    MODIFY `visitSchedulesCount` INTEGER NULL;

-- AlterTable
ALTER TABLE `QueryParams` DROP COLUMN `hotelAdultsNumber`,
    DROP COLUMN `hotelCategoriesFilterIds`,
    DROP COLUMN `hotelCheckinDate`,
    DROP COLUMN `hotelCheckoutDate`,
    DROP COLUMN `hotelChildrenAges`,
    DROP COLUMN `hotelChildrenNumber`,
    DROP COLUMN `hotelFilterByCurrency`,
    DROP COLUMN `hotelIncludeAdjacency`,
    DROP COLUMN `hotelOrderBy`,
    DROP COLUMN `hotelRoomNumber`,
    DROP COLUMN `hotelUnits`,
    DROP COLUMN `keyword`,
    DROP COLUMN `latitude`,
    DROP COLUMN `longitude`,
    DROP COLUMN `radius`,
    ADD COLUMN `adult` INTEGER NULL,
    ADD COLUMN `child` INTEGER NULL,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `infant` INTEGER NULL,
    ADD COLUMN `maxMoney` INTEGER NULL,
    ADD COLUMN `minMoney` INTEGER NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `travelHard` INTEGER NULL;

-- CreateTable
CREATE TABLE `FavorTravelType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL DEFAULT 'noIdea',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavoAccomType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL DEFAULT 'dontCare',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavorAccomLocaType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL DEFAULT 'dontCare',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_FavorTravelTypeToQueryParams` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_FavorTravelTypeToQueryParams_AB_unique`(`A`, `B`),
    INDEX `_FavorTravelTypeToQueryParams_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_FavoAccomTypeToQueryParams` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_FavoAccomTypeToQueryParams_AB_unique`(`A`, `B`),
    INDEX `_FavoAccomTypeToQueryParams_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_FavorAccomLocaTypeToQueryParams` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_FavorAccomLocaTypeToQueryParams_AB_unique`(`A`, `B`),
    INDEX `_FavorAccomLocaTypeToQueryParams_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_FavorTravelTypeToQueryParams` ADD CONSTRAINT `_FavorTravelTypeToQueryParams_A_fkey` FOREIGN KEY (`A`) REFERENCES `FavorTravelType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FavorTravelTypeToQueryParams` ADD CONSTRAINT `_FavorTravelTypeToQueryParams_B_fkey` FOREIGN KEY (`B`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FavoAccomTypeToQueryParams` ADD CONSTRAINT `_FavoAccomTypeToQueryParams_A_fkey` FOREIGN KEY (`A`) REFERENCES `FavoAccomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FavoAccomTypeToQueryParams` ADD CONSTRAINT `_FavoAccomTypeToQueryParams_B_fkey` FOREIGN KEY (`B`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FavorAccomLocaTypeToQueryParams` ADD CONSTRAINT `_FavorAccomLocaTypeToQueryParams_A_fkey` FOREIGN KEY (`A`) REFERENCES `FavorAccomLocaType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_FavorAccomLocaTypeToQueryParams` ADD CONSTRAINT `_FavorAccomLocaTypeToQueryParams_B_fkey` FOREIGN KEY (`B`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
