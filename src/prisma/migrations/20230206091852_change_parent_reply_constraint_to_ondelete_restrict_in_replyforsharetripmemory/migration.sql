-- DropForeignKey
ALTER TABLE `ReplyForShareTripMemory` DROP FOREIGN KEY `ReplyForShareTripMemory_parentReplyId_fkey`;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_parentReplyId_fkey` FOREIGN KEY (`parentReplyId`) REFERENCES `ReplyForShareTripMemory`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
