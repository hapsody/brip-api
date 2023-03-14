-- AlterTable
ALTER TABLE `TourPlace` ADD COLUMN `desc` TEXT NULL,
    ADD COLUMN `rating` DOUBLE NULL DEFAULT 0,
    MODIFY `openWeek` TEXT NULL;
