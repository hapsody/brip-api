/*
  Warnings:

  - You are about to drop the column `userId` on the `QueryParams` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `QueryParams` DROP FOREIGN KEY `QueryParams_userId_fkey`;

-- AlterTable
ALTER TABLE `QueryParams` DROP COLUMN `userId`,
    ADD COLUMN `userTokenId` VARCHAR(191) NULL;
