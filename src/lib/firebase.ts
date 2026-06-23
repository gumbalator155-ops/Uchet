import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const isFirebaseDummy = !firebaseConfig.apiKey || firebaseConfig.apiKey === '...';

let app: any = null;
let auth: any = null;
const googleAuthProvider = new GoogleAuthProvider();

if (!isFirebaseDummy) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.error('Ошибка инициализации Firebase Auth client SDK:', error);
  }
}

export { auth, googleAuthProvider, isFirebaseDummy };
