/*
  Warnings:

  - You are about to alter the column `rating` on the `GglNearbySearchRes` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.

*/
-- AlterTable
ALTER TABLE `GglNearbySearchRes` MODIFY `rating` DOUBLE NULL;
