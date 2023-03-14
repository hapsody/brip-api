import faqList from './faqList';

faqList().catch(e => {
  console.error(e);
  process.exit(1);
});

export default faqList;
