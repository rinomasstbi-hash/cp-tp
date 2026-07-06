import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "(default)");

async function test() {
  const querySnapshot = await getDocs(collection(db, 'tps'));
  console.log('Total TPs:', querySnapshot.size);
  querySnapshot.forEach((doc) => {
    console.log(doc.id, '=>', doc.data());
  });
  process.exit(0);
}
test().catch(console.error);
