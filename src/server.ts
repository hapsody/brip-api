import app from '@src/app';

if (process.env.NODE_ENV !== 'test') {
  app.listen(process.env.PORT, () => {
    console.log(
      `ts-express Server listening on port: ${process.env.PORT || 3000}`,
    );
  });
}
