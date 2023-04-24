-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `areaCode` VARCHAR(12) NULL,
    ADD COLUMN `cityCode` INTEGER NULL,
    ADD COLUMN `nationalCode` VARCHAR(10) NULL;

-- CreateTable
CREATE TABLE `IBAreaCode` (
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nationalCode` VARCHAR(16) NOT NULL,
    `areaCode` VARCHAR(16) NOT NULL,
    `name` VARCHAR(32) NOT NULL,

    INDEX `IBAreaCode_name_idx`(`name`),
    PRIMARY KEY (`nationalCode`, `areaCode`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_nationalCode_areaCode_fkey` FOREIGN KEY (`nationalCode`, `areaCode`) REFERENCES `IBAreaCode`(`nationalCode`, `areaCode`) ON DELETE SET NULL ON UPDATE CASCADE;
