/*
  Warnings:

  - You are about to drop the column `html_attributuions` on the `GglPhotos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `GglPhotos` DROP COLUMN `html_attributuions`,
    ADD COLUMN `html_attributions` VARCHAR(191) NULL;
