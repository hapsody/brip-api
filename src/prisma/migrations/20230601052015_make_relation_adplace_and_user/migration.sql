/*
  Warnings:

  - Added the required column `userId` to the `AdPlace` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `AdPlace` ADD COLUMN `userId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `AdPlace` ADD CONSTRAINT `AdPlace_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
