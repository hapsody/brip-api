-- CreateTable
CREATE TABLE `BookingInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date` DATETIME(3) NOT NULL,
    `numOfPeople` INTEGER NOT NULL,
    `subjectGroupId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BookingInfo` ADD CONSTRAINT `BookingInfo_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingInfo` ADD CONSTRAINT `BookingInfo_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
