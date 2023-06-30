import cardNewsContent from './cardNewsContent';

cardNewsContent()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

export default cardNewsContent;
