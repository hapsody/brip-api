-- DropIndex
DROP INDEX `TourPlace_gl_place_id_vj_contentsid_idx` ON `TourPlace`;

-- CreateIndex
CREATE INDEX `IBTravelTag_minDifficulty_maxDifficulty_id_idx` ON `IBTravelTag`(`minDifficulty`, `maxDifficulty`, `id`);

-- CreateIndex
CREATE INDEX `TourPlace_lat_lng_id_idx` ON `TourPlace`(`lat`, `lng`, `id`);
