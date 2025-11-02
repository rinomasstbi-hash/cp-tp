import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ====================================================================================
// PENTING: Ganti konfigurasi di bawah ini dengan konfigurasi proyek Firebase Anda.
// ====================================================================================
// 1. Buka Firebase Console: https://console.firebase.google.com/
// 2. Pilih proyek Anda.
// 3. Klik ikon roda gigi (Pengaturan Proyek) di pojok kiri atas.
// 4. Di tab "Umum", scroll ke bawah ke bagian "Aplikasi Anda".
// 5. Cari aplikasi web Anda dan klik ikon </> untuk melihat konfigurasi.
// 6. Salin objek `firebaseConfig` dan tempel di sini untuk menggantikan objek di bawah.
// ====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAhInNLc4HzFkak7kvuu53CstJK0-_vB1Q",
  authDomain: "cp-tp-659e4.firebaseapp.com",
  projectId: "cp-tp-659e4",
  storageBucket: "cp-tp-659e4.firebasestorage.app",
  messagingSenderId: "468554483119",
  appId: "1:468554483119:web:37e5995d1ae386d1df1b5a",
  measurementId: "G-LY4XY6C7L0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };