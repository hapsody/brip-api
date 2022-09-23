/*
  Warnings:

  - You are about to drop the column `userToken` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userTokenId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userTokenId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `User_userToken_key` ON `User`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `userToken`,
    ADD COLUMN `userTokenId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_userTokenId_key` ON `User`(`userTokenId`);
