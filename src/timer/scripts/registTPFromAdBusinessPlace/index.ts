import registTPFromAdBusinessPlace from './registTPFromAdBusinessPlace';

registTPFromAdBusinessPlace().catch(e => {
  console.error(e);
  process.exit(1);
});

export default registTPFromAdBusinessPlace;
