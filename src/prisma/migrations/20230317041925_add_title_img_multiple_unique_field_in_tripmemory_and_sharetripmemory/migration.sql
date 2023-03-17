/*
  Warnings:

  - A unique constraint covering the columns `[title,img]` on the table `ShareTripMemory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[title,img]` on the table `TripMemory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `ShareTripMemory_title_img_key` ON `ShareTripMemory`(`title`, `img`);

-- CreateIndex
CREATE UNIQUE INDEX `TripMemory_title_img_key` ON `TripMemory`(`title`, `img`);
