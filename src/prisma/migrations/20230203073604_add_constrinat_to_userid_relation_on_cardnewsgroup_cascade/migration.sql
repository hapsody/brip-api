-- DropForeignKey
ALTER TABLE `CardNewsGroup` DROP FOREIGN KEY `CardNewsGroup_userId_fkey`;

-- DropForeignKey
ALTER TABLE `TripMemoryTag` DROP FOREIGN KEY `TripMemoryTag_userId_fkey`;

-- AddForeignKey
ALTER TABLE `CardNewsGroup` ADD CONSTRAINT `CardNewsGroup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemoryTag` ADD CONSTRAINT `TripMemoryTag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
