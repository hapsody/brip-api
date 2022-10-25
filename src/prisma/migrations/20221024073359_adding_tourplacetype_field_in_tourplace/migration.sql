/*
  Warnings:

  - You are about to drop the column `type` on the `VisitSchedule` table. All the data in the column will be lost.
  - Added the required column `tourPlaceType` to the `TourPlace` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `tourPlaceType` ENUM('HOTEL', 'RESTAURANT', 'SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT') NOT NULL;

-- AlterTable
ALTER TABLE `VisitSchedule` DROP COLUMN `type`;
