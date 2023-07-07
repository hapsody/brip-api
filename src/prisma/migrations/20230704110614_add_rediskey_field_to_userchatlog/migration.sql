/*
  Warnings:

  - Added the required column `redisKey` to the `UserChatLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `UserChatLog` ADD COLUMN `redisKey` CHAR(27) NOT NULL;
