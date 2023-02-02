/*
  Warnings:

  - You are about to drop the `_TripMemoryToTripMemoryCategory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,userId]` on the table `TripMemoryTag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `TripMemoryTag` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_TripMemoryToTripMemoryCategory` DROP FOREIGN KEY `_TripMemoryToTripMemoryCategory_A_fkey`;

-- DropForeignKey
ALTER TABLE `_TripMemoryToTripMemoryCategory` DROP FOREIGN KEY `_TripMemoryToTripMemoryCategory_B_fkey`;

-- DropIndex
DROP INDEX `TripMemoryTag_name_key` ON `TripMemoryTag`;

-- AlterTable
ALTER TABLE `TripMemoryTag` ADD COLUMN `userId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `_TripMemoryToTripMemoryCategory`;

-- CreateTable
CREATE TABLE `_ShareTripMemoryToTripMemoryCategory` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ShareTripMemoryToTripMemoryCategory_AB_unique`(`A`, `B`),
    INDEX `_ShareTripMemoryToTripMemoryCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `TripMemoryTag_name_userId_idx` ON `TripMemoryTag`(`name`, `userId`);

-- CreateIndex
CREATE UNIQUE INDEX `TripMemoryTag_name_userId_key` ON `TripMemoryTag`(`name`, `userId`);

-- AddForeignKey
ALTER TABLE `TripMemoryTag` ADD CONSTRAINT `TripMemoryTag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ShareTripMemoryToTripMemoryCategory` ADD CONSTRAINT `_ShareTripMemoryToTripMemoryCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `ShareTripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ShareTripMemoryToTripMemoryCategory` ADD CONSTRAINT `_ShareTripMemoryToTripMemoryCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `TripMemoryCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
