-- DropForeignKey
ALTER TABLE `TripMemory` DROP FOREIGN KEY `TripMemory_groupId_fkey`;

-- AlterTable
ALTER TABLE `TripMemory` MODIFY `groupId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `TripMemoryGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
