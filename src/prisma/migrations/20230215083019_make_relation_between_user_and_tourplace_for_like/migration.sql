-- CreateTable
CREATE TABLE `_TourPlaceToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TourPlaceToUser_AB_unique`(`A`, `B`),
    INDEX `_TourPlaceToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_TourPlaceToUser` ADD CONSTRAINT `_TourPlaceToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToUser` ADD CONSTRAINT `_TourPlaceToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
