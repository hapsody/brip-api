import admin from 'firebase-admin';
import serviceAccount from '@src/firebase/key/brip-e77b9-firebase-adminsdk-4qnnl-c3d6dd4ecc';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export default admin;
