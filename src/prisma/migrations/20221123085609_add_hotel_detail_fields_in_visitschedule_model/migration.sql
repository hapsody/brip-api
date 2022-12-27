-- AlterTable
ALTER TABLE `VisitSchedule` ADD COLUMN `checkin` DATETIME(3) NULL,
    ADD COLUMN `checkout` DATETIME(3) NULL,
    ADD COLUMN `stayPeriod` INTEGER NULL,
    ADD COLUMN `transitionNo` INTEGER NULL;
