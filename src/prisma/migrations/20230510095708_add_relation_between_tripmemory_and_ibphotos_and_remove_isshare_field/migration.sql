/*
  Warnings:

  - You are about to drop the column `isShare` on the `ShareTripMemory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `IBPhotos` ADD COLUMN `tripMemoryId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ShareTripMemory` DROP COLUMN `isShare`;

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_tripMemoryId_fkey` FOREIGN KEY (`tripMemoryId`) REFERENCES `TripMemory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
