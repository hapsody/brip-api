-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `nickName` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL,
    `userTokenId` VARCHAR(191) NOT NULL,
    `profileImg` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_userTokenId_key`(`userTokenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavoriteTravelType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `season` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `dest` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `trip` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `activity` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `companion` VARCHAR(191) NOT NULL DEFAULT 'dontcare',
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `FavoriteTravelType_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GglPhotos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `height` INTEGER NULL,
    `width` INTEGER NULL,
    `html_attributions` VARCHAR(191) NULL,
    `photo_reference` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `tourPlaceId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GglNearbySearchResType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `GglNearbySearchResType_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IBPhotos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `key` VARCHAR(191) NULL,
    `url` TEXT NULL,
    `tourPlaceId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TourPlace` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tourPlaceType` ENUM('BKC_HOTEL', 'GL_RESTAURANT', 'GL_SPOT', 'VISITJEJU_RESTAURANT', 'VISITJEJU_SPOT', 'USER_SPOT', 'USER_RESTAURANT') NOT NULL,
    `status` ENUM('NEW', 'USER_CREATE_NEW', 'APPROVED', 'IN_USE', 'ARCHIVED') NOT NULL DEFAULT 'NEW',
    `evalScore` INTEGER NOT NULL DEFAULT 0,
    `minDifficulty` INTEGER NULL,
    `maxDifficulty` INTEGER NULL,
    `bkc_unit_configuration_label` VARCHAR(191) NULL,
    `bkc_min_total_price` DOUBLE NULL,
    `bkc_gross_amount_per_night` DOUBLE NULL,
    `bkc_gross_amount` DOUBLE NULL,
    `bkc_included_taxes_and_charges_amount` DOUBLE NULL,
    `bkc_net_amount` DOUBLE NULL,
    `bkc_hotelClass` INTEGER NULL,
    `bkc_countrycode` VARCHAR(191) NULL,
    `bkc_default_language` VARCHAR(191) NULL,
    `bkc_address` VARCHAR(191) NULL,
    `bkc_city` VARCHAR(191) NULL,
    `bkc_city_name_en` VARCHAR(191) NULL,
    `bkc_checkin` VARCHAR(191) NULL,
    `bkc_checkout` VARCHAR(191) NULL,
    `bkc_distance` DOUBLE NULL,
    `bkc_review_score_word` VARCHAR(191) NULL,
    `bkc_review_score` DOUBLE NULL,
    `bkc_currency_code` VARCHAR(191) NULL,
    `bkc_timezone` VARCHAR(191) NULL,
    `bkc_urgency_message` VARCHAR(191) NULL,
    `bkc_hotel_id` INTEGER NULL,
    `bkc_hotel_name` VARCHAR(191) NULL,
    `bkc_latitude` DOUBLE NULL,
    `bkc_longitude` DOUBLE NULL,
    `bkc_url` VARCHAR(191) NULL,
    `bkc_accommodation_type_name` VARCHAR(191) NULL,
    `bkc_zip` VARCHAR(191) NULL,
    `bkc_main_photo_url` VARCHAR(191) NULL,
    `bkc_max_photo_url` VARCHAR(191) NULL,
    `bkc_hotel_facilities` TEXT NULL,
    `gl_lat` DOUBLE NULL,
    `gl_lng` DOUBLE NULL,
    `gl_viewport_ne_lat` DOUBLE NULL,
    `gl_viewport_ne_lng` DOUBLE NULL,
    `gl_viewport_sw_lat` DOUBLE NULL,
    `gl_viewport_sw_lng` DOUBLE NULL,
    `gl_icon` VARCHAR(191) NULL,
    `gl_icon_background_color` VARCHAR(191) NULL,
    `gl_icon_mask_base_uri` VARCHAR(191) NULL,
    `gl_name` VARCHAR(191) NULL,
    `gl_opening_hours` BOOLEAN NULL,
    `gl_place_id` VARCHAR(191) NULL,
    `gl_price_level` INTEGER NULL,
    `gl_rating` DOUBLE NULL,
    `gl_user_ratings_total` INTEGER NULL,
    `gl_vicinity` VARCHAR(191) NULL,
    `gl_formatted_address` VARCHAR(191) NULL,
    `vj_contentsid` VARCHAR(191) NULL,
    `vj_contentscdValue` VARCHAR(191) NULL,
    `vj_contentscdLabel` VARCHAR(191) NULL,
    `vj_contentscdRefId` VARCHAR(191) NULL,
    `vj_title` VARCHAR(191) NULL,
    `vj_region1cdValue` VARCHAR(191) NULL,
    `vj_region1cdLabel` VARCHAR(191) NULL,
    `vj_region1cdRefId` VARCHAR(191) NULL,
    `vj_region2cdValue` VARCHAR(191) NULL,
    `vj_region2cdLabel` VARCHAR(191) NULL,
    `vj_region2cdRefId` VARCHAR(191) NULL,
    `vj_address` VARCHAR(191) NULL,
    `vj_roadaddress` VARCHAR(191) NULL,
    `vj_introduction` TEXT NULL,
    `vj_latitude` DOUBLE NULL,
    `vj_longitude` DOUBLE NULL,
    `vj_postcode` VARCHAR(191) NULL,
    `vj_phoneno` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `address` TEXT NULL,
    `roadAddress` TEXT NULL,
    `openWeek` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `postcode` VARCHAR(191) NULL,
    `batchQueryParamsId` INTEGER NULL,
    `batchSearchKeywordId` INTEGER NULL,
    `good` INTEGER NOT NULL DEFAULT 0,
    `notBad` INTEGER NOT NULL DEFAULT 0,
    `bad` INTEGER NOT NULL DEFAULT 0,
    `like` INTEGER NOT NULL DEFAULT 0,

    INDEX `TourPlace_gl_place_id_vj_contentsid_idx`(`gl_place_id`, `vj_contentsid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BatchQueryParams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `radius` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BatchSearchKeyword` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `keyword` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `BatchSearchKeyword_keyword_key`(`keyword`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QueryParams` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `minMoney` INTEGER NULL,
    `maxMoney` INTEGER NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `adult` INTEGER NULL,
    `child` INTEGER NULL,
    `infant` INTEGER NULL,
    `roomNumber` INTEGER NULL,
    `ingNow` VARCHAR(191) NULL,
    `companion` VARCHAR(191) NULL,
    `familyOpt` VARCHAR(191) NULL,
    `minFriend` INTEGER NULL,
    `maxFriend` INTEGER NULL,
    `period` INTEGER NULL,
    `travelType` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NULL,
    `travelHard` INTEGER NULL,
    `userTokenId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleBank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(191) NOT NULL,
    `thumbnail` VARCHAR(191) NOT NULL,
    `planType` ENUM('MIN', 'MID', 'MAX') NOT NULL,
    `userTokenId` VARCHAR(191) NOT NULL,
    `queryParamsId` INTEGER NOT NULL,

    UNIQUE INDEX `ScheduleBank_queryParamsId_key`(`queryParamsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MockBookingDotComHotelResource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reqType` ENUM('SEARCH_HOTELS_BY_COORDINATES', 'SEARCH_LOCATIONS', 'FILTERS_FOR_SEARCH', 'SEARCH_HOTELS') NOT NULL DEFAULT 'SEARCH_HOTELS_BY_COORDINATES',
    `orderBy` VARCHAR(191) NULL,
    `adultsNumber` INTEGER NULL,
    `childrenNumber` INTEGER NULL,
    `childrenAges` VARCHAR(191) NULL,
    `roomNumber` INTEGER NULL,
    `checkinDate` DATETIME(3) NULL,
    `checkoutDate` DATETIME(3) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `pageNumber` DOUBLE NULL,
    `includeAdjacency` BOOLEAN NULL,
    `categoriesFilterIds` VARCHAR(191) NULL,
    `responseData` LONGTEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NonMembersCount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardNewsContent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `no` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `bgPicUri` TEXT NOT NULL,
    `cardNewsGroupId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardNewsGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(191) NOT NULL,
    `thumbnailUri` TEXT NOT NULL,
    `no` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CardTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CardTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ScheduleTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetaScheduleInfo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `totalHotelSearchCount` INTEGER NULL,
    `totalRestaurantSearchCount` INTEGER NULL,
    `totalSpotSearchCount` INTEGER NULL,
    `spotPerDay` DOUBLE NULL,
    `mealPerDay` DOUBLE NULL,
    `mealSchedule` VARCHAR(191) NULL,
    `travelNights` INTEGER NULL,
    `travelDays` INTEGER NULL,
    `hotelTransition` INTEGER NULL,
    `transitionTerm` VARCHAR(191) NULL,
    `recommendedMinHotelCount` INTEGER NULL,
    `recommendedMidHotelCount` INTEGER NULL,
    `recommendedMaxHotelCount` INTEGER NULL,
    `estimatedCost` DOUBLE NULL,
    `queryParamsId` INTEGER NOT NULL,

    UNIQUE INDEX `MetaScheduleInfo_queryParamsId_key`(`queryParamsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dayNo` INTEGER NOT NULL,
    `orderNo` INTEGER NOT NULL,
    `placeType` VARCHAR(191) NULL,
    `transitionNo` INTEGER NULL,
    `stayPeriod` INTEGER NULL,
    `checkin` DATETIME(3) NULL,
    `checkout` DATETIME(3) NULL,
    `tourPlaceId` INTEGER NULL,
    `queryParamsId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QuestionTicket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `content` LONGTEXT NOT NULL,
    `noti` BOOLEAN NOT NULL DEFAULT false,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BusinessQuestionTicket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `noti` BOOLEAN NOT NULL DEFAULT false,
    `companyName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FaqList` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `question` VARCHAR(191) NOT NULL,
    `answer` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripCreator` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('APPLIED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPLIED',
    `noti` BOOLEAN NOT NULL DEFAULT false,
    `nickName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `area` VARCHAR(191) NOT NULL,
    `proposal` TEXT NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `TripCreator_nickName_key`(`nickName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitJejuTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `VisitJejuTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IBTravelTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `minDifficulty` INTEGER NULL,
    `maxDifficulty` INTEGER NULL,
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `IBTravelTag_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RModelBetweenTravelType` (
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `toId` INTEGER NOT NULL,
    `fromId` INTEGER NOT NULL,

    UNIQUE INDEX `RModelBetweenTravelType_fromId_toId_key`(`fromId`, `toId`),
    PRIMARY KEY (`fromId`, `toId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ValidCluster` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `transitionNo` INTEGER NOT NULL,
    `stayPeriod` INTEGER NOT NULL,
    `checkin` DATETIME(3) NOT NULL,
    `checkout` DATETIME(3) NOT NULL,
    `numOfVisitSpotInCluster` INTEGER NOT NULL,
    `ratio` DOUBLE NOT NULL,
    `queryParamsId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SMSAuthCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `code` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `userTokenId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserPasswordHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `password` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMemoryGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `TripMemoryGroup_name_userId_key`(`name`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(191) NOT NULL,
    `comment` TEXT NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `address` TEXT NULL,
    `img` VARCHAR(191) NOT NULL,
    `groupId` INTEGER NOT NULL,
    `tourPlaceId` INTEGER NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShareTripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `title` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `address` TEXT NULL,
    `comment` TEXT NOT NULL,
    `img` VARCHAR(191) NOT NULL,
    `tourPlaceId` INTEGER NULL,
    `tripMemoryId` INTEGER NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `ShareTripMemory_tripMemoryId_key`(`tripMemoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReplyForShareTripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `text` TEXT NOT NULL,
    `shareTripMemoryId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `parentReplyId` INTEGER NULL,
    `noPtrForParentId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMemoryTag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `name` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `TripMemoryTag_name_userId_idx`(`name`, `userId`),
    UNIQUE INDEX `TripMemoryTag_name_userId_key`(`name`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TripMemoryCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `super` VARCHAR(191) NOT NULL DEFAULT 'etc',
    `name` VARCHAR(191) NOT NULL,

    INDEX `TripMemoryCategory_super_name_idx`(`super`, `name`),
    UNIQUE INDEX `TripMemoryCategory_super_name_key`(`super`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotiNewCommentOnShareTripMemory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` INTEGER NOT NULL,
    `shareTripMemoryId` INTEGER NOT NULL,
    `userChecked` BOOLEAN NOT NULL DEFAULT false,

    INDEX `NotiNewCommentOnShareTripMemory_userId_shareTripMemoryId_idx`(`userId`, `shareTripMemoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GglNearbySearchResTypeToTourPlace` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_GglNearbySearchResTypeToTourPlace_AB_unique`(`A`, `B`),
    INDEX `_GglNearbySearchResTypeToTourPlace_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TourPlaceToVisitJejuTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TourPlaceToVisitJejuTag_AB_unique`(`A`, `B`),
    INDEX `_TourPlaceToVisitJejuTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TourPlaceToValidCluster` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TourPlaceToValidCluster_AB_unique`(`A`, `B`),
    INDEX `_TourPlaceToValidCluster_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BatchQueryParamsToBatchSearchKeyword` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_BatchQueryParamsToBatchSearchKeyword_AB_unique`(`A`, `B`),
    INDEX `_BatchQueryParamsToBatchSearchKeyword_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_QueryParamsToTourPlace` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_QueryParamsToTourPlace_AB_unique`(`A`, `B`),
    INDEX `_QueryParamsToTourPlace_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ScheduleBankToScheduleTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ScheduleBankToScheduleTag_AB_unique`(`A`, `B`),
    INDEX `_ScheduleBankToScheduleTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CardNewsContentToCardTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CardNewsContentToCardTag_AB_unique`(`A`, `B`),
    INDEX `_CardNewsContentToCardTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_IBTravelTagToTourPlace` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_IBTravelTagToTourPlace_AB_unique`(`A`, `B`),
    INDEX `_IBTravelTagToTourPlace_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_TripMemoryToTripMemoryTag` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_TripMemoryToTripMemoryTag_AB_unique`(`A`, `B`),
    INDEX `_TripMemoryToTripMemoryTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ShareTripMemoryToTripMemoryCategory` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ShareTripMemoryToTripMemoryCategory_AB_unique`(`A`, `B`),
    INDEX `_ShareTripMemoryToTripMemoryCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FavoriteTravelType` ADD CONSTRAINT `FavoriteTravelType_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GglPhotos` ADD CONSTRAINT `GglPhotos_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IBPhotos` ADD CONSTRAINT `IBPhotos_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchQueryParamsId_fkey` FOREIGN KEY (`batchQueryParamsId`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TourPlace` ADD CONSTRAINT `TourPlace_batchSearchKeywordId_fkey` FOREIGN KEY (`batchSearchKeywordId`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleBank` ADD CONSTRAINT `ScheduleBank_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardNewsContent` ADD CONSTRAINT `CardNewsContent_cardNewsGroupId_fkey` FOREIGN KEY (`cardNewsGroupId`) REFERENCES `CardNewsGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardNewsGroup` ADD CONSTRAINT `CardNewsGroup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MetaScheduleInfo` ADD CONSTRAINT `MetaScheduleInfo_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VisitSchedule` ADD CONSTRAINT `VisitSchedule_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionTicket` ADD CONSTRAINT `QuestionTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BusinessQuestionTicket` ADD CONSTRAINT `BusinessQuestionTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripCreator` ADD CONSTRAINT `TripCreator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RModelBetweenTravelType` ADD CONSTRAINT `RModelBetweenTravelType_toId_fkey` FOREIGN KEY (`toId`) REFERENCES `IBTravelTag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RModelBetweenTravelType` ADD CONSTRAINT `RModelBetweenTravelType_fromId_fkey` FOREIGN KEY (`fromId`) REFERENCES `IBTravelTag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ValidCluster` ADD CONSTRAINT `ValidCluster_queryParamsId_fkey` FOREIGN KEY (`queryParamsId`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserPasswordHistory` ADD CONSTRAINT `UserPasswordHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemoryGroup` ADD CONSTRAINT `TripMemoryGroup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemory` ADD CONSTRAINT `TripMemory_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `TripMemoryGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_tourPlaceId_fkey` FOREIGN KEY (`tourPlaceId`) REFERENCES `TourPlace`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareTripMemory` ADD CONSTRAINT `ShareTripMemory_tripMemoryId_fkey` FOREIGN KEY (`tripMemoryId`) REFERENCES `TripMemory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_shareTripMemoryId_fkey` FOREIGN KEY (`shareTripMemoryId`) REFERENCES `ShareTripMemory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_parentReplyId_fkey` FOREIGN KEY (`parentReplyId`) REFERENCES `ReplyForShareTripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReplyForShareTripMemory` ADD CONSTRAINT `ReplyForShareTripMemory_noPtrForParentId_fkey` FOREIGN KEY (`noPtrForParentId`) REFERENCES `ReplyForShareTripMemory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TripMemoryTag` ADD CONSTRAINT `TripMemoryTag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotiNewCommentOnShareTripMemory` ADD CONSTRAINT `NotiNewCommentOnShareTripMemory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotiNewCommentOnShareTripMemory` ADD CONSTRAINT `NotiNewCommentOnShareTripMemory_shareTripMemoryId_fkey` FOREIGN KEY (`shareTripMemoryId`) REFERENCES `ShareTripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResTypeToTourPlace` ADD CONSTRAINT `_GglNearbySearchResTypeToTourPlace_A_fkey` FOREIGN KEY (`A`) REFERENCES `GglNearbySearchResType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GglNearbySearchResTypeToTourPlace` ADD CONSTRAINT `_GglNearbySearchResTypeToTourPlace_B_fkey` FOREIGN KEY (`B`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToVisitJejuTag` ADD CONSTRAINT `_TourPlaceToVisitJejuTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToVisitJejuTag` ADD CONSTRAINT `_TourPlaceToVisitJejuTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `VisitJejuTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToValidCluster` ADD CONSTRAINT `_TourPlaceToValidCluster_A_fkey` FOREIGN KEY (`A`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TourPlaceToValidCluster` ADD CONSTRAINT `_TourPlaceToValidCluster_B_fkey` FOREIGN KEY (`B`) REFERENCES `ValidCluster`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BatchQueryParamsToBatchSearchKeyword` ADD CONSTRAINT `_BatchQueryParamsToBatchSearchKeyword_A_fkey` FOREIGN KEY (`A`) REFERENCES `BatchQueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BatchQueryParamsToBatchSearchKeyword` ADD CONSTRAINT `_BatchQueryParamsToBatchSearchKeyword_B_fkey` FOREIGN KEY (`B`) REFERENCES `BatchSearchKeyword`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_QueryParamsToTourPlace` ADD CONSTRAINT `_QueryParamsToTourPlace_A_fkey` FOREIGN KEY (`A`) REFERENCES `QueryParams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_QueryParamsToTourPlace` ADD CONSTRAINT `_QueryParamsToTourPlace_B_fkey` FOREIGN KEY (`B`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ScheduleBankToScheduleTag` ADD CONSTRAINT `_ScheduleBankToScheduleTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `ScheduleBank`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ScheduleBankToScheduleTag` ADD CONSTRAINT `_ScheduleBankToScheduleTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `ScheduleTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CardNewsContentToCardTag` ADD CONSTRAINT `_CardNewsContentToCardTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `CardNewsContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CardNewsContentToCardTag` ADD CONSTRAINT `_CardNewsContentToCardTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `CardTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBTravelTagToTourPlace` ADD CONSTRAINT `_IBTravelTagToTourPlace_A_fkey` FOREIGN KEY (`A`) REFERENCES `IBTravelTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IBTravelTagToTourPlace` ADD CONSTRAINT `_IBTravelTagToTourPlace_B_fkey` FOREIGN KEY (`B`) REFERENCES `TourPlace`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TripMemoryToTripMemoryTag` ADD CONSTRAINT `_TripMemoryToTripMemoryTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `TripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_TripMemoryToTripMemoryTag` ADD CONSTRAINT `_TripMemoryToTripMemoryTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `TripMemoryTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ShareTripMemoryToTripMemoryCategory` ADD CONSTRAINT `_ShareTripMemoryToTripMemoryCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `ShareTripMemory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ShareTripMemoryToTripMemoryCategory` ADD CONSTRAINT `_ShareTripMemoryToTripMemoryCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `TripMemoryCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
