/*
  Warnings:

  - You are about to drop the column `thumbnail` on the `QueryParams` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `QueryParams` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[scheduleHash]` on the table `QueryParams` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `QueryParams` DROP COLUMN `thumbnail`,
    DROP COLUMN `title`;

-- CreateTable
CREATE TABLE `ScheduleBank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(191) NOT NULL,
    `thumbnail` VARCHAR(191) NOT NULL,
    `planType` ENUM('MIN', 'MID', 'MAX') NOT NULL,
    `scheduleHash` VARCHAR(191) NOT NULL,
    `userTokenId` VARCHAR(191) NOT NULL,
    `queryParamsId` INTEGER NOT NULL,

    UNIQUE INDEX `ScheduleBank_scheduleHash_key`(`scheduleHash`),
    UNIQUE INDEX `ScheduleBank_queryParamsId_key`(`queryParamsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `QueryParams_scheduleHash_key` ON `QueryParams`(`scheduleHash`);

-- AddForeignKey
ALTER TABLE `ScheduleBank` ADD CONSTRAINT `ScheduleBank_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
