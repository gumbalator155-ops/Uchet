import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const isFirebaseDummy = !firebaseConfig.projectId || firebaseConfig.projectId === '...';

let app: App | null = null;
let adminAuth: Auth | null = null;

if (!isFirebaseDummy) {
  try {
    if (!getApps().length) {
      app = initializeApp({
        projectId: firebaseConfig.projectId,
      });
    } else {
      app = getApps()[0];
    }
    adminAuth = getAuth(app);
  } catch (error) {
    console.warn('Failed to initialize Firebase Admin SDK:', error);
  }
}

export { adminAuth, isFirebaseDummy };
