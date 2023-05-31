import adBusinessPlace from './adBusinessPlace';

adBusinessPlace().catch(e => {
  console.error(e);
  process.exit(1);
});

export default adBusinessPlace;
