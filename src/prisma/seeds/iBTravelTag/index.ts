import iBTravelTag from './iBTravelTag';

iBTravelTag().catch(e => {
  console.error(e);
  process.exit(1);
});

export default iBTravelTag;
