import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const newDocRef = doc(collection(db, 'tps'), "test1234");
    await setDoc(newDocRef, { subject: "test" });
    console.log('Write successful');
  } catch (e) {
    console.error('Write failed:', e);
  }
  process.exit(0);
}
test();
