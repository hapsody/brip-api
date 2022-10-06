-- CreateTable
CREATE TABLE `TripCreator` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nickName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `proposal` TEXT NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `TripCreator_nickName_key`(`nickName`),
    UNIQUE INDEX `TripCreator_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TripCreator` ADD CONSTRAINT `TripCreator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
