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
    ADD COLUMN `maxMoney` INTEGER NULL,
    ADD COLUMN `minMoney` INTEGER NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `travelHard` INTEGER NULL;
