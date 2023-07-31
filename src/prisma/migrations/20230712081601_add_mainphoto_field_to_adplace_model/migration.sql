/*
  Warnings:

  - You are about to drop the column `mainImgUrl` on the `AdPlace` table. All the data in the column will be lost.
  - You are about to drop the column `adPlaceId` on the `IBPhotos` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mainPhotoId]` on the table `AdPlace` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mainPhotoId` to the `AdPlace` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `IBPhotos` DROP FOREIGN KEY `IBPhotos_adPlaceId_fkey`;

-- AlterTable
ALTER TABLE `AdPlace` DROP COLUMN `mainImgUrl`,
    ADD COLUMN `mainPhotoId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `IBPhotos` DROP COLUMN `adPlaceId`,
    ADD COLUMN `adPlaceAsSubId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `AdPlace_mainPhotoId_key` ON `AdPlace`(`mainPhotoId`);

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_adPlaceAsSubId_fkey` FOREIGN KEY (`adPlaceAsSubId`) REFERENCES `AdPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdPlace` ADD CONSTRAINT `AdPlace_mainPhotoId_fkey` FOREIGN KEY (`mainPhotoId`) REFERENCES `IBPhotos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
