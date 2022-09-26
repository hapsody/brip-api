-- CreateTable
CREATE TABLE `CardTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CardTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CardNewsGroupToCardTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CardNewsGroupToCardTag_AB_unique`(`A`, `B`),
    INDEX `_CardNewsGroupToCardTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_CardNewsGroupToCardTag` ADD FOREIGN KEY (`A`) REFERENCES `CardNewsGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CardNewsGroupToCardTag` ADD FOREIGN KEY (`B`) REFERENCES `CardTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
