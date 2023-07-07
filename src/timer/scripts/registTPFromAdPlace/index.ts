import registTPFromAdPlace from './registTPFromAdPlace';

registTPFromAdPlace().catch(e => {
  console.error(e);
  process.exit(1);
});

export default registTPFromAdPlace;
