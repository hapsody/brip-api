-- AlterTable
ALTER TABLE `QueryParams` ADD COLUMN `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `QueryParams` ADD CONSTRAINT `QueryParams_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
