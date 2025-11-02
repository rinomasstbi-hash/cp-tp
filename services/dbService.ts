import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from "firebase/firestore";
import { db } from './firebase';
import { TPData } from '../types';

const TP_COLLECTION = 'tps';

// Helper function to provide detailed, actionable error messages for common Firestore issues.
const handleFirestoreError = (error: any, context: string): Error => {
  console.error(`Firestore error in ${context}: `, error);

  if (error.code === 'permission-denied') {
    // FIX: Replaced string concatenation with a template literal for improved readability and to prevent potential parsing errors from complex escape sequences.
    return new Error(
`AKSES DITOLAK: Security Rules di Firestore Anda perlu diperbarui.

Ini berarti pengguna yang sudah login pun tidak diizinkan mengakses data. Salin dan tempel aturan di bawah ini ke tab "Rules" di Firebase Console Anda untuk memperbaikinya:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tps/{tpId} {
      // Pengguna hanya bisa mengakses/mengubah dokumen miliknya sendiri
      allow read, update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      // Pengguna hanya bisa membuat dokumen dengan userId miliknya sendiri
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}`
    );
  }

  if (error.code === 'failed-precondition' && error.message.includes('index')) {
    // FIX: Replaced string concatenation with a template literal for improved readability.
      return new Error(
`MEMBUTUHKAN INDEX: Query database Anda memerlukan index komposit di Firestore agar dapat berjalan. Ini adalah langkah konfigurasi satu kali yang umum.

Buka Firebase Console, navigasi ke Firestore Database > Indexes, dan buat index baru dengan detail berikut:

  - Collection ID: tps
  - Fields to index:
    1. userId (Ascending)
    2. subject (Ascending)
    3. createdAt (Descending)
  - Query scope: Collection

Biasanya, Firebase juga menyediakan link untuk membuat index ini secara otomatis di pesan error pada console browser.`
      );
  }
  
  return new Error(`Gagal ${context}. Penyebab: ${error.message || 'Tidak diketahui'}`);
};


export const getTPsBySubject = async (subject: string, userId: string): Promise<TPData[]> => {
  if (!userId) return [];
  
  const tpsCollection = collection(db, TP_COLLECTION);
  const q = query(
    tpsCollection, 
    where("userId", "==", userId), 
    where("subject", "==", subject),
    orderBy("createdAt", "desc")
  );

  try {
    const querySnapshot = await getDocs(q);
    const tps: TPData[] = [];
    querySnapshot.forEach((doc) => {
      tps.push({ id: doc.id, ...doc.data() } as TPData);
    });
    return tps;
  } catch (error) {
    throw handleFirestoreError(error, "mengambil data dari server");
  }
};

export const saveTP = async (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt'>): Promise<TPData> => {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, TP_COLLECTION), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return { ...data, id: docRef.id, createdAt: now, updatedAt: now };
  } catch (error) {
    throw handleFirestoreError(error, "menyimpan data ke server");
  }
};

export const updateTP = async (tpId: string, updatedData: Partial<Omit<TPData, 'id'>>): Promise<void> => {
  try {
    const tpDoc = doc(db, TP_COLLECTION, tpId);
    await updateDoc(tpDoc, {
        ...updatedData,
        updatedAt: new Date().toISOString()
    });
  } catch (error) {
    throw handleFirestoreError(error, "memperbarui data di server");
  }
};

export const deleteTP = async (tpId: string): Promise<void> => {
    try {
        const tpDoc = doc(db, TP_COLLECTION, tpId);
        await deleteDoc(tpDoc);
    } catch (error) {
        throw handleFirestoreError(error, "menghapus data dari server");
    }
};