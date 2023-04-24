import iBAreaCode from './iBAreaCode';

iBAreaCode().catch(e => {
  console.error(e);
  process.exit(1);
});

export default iBAreaCode;
