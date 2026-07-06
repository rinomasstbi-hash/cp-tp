import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';

const envConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isValidConfig = (val: string | undefined) => val && val.length > 0 && !val.startsWith('AQ.');
export const activeConfig = isValidConfig(envConfig.projectId) && isValidConfig(envConfig.apiKey) ? envConfig : firebaseConfig;

export const app = initializeApp(activeConfig);
