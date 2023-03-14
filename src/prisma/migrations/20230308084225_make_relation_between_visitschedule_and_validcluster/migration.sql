-- AlterTable
ALTER TABLE `VisitSchedule` ADD COLUMN `validClusterId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_validClusterId_fkey` FOREIGN KEY (`validClusterId`) REFERENCES `ValidCluster`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
