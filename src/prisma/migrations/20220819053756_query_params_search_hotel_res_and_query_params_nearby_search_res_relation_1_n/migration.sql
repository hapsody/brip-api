/*
  Warnings:

  - You are about to drop the column `gglNearbySearchResId` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `searchHotelResId` on the `QueryParams` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `QueryParams` DROP COLUMN `gglNearbySearchResId`,
    DROP COLUMN `searchHotelResId`;
