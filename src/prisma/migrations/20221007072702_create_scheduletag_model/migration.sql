-- CreateTable
CREATE TABLE `ScheduleTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ScheduleTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ScheduleBankToScheduleTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ScheduleBankToScheduleTag_AB_unique`(`A`, `B`),
    INDEX `_ScheduleBankToScheduleTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_ScheduleBankToScheduleTag` ADD CONSTRAINT `_ScheduleBankToScheduleTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `ScheduleBank`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ScheduleBankToScheduleTag` ADD CONSTRAINT `_ScheduleBankToScheduleTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `ScheduleTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
