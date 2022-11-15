/*
  Warnings:

  - You are about to drop the column `accommodation_type_name` on the `TourPlace` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TourPlace` DROP COLUMN `accommodation_type_name`,
    ADD COLUMN `bkc_accommodation_type_name` VARCHAR(191) NULL,
    ADD COLUMN `evalScore` INTEGER NOT NULL DEFAULT 0;
