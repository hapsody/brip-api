/*
  Warnings:

  - Added the required column `orderNo` to the `VisitSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `VisitSchedule` ADD COLUMN `orderNo` INTEGER NOT NULL;
