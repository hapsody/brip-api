/*
  Warnings:

  - Made the column `value` on table `GglNearbySearchResType` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `GglNearbySearchResType` MODIFY `value` VARCHAR(191) NOT NULL;
