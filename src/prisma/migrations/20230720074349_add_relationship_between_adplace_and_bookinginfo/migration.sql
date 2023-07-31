/*
  Warnings:

  - Added the required column `adPlaceId` to the `BookingInfo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `BookingInfo` ADD COLUMN `adPlaceId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `BookingInfo` ADD CONSTRAINT `BookingInfo_adPlaceId_fkey` FOREIGN KEY (`adPlaceId`) REFERENCES `AdPlace`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
