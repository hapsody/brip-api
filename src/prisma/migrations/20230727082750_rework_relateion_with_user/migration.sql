-- DropForeignKey
ALTER TABLE `AdPlace` DROP FOREIGN KEY `AdPlace_userId_fkey`;

-- DropForeignKey
ALTER TABLE `BookingChatLog` DROP FOREIGN KEY `BookingChatLog_toUserId_fkey`;

-- DropForeignKey
ALTER TABLE `BookingChatLog` DROP FOREIGN KEY `BookingChatLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `BookingInfo` DROP FOREIGN KEY `BookingInfo_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `BookingInfo` DROP FOREIGN KEY `BookingInfo_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `FavoriteTravelType` DROP FOREIGN KEY `FavoriteTravelType_userId_fkey`;

-- DropForeignKey
ALTER TABLE `NotificationMessage` DROP FOREIGN KEY `NotificationMessage_userId_fkey`;

-- DropForeignKey
ALTER TABLE `ShareTripMemory` DROP FOREIGN KEY `ShareTripMemory_userId_fkey`;

-- DropForeignKey
ALTER TABLE `TripMemory` DROP FOREIGN KEY `TripMemory_userId_fkey`;

-- DropForeignKey
ALTER TABLE `UserPasswordHistory` DROP FOREIGN KEY `UserPasswordHistory_userId_fkey`;

-- AlterTable
ALTER TABLE `AdPlace` MODIFY `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `BookingChatLog` MODIFY `userId` INTEGER NULL,
    MODIFY `toUserId` INTEGER NULL;

-- AlterTable
ALTER TABLE `BookingInfo` MODIFY `customerId` INTEGER NULL,
    MODIFY `companyId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ShareTripMemory` MODIFY `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `FavoriteTravelType` ADD CONSTRAINT `FavoriteTravelType_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPasswordHistory` ADD CONSTRAINT `UserPasswordHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlace` ADD CONSTRAINT `AdPlace_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationMessage` ADD CONSTRAINT `NotificationMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingChatLog` ADD CONSTRAINT `BookingChatLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingChatLog` ADD CONSTRAINT `BookingChatLog_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingInfo` ADD CONSTRAINT `BookingInfo_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingInfo` ADD CONSTRAINT `BookingInfo_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
