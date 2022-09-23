/*
  Warnings:

  - A unique constraint covering the columns `[userToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `User_userToken_key` ON `User`(`userToken`);
