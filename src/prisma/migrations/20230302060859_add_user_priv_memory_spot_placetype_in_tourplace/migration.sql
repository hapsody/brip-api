-- AlterTable
ALTER TABLE `TourPlace` MODIFY `tourPlaceType` ENUM('BKC_HOTEL', 'GL_RESTAURANT', 'GL_SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT', 'USER_SPOT', 'USER_RESTAURANT', 'USER_PRIV_MEMORY_SPOT') NOT NULL;
