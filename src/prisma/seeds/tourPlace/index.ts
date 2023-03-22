import tourPlace from './tourPlace';

tourPlace().catch(e => {
  console.error(e);
  process.exit(1);
});

export default tourPlace;
