-- AlterTable
ALTER TABLE `UserChatLog` MODIFY `actionType` ENUM('ASKBOOKINGWELCOME', 'NEWBOOKINGMSG', 'ANSNEWBOOKINGMSG', 'ASKBOOKINGAVAILABLE', 'ANSBOOKINGAVAILABLE', 'CONFIRMBOOKING', 'PRIVACYAGREE', 'FINALBOOKINGCHECK', 'TEXT') NOT NULL;
