/*
  Warnings:

  - You are about to drop the `VisitCourse` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `dataId` to the `VisitSchedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `VisitSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `VisitCourse` DROP FOREIGN KEY `VisitCourse_visitScheduleId_fkey`;

-- AlterTable
ALTER TABLE `VisitSchedule` ADD COLUMN `dataId` INTEGER NOT NULL,
    ADD COLUMN `type` ENUM('HOTEL', 'RESTAURANT', 'SPOT') NOT NULL;

-- DropTable
DROP TABLE `VisitCourse`;
