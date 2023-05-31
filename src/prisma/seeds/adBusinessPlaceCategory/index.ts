import adBusinessPlaceCategory from './adBusinessPlaceCategory';

adBusinessPlaceCategory().catch(e => {
  console.error(e);
  process.exit(1);
});

export default adBusinessPlaceCategory;
