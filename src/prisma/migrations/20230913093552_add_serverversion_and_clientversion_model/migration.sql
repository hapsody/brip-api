-- CreateTable
CREATE TABLE `ServerVersion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `versionName` VARCHAR(191) NOT NULL,
    `isUsing` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `ServerVersion_versionName_key`(`versionName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ClientVersion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `versionName` VARCHAR(191) NOT NULL,
    `pairServerVersionId` INTEGER NULL,

    UNIQUE INDEX `ClientVersion_versionName_key`(`versionName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClientVersion` ADD CONSTRAINT `ClientVersion_pairServerVersionId_fkey` FOREIGN KEY (`pairServerVersionId`) REFERENCES `ServerVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
