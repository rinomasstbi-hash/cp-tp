import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    const cred = await signInAnonymously(auth);
    console.log('Anonymous login successful', cred.user.uid);
  } catch (e) {
    console.error('Anonymous login failed:', e);
  }
  process.exit(0);
}
test();
