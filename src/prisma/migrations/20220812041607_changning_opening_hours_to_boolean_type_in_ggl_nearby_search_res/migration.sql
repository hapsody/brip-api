/*
  Warnings:

  - Made the column `opening_hours` on table `GglNearbySearchRes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `GglNearbySearchRes` MODIFY `opening_hours` BOOLEAN NOT NULL;
