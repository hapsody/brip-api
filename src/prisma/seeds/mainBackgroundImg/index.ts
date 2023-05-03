import mainBackgroundImg from './mainBackgroundImg';

mainBackgroundImg().catch(e => {
  console.error(e);
  process.exit(1);
});
export default mainBackgroundImg;
