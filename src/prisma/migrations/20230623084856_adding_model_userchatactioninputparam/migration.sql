/*
  Warnings:

  - Added the required column `actionType` to the `UserChatLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `UserChatLog` ADD COLUMN `actionType` ENUM('ASKBOOKINGWELCOME', 'ASKBOOKINGAVAILABLE', 'ANSBOOKINGAVAILABLE', 'CONFIRMBOOKING', 'PRIVACYAGREE', 'FINALBOOKINGCHECK', 'TEXT') NOT NULL,
    ADD COLUMN `subjectGroupId` INTEGER NULL;

-- CreateTable
CREATE TABLE `UserChatActionInputParam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bkDate` DATETIME(3) NULL,
    `bkNumOfPeople` INTEGER NULL,
    `bkAnswer` BOOLEAN NULL,
    `bkRejectReason` VARCHAR(191) NULL,
    `bkConfirmAnswer` BOOLEAN NULL,
    `bkAgreeAnswer` BOOLEAN NULL,
    `userChatLogId` INTEGER NOT NULL,

    UNIQUE INDEX `UserChatActionInputParam_userChatLogId_key`(`userChatLogId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserChatActionInputParam` ADD CONSTRAINT `UserChatActionInputParam_userChatLogId_fkey` FOREIGN KEY (`userChatLogId`) REFERENCES `UserChatLog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
