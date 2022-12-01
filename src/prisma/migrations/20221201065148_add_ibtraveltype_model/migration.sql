-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `maxDifficulty` INTEGER NULL,
    ADD COLUMN `minDifficulty` INTEGER NULL;

-- CreateTable
CREATE TABLE `IBTravelType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `superId` INTEGER NULL,
    `leaf` BOOLEAN NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `minDifficulty` INTEGER NULL,
    `maxDifficulty` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_IBTravelTypeToTourPlace` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_IBTravelTypeToTourPlace_AB_unique`(`A`, `B`),
    INDEX `_IBTravelTypeToTourPlace_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_IBTravelTypeToTourPlace` ADD CONSTRAINT `_IBTravelTypeToTourPlace_A_fkey` FOREIGN KEY (`A`) REFERENCES `IBTravelType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBTravelTypeToTourPlace` ADD CONSTRAINT `_IBTravelTypeToTourPlace_B_fkey` FOREIGN KEY (`B`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
