-- CreateTable
CREATE TABLE `VisitJejuTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `VisitJejuTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitJejuData` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contentsid` VARCHAR(191) NOT NULL,
    `contentscdValue` VARCHAR(191) NOT NULL,
    `contentscdLabel` VARCHAR(191) NOT NULL,
    `contentscdRefId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `region1cdValue` VARCHAR(191) NOT NULL,
    `region1cdLabel` VARCHAR(191) NOT NULL,
    `region1cdRefId` VARCHAR(191) NOT NULL,
    `region2cdValue` VARCHAR(191) NOT NULL,
    `region2cdLabel` VARCHAR(191) NOT NULL,
    `region2cdRefId` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `roadaddress` VARCHAR(191) NOT NULL,
    `introduction` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `postcode` VARCHAR(191) NOT NULL,
    `phoneno` VARCHAR(191) NOT NULL,
    `tourPlaceId` INTEGER NOT NULL,

    UNIQUE INDEX `VisitJejuData_tourPlaceId_key`(`tourPlaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_VisitJejuDataToVisitJejuTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_VisitJejuDataToVisitJejuTag_AB_unique`(`A`, `B`),
    INDEX `_VisitJejuDataToVisitJejuTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VisitJejuData` ADD CONSTRAINT `VisitJejuData_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_VisitJejuDataToVisitJejuTag` ADD CONSTRAINT `_VisitJejuDataToVisitJejuTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `VisitJejuData`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_VisitJejuDataToVisitJejuTag` ADD CONSTRAINT `_VisitJejuDataToVisitJejuTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `VisitJejuTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
