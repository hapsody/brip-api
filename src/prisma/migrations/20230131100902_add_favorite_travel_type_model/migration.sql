-- CreateTable
CREATE TABLE `FavoriteTravelType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `season` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `dest` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `trip` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `activity` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `companion` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `FavoriteTravelType_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FavoriteTravelType` ADD CONSTRAINT `FavoriteTravelType_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
