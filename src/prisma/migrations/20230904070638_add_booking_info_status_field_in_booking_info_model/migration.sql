-- AlterTable
ALTER TABLE `BookingInfo` ADD COLUMN `status` ENUM('RESERVED', 'CUSTOMERCANCEL', 'COMPANYCANCEL', 'NOSHOW', 'VISITED') NOT NULL DEFAULT 'RESERVED';
