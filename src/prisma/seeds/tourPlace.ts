import batchJob from '../../timer/dailyBatchJob';

async function main() {
  await batchJob();
}

const wrapper = (func: () => Promise<void>): (() => void) => {
  return () => {
    func().catch(e => console.log(e));
  };
};

const seeder = (): void => {
  main()
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(wrapper(async () => {}));
};

export default seeder;
