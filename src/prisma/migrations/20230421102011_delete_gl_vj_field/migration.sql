/*
  Warnings:

  - You are about to drop the column `gl_formatted_address` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_icon` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_icon_background_color` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_icon_mask_base_uri` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_lat` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_lng` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_name` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_opening_hours` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_price_level` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_rating` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_user_ratings_total` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_vicinity` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_viewport_ne_lat` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_viewport_ne_lng` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_viewport_sw_lat` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `gl_viewport_sw_lng` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_address` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_contentscdLabel` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_contentscdRefId` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_contentscdValue` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_introduction` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_latitude` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_longitude` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_phoneno` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_postcode` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_region1cdLabel` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_region1cdRefId` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_region1cdValue` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_region2cdLabel` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_region2cdRefId` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_region2cdValue` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_roadaddress` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the column `vj_title` on the `TourPlace` table. All the data in the column will be lost.
  - You are about to drop the `GglPhotos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisitJejuTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GglNearbySearchResTypeToTourPlace` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_TourPlaceToVisitJejuTag` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `title` on table `TourPlace` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lat` on table `TourPlace` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lng` on table `TourPlace` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rating` on table `TourPlace` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `GglPhotos` DROP FOREIGN KEY `GglPhotos_tourPlaceId_fkey`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResTypeToTourPlace` DROP FOREIGN KEY `_GglNearbySearchResTypeToTourPlace_A_fkey`;

-- DropForeignKey
ALTER TABLE `_GglNearbySearchResTypeToTourPlace` DROP FOREIGN KEY `_GglNearbySearchResTypeToTourPlace_B_fkey`;

-- DropForeignKey
ALTER TABLE `_TourPlaceToVisitJejuTag` DROP FOREIGN KEY `_TourPlaceToVisitJejuTag_A_fkey`;

-- DropForeignKey
ALTER TABLE `_TourPlaceToVisitJejuTag` DROP FOREIGN KEY `_TourPlaceToVisitJejuTag_B_fkey`;

-- AlterTable
ALTER TABLE `TourPlace` DROP COLUMN `gl_formatted_address`,
    DROP COLUMN `gl_icon`,
    DROP COLUMN `gl_icon_background_color`,
    DROP COLUMN `gl_icon_mask_base_uri`,
    DROP COLUMN `gl_lat`,
    DROP COLUMN `gl_lng`,
    DROP COLUMN `gl_name`,
    DROP COLUMN `gl_opening_hours`,
    DROP COLUMN `gl_price_level`,
    DROP COLUMN `gl_rating`,
    DROP COLUMN `gl_user_ratings_total`,
    DROP COLUMN `gl_vicinity`,
    DROP COLUMN `gl_viewport_ne_lat`,
    DROP COLUMN `gl_viewport_ne_lng`,
    DROP COLUMN `gl_viewport_sw_lat`,
    DROP COLUMN `gl_viewport_sw_lng`,
    DROP COLUMN `vj_address`,
    DROP COLUMN `vj_contentscdLabel`,
    DROP COLUMN `vj_contentscdRefId`,
    DROP COLUMN `vj_contentscdValue`,
    DROP COLUMN `vj_introduction`,
    DROP COLUMN `vj_latitude`,
    DROP COLUMN `vj_longitude`,
    DROP COLUMN `vj_phoneno`,
    DROP COLUMN `vj_postcode`,
    DROP COLUMN `vj_region1cdLabel`,
    DROP COLUMN `vj_region1cdRefId`,
    DROP COLUMN `vj_region1cdValue`,
    DROP COLUMN `vj_region2cdLabel`,
    DROP COLUMN `vj_region2cdRefId`,
    DROP COLUMN `vj_region2cdValue`,
    DROP COLUMN `vj_roadaddress`,
    DROP COLUMN `vj_title`,
    ADD COLUMN `gglNearbySearchResTypeId` INTEGER NULL,
    MODIFY `title` VARCHAR(191) NOT NULL,
    MODIFY `lat` DOUBLE NOT NULL,
    MODIFY `lng` DOUBLE NOT NULL,
    MODIFY `rating` DOUBLE NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `GglPhotos`;

-- DropTable
DROP TABLE `VisitJejuTag`;

-- DropTable
DROP TABLE `_GglNearbySearchResTypeToTourPlace`;

-- DropTable
DROP TABLE `_TourPlaceToVisitJejuTag`;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_gglNearbySearchResTypeId_fkey` FOREIGN KEY (`gglNearbySearchResTypeId`) REFERENCES `GglNearbySearchResType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
