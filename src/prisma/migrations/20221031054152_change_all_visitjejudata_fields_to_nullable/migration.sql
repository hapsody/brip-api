/*
  Warnings:

  - You are about to drop the column `html_attributions` on the `GglPhotos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `GglPhotos` DROP COLUMN `html_attributions`,
    ADD COLUMN `html_attributuions` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `VisitJejuData` MODIFY `contentsid` VARCHAR(191) NULL,
    MODIFY `contentscdValue` VARCHAR(191) NULL,
    MODIFY `contentscdLabel` VARCHAR(191) NULL,
    MODIFY `contentscdRefId` VARCHAR(191) NULL,
    MODIFY `title` VARCHAR(191) NULL,
    MODIFY `region1cdValue` VARCHAR(191) NULL,
    MODIFY `region1cdLabel` VARCHAR(191) NULL,
    MODIFY `region1cdRefId` VARCHAR(191) NULL,
    MODIFY `region2cdValue` VARCHAR(191) NULL,
    MODIFY `region2cdLabel` VARCHAR(191) NULL,
    MODIFY `region2cdRefId` VARCHAR(191) NULL,
    MODIFY `address` VARCHAR(191) NULL,
    MODIFY `roadaddress` VARCHAR(191) NULL,
    MODIFY `introduction` VARCHAR(191) NULL,
    MODIFY `latitude` DOUBLE NULL,
    MODIFY `longitude` DOUBLE NULL,
    MODIFY `postcode` VARCHAR(191) NULL,
    MODIFY `phoneno` VARCHAR(191) NULL;
