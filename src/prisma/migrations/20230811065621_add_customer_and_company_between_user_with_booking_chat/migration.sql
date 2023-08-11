-- AlterTable
ALTER TABLE `BookingChatLog` MODIFY `customerId` INTEGER NULL,
    MODIFY `companyId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `BookingChatLog` ADD CONSTRAINT `BookingChatLog_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingChatLog` ADD CONSTRAINT `BookingChatLog_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
