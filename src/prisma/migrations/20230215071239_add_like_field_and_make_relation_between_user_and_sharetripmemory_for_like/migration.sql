-- AlterTable
ALTER TABLE `ShareTripMemory` ADD COLUMN `like` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `_likeFrom` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_likeFrom_AB_unique`(`A`, `B`),
    INDEX `_likeFrom_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_likeFrom` ADD CONSTRAINT `_likeFrom_A_fkey` FOREIGN KEY (`A`) REFERENCES `ShareTripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_likeFrom` ADD CONSTRAINT `_likeFrom_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
