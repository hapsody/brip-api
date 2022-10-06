-- DropForeignKey
ALTER TABLE `BusinessQuestionTicket` DROP FOREIGN KEY `BusinessQuestionTicket_userId_fkey`;

-- DropForeignKey
ALTER TABLE `QuestionTicket` DROP FOREIGN KEY `QuestionTicket_userId_fkey`;

-- DropForeignKey
ALTER TABLE `TripCreator` DROP FOREIGN KEY `TripCreator_userId_fkey`;

-- AddForeignKey
ALTER TABLE `QuestionTicket` ADD CONSTRAINT `QuestionTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessQuestionTicket` ADD CONSTRAINT `BusinessQuestionTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripCreator` ADD CONSTRAINT `TripCreator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
