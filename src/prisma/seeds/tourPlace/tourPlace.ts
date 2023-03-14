import batchJob from '../../../timer/dailyBatchJob';

async function main(): Promise<void> {
  await batchJob();
}

// const wrapper = (func: () => Promise<void>): (() => void) => {
//   return () => {
//     func().catch(e => console.log(e));
//   };
// };

// const seeder = (): void => {
//   main()
//     .catch(e => {
//       console.error(e);
//       process.exit(1);
//     })
//     .finally(wrapper(async () => {}));
// };

// seeder();
export default main;
