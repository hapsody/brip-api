/*
  Warnings:

  - Added the required column `unit_configuration_label` to the `SearchHotelRes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `SearchHotelRes` ADD COLUMN `unit_configuration_label` VARCHAR(191) NOT NULL;
