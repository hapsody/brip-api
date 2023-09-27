/*
  Warnings:

  - You are about to alter the column `appAppleId` on the `AppleHookLogData` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.

*/
-- AlterTable
ALTER TABLE `AppleHookLogData` MODIFY `appAppleId` INTEGER NOT NULL,
    MODIFY `bundleVersion` VARCHAR(191) NOT NULL;
