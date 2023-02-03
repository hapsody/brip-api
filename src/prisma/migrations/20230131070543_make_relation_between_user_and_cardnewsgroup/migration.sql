/*
  Warnings:

  - Added the required column `userId` to the `CardNewsGroup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `CardNewsGroup` ADD COLUMN `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `CardNewsGroup` ADD CONSTRAINT `CardNewsGroup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
