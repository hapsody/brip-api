import user from './user';

user().catch(e => {
  console.error(e);
  process.exit(1);
});
export default user;
