-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `nationalCode` CHAR(7) NOT NULL DEFAULT '82',
    ADD COLUMN `regionCode1` CHAR(16) NULL,
    ADD COLUMN `regionCode2` CHAR(32) NULL;
