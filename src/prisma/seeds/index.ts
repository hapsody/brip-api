import userSeed from './user/user';
import cardNewsContent from './cardNewsContent/cardNewsContent';
import faqList from './faqList/faqList';
// import tourPlace from './tourPlace';

const abcd = async () => {
  await userSeed();
  await cardNewsContent();
  await faqList();
};

abcd().catch(e => {
  console.error(e);
  process.exit(1);
});

// tourPlace.prototype = () => {};
