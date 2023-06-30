import shareTripMemory from './shareTripMemory';

shareTripMemory()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

export default shareTripMemory;
