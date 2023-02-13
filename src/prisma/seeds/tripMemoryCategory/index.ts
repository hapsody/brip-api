import tripMemoryCategory from './tripMemoryCategory';

tripMemoryCategory().catch(e => {
  console.error(e);
  process.exit(1);
});

export default tripMemoryCategory;
