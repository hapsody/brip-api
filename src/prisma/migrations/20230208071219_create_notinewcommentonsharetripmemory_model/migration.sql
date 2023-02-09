-- CreateTable
CREATE TABLE `NotiNewCommentOnShareTripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `shareTripMemoryId` INTEGER NOT NULL,
    `userChecked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `NotiNewCommentOnShareTripMemory_userId_shareTripMemoryId_idx`(`userId`, `shareTripMemoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotiNewCommentOnShareTripMemory` ADD CONSTRAINT `NotiNewCommentOnShareTripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotiNewCommentOnShareTripMemory` ADD CONSTRAINT `NotiNewCommentOnShareTripMemory_shareTripMemoryId_fkey` FOREIGN KEY (`shareTripMemoryId`) REFERENCES `ShareTripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
