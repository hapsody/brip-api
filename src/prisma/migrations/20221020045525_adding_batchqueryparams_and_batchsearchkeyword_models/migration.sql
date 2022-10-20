-- AlterTable
ALTER TABLE `GglNearbySearchRes` ADD COLUMN `batchQueryParamsId` INTEGER NULL,
    ADD COLUMN `batchSearchKeywordId` INTEGER NULL;

-- CreateTable
CREATE TABLE `BatchQueryParams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `radius` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BatchSearchKeyword` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `keyword` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `BatchSearchKeyword_keyword_key`(`keyword`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BatchQueryParamsToBatchSearchKeyword` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_BatchQueryParamsToBatchSearchKeyword_AB_unique`(`A`, `B`),
    INDEX `_BatchQueryParamsToBatchSearchKeyword_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglNearbySearchRes` ADD CONSTRAINT `GglNearbySearchRes_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BatchQueryParamsToBatchSearchKeyword` ADD CONSTRAINT `_BatchQueryParamsToBatchSearchKeyword_A_fkey` FOREIGN KEY (`A`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BatchQueryParamsToBatchSearchKeyword` ADD CONSTRAINT `_BatchQueryParamsToBatchSearchKeyword_B_fkey` FOREIGN KEY (`B`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
