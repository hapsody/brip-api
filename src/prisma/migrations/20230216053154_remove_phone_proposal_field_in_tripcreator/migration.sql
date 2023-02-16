/*
  Warnings:

  - You are about to drop the column `phone` on the `TripCreator` table. All the data in the column will be lost.
  - You are about to drop the column `proposal` on the `TripCreator` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TripCreator` DROP COLUMN `phone`,
    DROP COLUMN `proposal`;
