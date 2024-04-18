-- AlterTable
ALTER TABLE `UserFCMToken` ADD COLUMN `bookingChatPushAlarm` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `sysNotiPushAlarm` BOOLEAN NOT NULL DEFAULT true;
