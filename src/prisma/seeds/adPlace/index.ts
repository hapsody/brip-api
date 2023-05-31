import adPlace from './adPlace';

adPlace().catch(e => {
  console.error(e);
  process.exit(1);
});

export default adPlace;
