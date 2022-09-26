-- DropForeignKey
ALTER TABLE `CardNewsContent` DROP FOREIGN KEY `CardNewsContent_cardNewsGroupId_fkey`;

-- AddForeignKey
ALTER TABLE `CardNewsContent` ADD CONSTRAINT `CardNewsContent_cardNewsGroupId_fkey` FOREIGN KEY (`cardNewsGroupId`) REFERENCES `CardNewsGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
