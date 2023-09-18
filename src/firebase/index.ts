import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const keyFilePath = path.join(
  // __dirname,
  process.env.BRIP_JSON_KEY_PATH as string,
  process.env.GOOGLE_FIREBASE_FCM_KEY_FILENAME as string,
);

const serviceAccount = JSON.parse(
  fs.readFileSync(keyFilePath, 'utf8'),
) as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
