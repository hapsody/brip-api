/*
  Warnings:

  - You are about to drop the `UserChatActionInputParam` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserChatLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `UserChatActionInputParam` DROP FOREIGN KEY `UserChatActionInputParam_userChatLogId_fkey`;

-- DropForeignKey
ALTER TABLE `UserChatLog` DROP FOREIGN KEY `UserChatLog_adPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `UserChatLog` DROP FOREIGN KEY `UserChatLog_toUserId_fkey`;

-- DropForeignKey
ALTER TABLE `UserChatLog` DROP FOREIGN KEY `UserChatLog_userId_fkey`;

-- DropTable
DROP TABLE `UserChatActionInputParam`;

-- DropTable
DROP TABLE `UserChatLog`;

-- CreateTable
CREATE TABLE `BookingChatLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date` DATETIME(3) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `message` VARCHAR(8000) NOT NULL,
    `bookingActionType` ENUM('ASKBOOKINGWELCOME', 'NEWBOOKINGMSG', 'ANSNEWBOOKINGMSG', 'ASKBOOKINGAVAILABLE', 'ANSBOOKINGAVAILABLE', 'ASKBOOKINGCANCEL', 'ASKBOOKINGCANCELCHK', 'CONFIRMBOOKING', 'ANSCONFIRMBOOKING', 'PRIVACYAGREE', 'FINALBOOKINGCHECK', 'TEXT') NOT NULL,
    `subjectGroupId` INTEGER NULL,
    `customerId` INTEGER NOT NULL,
    `companyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `toUserId` INTEGER NOT NULL,
    `adPlaceId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingChatActionInputParam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bkDate` DATETIME(3) NULL,
    `bkNumOfPeople` INTEGER NULL,
    `bkAnswer` BOOLEAN NULL,
    `bkRejectReason` VARCHAR(191) NULL,
    `customerCancel` BOOLEAN NULL,
    `bkConfirmAnswer` BOOLEAN NULL,
    `bkAgreeAnswer` BOOLEAN NULL,
    `bookingChatLogId` INTEGER NOT NULL,

    UNIQUE INDEX `BookingChatActionInputParam_bookingChatLogId_key`(`bookingChatLogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BookingChatLog` ADD CONSTRAINT `BookingChatLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingChatLog` ADD CONSTRAINT `BookingChatLog_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingChatLog` ADD CONSTRAINT `BookingChatLog_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingChatActionInputParam` ADD CONSTRAINT `BookingChatActionInputParam_bookingChatLogId_fkey` FOREIGN KEY (`bookingChatLogId`) REFERENCES `BookingChatLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
