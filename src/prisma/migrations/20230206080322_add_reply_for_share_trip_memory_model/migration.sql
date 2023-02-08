-- CreateTable
CREATE TABLE `ReplyForShareTripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `text` TEXT NOT NULL,
    `shareTripMemoryId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `parentReplyId` INTEGER NULL,
    `noPtrForParentId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_shareTripMemoryId_fkey` FOREIGN KEY (`shareTripMemoryId`) REFERENCES `ShareTripMemory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_parentReplyId_fkey` FOREIGN KEY (`parentReplyId`) REFERENCES `ReplyForShareTripMemory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_noPtrForParentId_fkey` FOREIGN KEY (`noPtrForParentId`) REFERENCES `ReplyForShareTripMemory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
