/*
  Warnings:

  - You are about to drop the column `reference` on the `GglNearbySearchRes` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `GglNearbySearchRes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `GglNearbySearchRes` DROP COLUMN `reference`,
    DROP COLUMN `scope`;
