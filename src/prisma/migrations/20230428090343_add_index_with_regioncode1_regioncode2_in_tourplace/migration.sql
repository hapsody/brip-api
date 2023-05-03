-- CreateIndex
CREATE INDEX `TourPlace_nationalCode_regionCode1_id_idx` ON `TourPlace`(`nationalCode`, `regionCode1`, `id`);

-- CreateIndex
CREATE INDEX `TourPlace_nationalCode_regionCode1_regionCode2_id_idx` ON `TourPlace`(`nationalCode`, `regionCode1`, `regionCode2`, `id`);
