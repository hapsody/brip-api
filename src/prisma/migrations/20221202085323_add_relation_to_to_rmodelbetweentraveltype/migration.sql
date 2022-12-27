-- AddForeignKey
ALTER TABLE `RModelBetweenTravelType` ADD CONSTRAINT `RModelBetweenTravelType_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `IBTravelType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
