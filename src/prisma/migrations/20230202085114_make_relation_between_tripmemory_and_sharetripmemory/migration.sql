/*
  Warnings:

  - A unique constraint covering the columns `[tripMemoryId]` on the table `ShareTripMemory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `img` to the `ShareTripMemory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tripMemoryId` to the `ShareTripMemory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `img` to the `TripMemory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ShareTripMemory` ADD COLUMN `img` VARCHAR(191) NOT NULL,
    ADD COLUMN `tripMemoryId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `bad` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `good` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `like` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `notBad` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `TripMemory` ADD COLUMN `img` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ShareTripMemory_tripMemoryId_key` ON `ShareTripMemory`(`tripMemoryId`);

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_tripMemoryId_fkey` FOREIGN KEY (`tripMemoryId`) REFERENCES `TripMemory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
