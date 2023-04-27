import iBEventPromotion from './iBEventPromotion';

iBEventPromotion().catch(e => {
  console.error(e);
  process.exit(1);
});

export default iBEventPromotion;
