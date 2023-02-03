/*
  Warnings:

  - You are about to drop the `_CardNewsGroupToCardTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_CardNewsGroupToCardTag` DROP FOREIGN KEY `_CardNewsGroupToCardTag_ibfk_1`;

-- DropForeignKey
ALTER TABLE `_CardNewsGroupToCardTag` DROP FOREIGN KEY `_CardNewsGroupToCardTag_ibfk_2`;

-- DropTable
DROP TABLE `_CardNewsGroupToCardTag`;

-- CreateTable
CREATE TABLE `_CardNewsContentToCardTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CardNewsContentToCardTag_AB_unique`(`A`, `B`),
    INDEX `_CardNewsContentToCardTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_CardNewsContentToCardTag` ADD CONSTRAINT `_CardNewsContentToCardTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `CardNewsContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CardNewsContentToCardTag` ADD CONSTRAINT `_CardNewsContentToCardTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `CardTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
