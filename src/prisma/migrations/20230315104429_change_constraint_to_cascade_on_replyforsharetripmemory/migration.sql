-- DropForeignKey
ALTER TABLE `ReplyForShareTripMemory` DROP FOREIGN KEY `ReplyForShareTripMemory_shareTripMemoryId_fkey`;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_shareTripMemoryId_fkey` FOREIGN KEY (`shareTripMemoryId`) REFERENCES `ShareTripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
