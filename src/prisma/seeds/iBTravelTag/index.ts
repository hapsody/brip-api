import iBTravelTag from './iBTravelTag';

iBTravelTag()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

export default iBTravelTag;
