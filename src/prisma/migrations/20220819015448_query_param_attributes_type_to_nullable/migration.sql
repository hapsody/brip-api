-- AlterTable
ALTER TABLE `QueryParams` MODIFY `hotelOrderBy` VARCHAR(191) NULL,
    MODIFY `hotelAdultsNumber` INTEGER NULL,
    MODIFY `hotelUnits` VARCHAR(191) NULL,
    MODIFY `hotelRoomNumber` INTEGER NULL,
    MODIFY `hotelCheckinDate` DATETIME(3) NULL,
    MODIFY `hotelCheckoutDate` DATETIME(3) NULL,
    MODIFY `hotelFilterByCurrency` VARCHAR(191) NULL;
