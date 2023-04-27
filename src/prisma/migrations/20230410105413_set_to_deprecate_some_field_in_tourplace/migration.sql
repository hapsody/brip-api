/*
  Warnings:

  - You are about to drop the column `evalScore` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `maxDifficulty` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `minDifficulty` on the `TourPlace` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TourPlace` DROP COLUMN `evalScore`,
    DROP COLUMN `maxDifficulty`,
    DROP COLUMN `minDifficulty`;
