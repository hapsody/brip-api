/*
  Warnings:

  - Added the required column `title` to the `ShareTripMemory` table without a default value. This is not possible if the table is not empty.
  - Made the column `lat` on table `ShareTripMemory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lng` on table `ShareTripMemory` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `title` to the `TripMemory` table without a default value. This is not possible if the table is not empty.
  - Made the column `lat` on table `TripMemory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lng` on table `TripMemory` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ShareTripMemory` ADD COLUMN `title` VARCHAR(191) NOT NULL,
    MODIFY `lat` DOUBLE NOT NULL,
    MODIFY `lng` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `TripMemory` ADD COLUMN `title` VARCHAR(191) NOT NULL,
    MODIFY `lat` DOUBLE NOT NULL,
    MODIFY `lng` DOUBLE NOT NULL;
