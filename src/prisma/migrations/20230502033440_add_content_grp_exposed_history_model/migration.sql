-- CreateTable
CREATE TABLE `ContentGrpExposedHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contentGrpId` INTEGER NOT NULL,
    `userTokenId` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,

    INDEX `ContentGrpExposedHistory_userTokenId_idx`(`userTokenId`),
    UNIQUE INDEX `ContentGrpExposedHistory_userTokenId_contentGrpId_key`(`userTokenId`, `contentGrpId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
