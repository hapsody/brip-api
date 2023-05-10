-- AlterTable
ALTER TABLE `IBPhotos` ADD COLUMN `shareTripMemoryId` INTEGER NULL;

-- AlterTable
ALTER TABLE `ShareTripMemory` ADD COLUMN `isShare` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `IBPhotoMetaInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` ENUM('MAIN', 'DETAIL', 'SUB') NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `shotTime` DATETIME(3) NULL,
    `eval` VARCHAR(191) NULL,
    `desc` TEXT NULL,
    `publicInfo` VARCHAR(191) NULL,
    `photoId` INTEGER NOT NULL,

    UNIQUE INDEX `IBPhotoMetaInfo_photoId_key`(`photoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IBPhotoTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `IBPhotoTag_name_key`(`name`),
    INDEX `IBPhotoTag_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_IBPhotoMetaInfoToIBPhotoTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_IBPhotoMetaInfoToIBPhotoTag_AB_unique`(`A`, `B`),
    INDEX `_IBPhotoMetaInfoToIBPhotoTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_IBPhotoMetaInfoToTripMemoryCategory` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_IBPhotoMetaInfoToTripMemoryCategory_AB_unique`(`A`, `B`),
    INDEX `_IBPhotoMetaInfoToTripMemoryCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_shareTripMemoryId_fkey` FOREIGN KEY (`shareTripMemoryId`) REFERENCES `ShareTripMemory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IBPhotoMetaInfo` ADD CONSTRAINT `IBPhotoMetaInfo_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `IBPhotos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBPhotoMetaInfoToIBPhotoTag` ADD CONSTRAINT `_IBPhotoMetaInfoToIBPhotoTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `IBPhotoMetaInfo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBPhotoMetaInfoToIBPhotoTag` ADD CONSTRAINT `_IBPhotoMetaInfoToIBPhotoTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `IBPhotoTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBPhotoMetaInfoToTripMemoryCategory` ADD CONSTRAINT `_IBPhotoMetaInfoToTripMemoryCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `IBPhotoMetaInfo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBPhotoMetaInfoToTripMemoryCategory` ADD CONSTRAINT `_IBPhotoMetaInfoToTripMemoryCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `TripMemoryCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
