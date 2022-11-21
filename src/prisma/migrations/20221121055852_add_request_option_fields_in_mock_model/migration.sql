-- AlterTable
ALTER TABLE `MockBookingDotComHotelResource` ADD COLUMN `adultsNumber` INTEGER NULL,
    ADD COLUMN `categoriesFilterIds` VARCHAR(191) NULL,
    ADD COLUMN `checkinDate` DATETIME(3) NULL,
    ADD COLUMN `checkoutDate` DATETIME(3) NULL,
    ADD COLUMN `childrenAges` VARCHAR(191) NULL,
    ADD COLUMN `childrenNumber` INTEGER NULL,
    ADD COLUMN `includeAdjacency` BOOLEAN NULL,
    ADD COLUMN `latitude` DOUBLE NULL,
    ADD COLUMN `longitude` DOUBLE NULL,
    ADD COLUMN `orderBy` VARCHAR(191) NULL,
    ADD COLUMN `pageNumber` DOUBLE NULL,
    ADD COLUMN `roomNumber` INTEGER NULL;

