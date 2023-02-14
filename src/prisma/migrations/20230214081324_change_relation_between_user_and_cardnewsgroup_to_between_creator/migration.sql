/*
  Warnings:

  - You are about to drop the column `userId` on the `CardNewsGroup` table. All the data in the column will be lost.
  - Added the required column `creatorId` to the `CardNewsGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `CardNewsGroup` DROP FOREIGN KEY `CardNewsGroup_userId_fkey`;

-- AlterTable
ALTER TABLE `CardNewsGroup` DROP COLUMN `userId`,
    ADD COLUMN `creatorId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `CardNewsGroup` ADD CONSTRAINT `CardNewsGroup_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `TripCreator`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
