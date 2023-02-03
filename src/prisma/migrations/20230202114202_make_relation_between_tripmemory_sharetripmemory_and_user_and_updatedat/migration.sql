/*
  Warnings:

  - Added the required column `userId` to the `ShareTripMemory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `TripMemory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ShareTripMemory` ADD COLUMN `userId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `TripMemory` ADD COLUMN `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
