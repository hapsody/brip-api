import shareTripMemory from './shareTripMemory';

shareTripMemory().catch(e => {
  console.error(e);
  process.exit(1);
});

export default shareTripMemory;
