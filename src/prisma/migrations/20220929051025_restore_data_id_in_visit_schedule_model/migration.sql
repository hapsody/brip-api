/*
  Warnings:

  - Added the required column `dataId` to the `VisitSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `VisitSchedule` ADD COLUMN `dataId` INTEGER NOT NULL;
