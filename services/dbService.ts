import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from './firebase';
import { TPData } from '../types';

const TP_COLLECTION = 'tps';

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
    console.error("Error fetching TPs: ", error);
    throw new Error("Gagal mengambil data dari server.");
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
    console.error("Error saving TP: ", error);
    throw new Error("Gagal menyimpan data ke server.");
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
    console.error("Error updating TP: ", error);
    throw new Error("Gagal memperbarui data di server.");
  }
};

export const deleteTP = async (tpId: string): Promise<void> => {
    try {
        const tpDoc = doc(db, TP_COLLECTION, tpId);
        await deleteDoc(tpDoc);
    } catch (error) {
        console.error("Error deleting TP: ", error);
        throw new Error("Gagal menghapus data dari server.");
    }
};
