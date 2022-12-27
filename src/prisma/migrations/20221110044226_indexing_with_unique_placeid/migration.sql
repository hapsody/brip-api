/*
  Warnings:

  - A unique constraint covering the columns `[place_id]` on the table `GglNearbySearchRes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `GglNearbySearchRes_place_id_key` ON `GglNearbySearchRes`(`place_id`);

-- CreateIndex
CREATE INDEX `GglNearbySearchRes_place_id_idx` ON `GglNearbySearchRes`(`place_id`);
