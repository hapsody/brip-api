/*
  Warnings:

  - You are about to drop the column `leaf` on the `IBTravelType` table. All the data in the column will be lost.
  - You are about to drop the column `superId` on the `IBTravelType` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[value]` on the table `IBTravelType` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `IBTravelType` DROP COLUMN `leaf`,
    DROP COLUMN `superId`;

-- CreateTable
CREATE TABLE `RModelBetweenTravelType` (
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `toId` INTEGER NOT NULL,
    `fromId` INTEGER NOT NULL,

    UNIQUE INDEX `RModelBetweenTravelType_fromId_toId_key`(`fromId`, `toId`),
    PRIMARY KEY (`fromId`, `toId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `IBTravelType_value_key` ON `IBTravelType`(`value`);

-- AddForeignKey
ALTER TABLE `RModelBetweenTravelType` ADD CONSTRAINT `RModelBetweenTravelType_fromId_fkey` FOREIGN KEY (`fromId`) REFERENCES `IBTravelType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
