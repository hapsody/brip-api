/*
  Warnings:

  - Added the required column `checkin` to the `ScheduleCluster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkout` to the `ScheduleCluster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numOfVisitSpotInCluster` to the `ScheduleCluster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ratio` to the `ScheduleCluster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stayPeriod` to the `ScheduleCluster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ScheduleCluster` ADD COLUMN `checkin` DATETIME(3) NOT NULL,
    ADD COLUMN `checkout` DATETIME(3) NOT NULL,
    ADD COLUMN `numOfVisitSpotInCluster` INTEGER NOT NULL,
    ADD COLUMN `ratio` DOUBLE NOT NULL,
    ADD COLUMN `stayPeriod` INTEGER NOT NULL;
