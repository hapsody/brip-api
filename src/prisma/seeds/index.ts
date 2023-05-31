import userSeed from './user/user';
import cardNewsContent from './cardNewsContent/cardNewsContent';
import faqList from './faqList/faqList';
import tripMemoryCategory from './tripMemoryCategory/tripMemoryCategory';
import shareTripMemory from './shareTripMemory/shareTripMemory';
import iBTravelTag from './iBTravelTag/iBTravelTag';
// import tourPlace from './tourPlace'; /// big size data
import iBEventPromotion from './iBEventPromotion/iBEventPromotion';
import mainBackgroundImg from './mainBackgroundImg/mainBackgroundImg';
import adPlaceCategory from './adPlaceCategory/adPlaceCategory';
import adPlace from './adPlace/adPlace';

const abcd = async () => {
  await userSeed();
  await cardNewsContent();
  await faqList();
  await tripMemoryCategory();
  await shareTripMemory();
  await iBTravelTag();
  await iBEventPromotion();
  await mainBackgroundImg();
  await adPlaceCategory();
  await adPlace();
};

abcd().catch(e => {
  console.error(e);
  process.exit(1);
});

// tourPlace.prototype = () => {};
