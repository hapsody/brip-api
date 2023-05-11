/*
  Warnings:

  - Added the required column `superClusterNo` to the `ValidCluster` table without a default value. This is not possible if the table is not empty.

*/
ALTER TABLE `ValidCluster` ADD COLUMN `superClusterNo` INTEGER NULL;
update ValidCluster set superClusterNo = transitionNo;
-- AlterTable
ALTER TABLE `ValidCluster` modify COLUMN `superClusterNo` INTEGER NOT NULL;
