import adPlaceCategory from './adPlaceCategory';

adPlaceCategory()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

export default adPlaceCategory;
