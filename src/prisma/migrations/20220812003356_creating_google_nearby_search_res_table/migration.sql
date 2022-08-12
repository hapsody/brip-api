-- CreateTable
CREATE TABLE `GglPhotos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `height` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `html_attributuions` VARCHAR(191) NOT NULL,
    `photo_reference` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GglPlusCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `compund_code` VARCHAR(191) NOT NULL,
    `global_code` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gglgeometry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `location` VARCHAR(191) NOT NULL,
    `viewport` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GglNearbySearchRes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `icon` VARCHAR(191) NULL,
    `icon_background_color` VARCHAR(191) NULL,
    `icon_mask_base_uri` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `opening_hours` ENUM('OPEN_NOW') NULL,
    `place_id` VARCHAR(191) NULL,
    `price_level` INTEGER NULL,
    `rating` INTEGER NULL,
    `reference` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `types` VARCHAR(191) NULL,
    `user_ratings_total` INTEGER NULL,
    `vicinity` VARCHAR(191) NULL,
    `plus_codeId` INTEGER NULL,
    `photosId` INTEGER NULL,
    `gglgeometryId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_photosId_fkey` FOREIGN KEY (`photosId`) REFERENCES `GglPhotos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_plus_codeId_fkey` FOREIGN KEY (`plus_codeId`) REFERENCES `GglPlusCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_gglgeometryId_fkey` FOREIGN KEY (`gglgeometryId`) REFERENCES `Gglgeometry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
