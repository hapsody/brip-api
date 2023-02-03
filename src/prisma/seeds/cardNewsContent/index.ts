import cardNewsContent from './cardNewsContent';

cardNewsContent().catch(e => {
  console.error(e);
  process.exit(1);
});

export default cardNewsContent;
