-- AlterTable
ALTER TABLE `UserChatLog` ADD COLUMN `adPlaceId` INTEGER NULL;

-- CreateTable
CREATE TABLE `NotificationMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `message` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotificationMessage` ADD CONSTRAINT `NotificationMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserChatLog` ADD CONSTRAINT `UserChatLog_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
