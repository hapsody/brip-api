import adPlaceCategory from './adPlaceCategory';

adPlaceCategory().catch(e => {
  console.error(e);
  process.exit(1);
});

export default adPlaceCategory;
