-- CreateTable
CREATE TABLE `TripMemoryGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `TripMemoryGroup_name_userId_key`(`name`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `comment` TEXT NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `address` TEXT NULL,
    `groupId` INTEGER NOT NULL,
    `tourPlaceId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShareTripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `address` TEXT NULL,
    `tourPlaceId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMemoryTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TripMemoryTag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMemoryCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `super` VARCHAR(191) NOT NULL DEFAULT 'etc',
    `name` VARCHAR(191) NOT NULL,

    INDEX `TripMemoryCategory_super_name_idx`(`super`, `name`),
    UNIQUE INDEX `TripMemoryCategory_super_name_key`(`super`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TripMemoryToTripMemoryTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TripMemoryToTripMemoryTag_AB_unique`(`A`, `B`),
    INDEX `_TripMemoryToTripMemoryTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TripMemoryToTripMemoryCategory` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TripMemoryToTripMemoryCategory_AB_unique`(`A`, `B`),
    INDEX `_TripMemoryToTripMemoryCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TripMemoryGroup` ADD CONSTRAINT `TripMemoryGroup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `TripMemoryGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TripMemoryToTripMemoryTag` ADD CONSTRAINT `_TripMemoryToTripMemoryTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `TripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TripMemoryToTripMemoryTag` ADD CONSTRAINT `_TripMemoryToTripMemoryTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `TripMemoryTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TripMemoryToTripMemoryCategory` ADD CONSTRAINT `_TripMemoryToTripMemoryCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `TripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TripMemoryToTripMemoryCategory` ADD CONSTRAINT `_TripMemoryToTripMemoryCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `TripMemoryCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
