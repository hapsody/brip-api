/*
  Warnings:

  - You are about to drop the column `scheduleHash` on the `ScheduleBank` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `ScheduleBank_scheduleHash_key` ON `ScheduleBank`;

-- AlterTable
ALTER TABLE `ScheduleBank` DROP COLUMN `scheduleHash`;
