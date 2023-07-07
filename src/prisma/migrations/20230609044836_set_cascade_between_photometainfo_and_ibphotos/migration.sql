-- DropForeignKey
ALTER TABLE `IBPhotoMetaInfo` DROP FOREIGN KEY `IBPhotoMetaInfo_photoId_fkey`;

-- AddForeignKey
ALTER TABLE `IBPhotoMetaInfo` ADD CONSTRAINT `IBPhotoMetaInfo_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `IBPhotos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
