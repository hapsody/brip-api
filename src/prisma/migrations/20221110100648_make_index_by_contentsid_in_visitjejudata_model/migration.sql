/*
  Warnings:

  - A unique constraint covering the columns `[contentsid]` on the table `VisitJejuData` will be added. If there are existing duplicate values, this will fail.
  - Made the column `contentsid` on table `VisitJejuData` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `VisitJejuData` MODIFY `contentsid` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `VisitJejuData_contentsid_key` ON `VisitJejuData`(`contentsid`);

-- CreateIndex
CREATE INDEX `VisitJejuData_contentsid_idx` ON `VisitJejuData`(`contentsid`);
