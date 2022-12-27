/*
  Warnings:

  - You are about to drop the column `adult` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `child` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `infant` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `maxMoney` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `minMoney` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `travelHard` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `from` on the `VisitSchedule` table. All the data in the column will be lost.
  - You are about to drop the `FavoAccomType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FavorAccomLocaType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FavorTravelType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FavoAccomTypeToQueryParams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FavorAccomLocaTypeToQueryParams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FavorTravelTypeToQueryParams` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `totalHotelSearchCount` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalRestaurantSearchCount` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalSpotSearchCount` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `spotPerDay` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mealPerDay` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mealSchedule` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `travelNights` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `travelDays` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hotelTransition` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `transitionTerm` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recommendedMinHotelCount` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recommendedMidHotelCount` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `recommendedMaxHotelCount` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `visitSchedulesCount` on table `MetaScheduleInfo` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `latitude` to the `QueryParams` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `QueryParams` table without a default value. This is not possible if the table is not empty.
  - Added the required column `planType` to the `VisitSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_FavoAccomTypeToQueryParams` DROP FOREIGN KEY `_FavoAccomTypeToQueryParams_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FavoAccomTypeToQueryParams` DROP FOREIGN KEY `_FavoAccomTypeToQueryParams_B_fkey`;

-- DropForeignKey
ALTER TABLE `_FavorAccomLocaTypeToQueryParams` DROP FOREIGN KEY `_FavorAccomLocaTypeToQueryParams_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FavorAccomLocaTypeToQueryParams` DROP FOREIGN KEY `_FavorAccomLocaTypeToQueryParams_B_fkey`;

-- DropForeignKey
ALTER TABLE `_FavorTravelTypeToQueryParams` DROP FOREIGN KEY `_FavorTravelTypeToQueryParams_A_fkey`;

-- DropForeignKey
ALTER TABLE `_FavorTravelTypeToQueryParams` DROP FOREIGN KEY `_FavorTravelTypeToQueryParams_B_fkey`;

-- AlterTable
ALTER TABLE `MetaScheduleInfo` MODIFY `totalHotelSearchCount` INTEGER NOT NULL,
    MODIFY `totalRestaurantSearchCount` INTEGER NOT NULL,
    MODIFY `totalSpotSearchCount` INTEGER NOT NULL,
    MODIFY `spotPerDay` INTEGER NOT NULL,
    MODIFY `mealPerDay` INTEGER NOT NULL,
    MODIFY `mealSchedule` VARCHAR(191) NOT NULL,
    MODIFY `travelNights` INTEGER NOT NULL,
    MODIFY `travelDays` INTEGER NOT NULL,
    MODIFY `hotelTransition` INTEGER NOT NULL,
    MODIFY `transitionTerm` INTEGER NOT NULL,
    MODIFY `recommendedMinHotelCount` INTEGER NOT NULL,
    MODIFY `recommendedMidHotelCount` INTEGER NOT NULL,
    MODIFY `recommendedMaxHotelCount` INTEGER NOT NULL,
    MODIFY `visitSchedulesCount` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `QueryParams` DROP COLUMN `adult`,
    DROP COLUMN `child`,
    DROP COLUMN `endDate`,
    DROP COLUMN `infant`,
    DROP COLUMN `maxMoney`,
    DROP COLUMN `minMoney`,
    DROP COLUMN `startDate`,
    DROP COLUMN `travelHard`,
    ADD COLUMN `hotelAdultsNumber` INTEGER NULL,
    ADD COLUMN `hotelCategoriesFilterIds` VARCHAR(191) NULL,
    ADD COLUMN `hotelCheckinDate` DATETIME(3) NULL,
    ADD COLUMN `hotelCheckoutDate` DATETIME(3) NULL,
    ADD COLUMN `hotelChildrenAges` VARCHAR(191) NULL,
    ADD COLUMN `hotelChildrenNumber` INTEGER NULL,
    ADD COLUMN `hotelFilterByCurrency` VARCHAR(191) NULL,
    ADD COLUMN `hotelIncludeAdjacency` BOOLEAN NULL,
    ADD COLUMN `hotelOrderBy` VARCHAR(191) NULL,
    ADD COLUMN `hotelRoomNumber` INTEGER NULL,
    ADD COLUMN `hotelUnits` VARCHAR(191) NULL,
    ADD COLUMN `keyword` VARCHAR(191) NULL,
    ADD COLUMN `latitude` DOUBLE NOT NULL,
    ADD COLUMN `longitude` DOUBLE NOT NULL,
    ADD COLUMN `radius` DOUBLE NULL;

-- AlterTable
ALTER TABLE `VisitSchedule` DROP COLUMN `from`,
    ADD COLUMN `planType` ENUM('MIN', 'MID', 'MAX') NOT NULL;

-- DropTable
DROP TABLE `FavoAccomType`;

-- DropTable
DROP TABLE `FavorAccomLocaType`;

-- DropTable
DROP TABLE `FavorTravelType`;

-- DropTable
DROP TABLE `_FavoAccomTypeToQueryParams`;

-- DropTable
DROP TABLE `_FavorAccomLocaTypeToQueryParams`;

-- DropTable
DROP TABLE `_FavorTravelTypeToQueryParams`;
