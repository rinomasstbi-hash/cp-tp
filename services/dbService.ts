import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch, Timestamp, enableIndexedDbPersistence, initializeFirestore, getCountFromServer, addDoc } from 'firebase/firestore';
import { TPData, ATPData, PROTAData, KKTPData, PROSEMData, ApiKeyItem } from '../types';
import { app, activeConfig } from './firebaseApp';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export const db = getFirestore(app, activeConfig.firestoreDatabaseId || '(default)');

// Enable offline persistence so data is saved locally first
enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Firebase persistence error:", err.code);
});

import { auth } from './authService';




function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Convert timestamp (number) back and forth is needed sometimes but we are using numbers via serverTimestamp() which becomes FieldValue then number locally?
// No, serverTimestamp() evaluates to Date locally if we use toDate(), or number? 
// Wait, for simplicity let's stick to using Date.now() or let Firebase use Timestamp and we map it to `number`.
const dateToNumber = (val: any): number => {
    if (!val) return Date.now();
    if (typeof val === 'number') return val;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (val instanceof Date) return val.getTime();
    return Date.now();
};

const cleanStringsInObject = (data: any): any => {
    if (data === null || data === undefined) return data;
    try {
        // Fast path: if it's an object/array, use native JSON stringify/parse
        // Native V8 serialization is orders of magnitude faster than recursive JS loops
        const jsonString = JSON.stringify(data);
        if (jsonString && jsonString.includes('$')) {
             // Only parse if we actually need to replace something
             return JSON.parse(jsonString.replace(/\$/g, ''));
        }
        return data;
    } catch (e) {
        return data;
    }
};

// ============================================================================
// Approved Users
// ============================================================================

export const isUserApproved = async (email: string | null): Promise<boolean> => {
    if (!email) return false;
    if (email === 'rinomasstbi@gmail.com') return true;
    
    // Simple session cache to avoid repeated DB calls on reload
    const cacheKey = `mtsn4jombang_approved_${email}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached === 'true') return true;

    try {
        const docRef = doc(db, 'approved_users', email);
        const docSnap = await getDoc(docRef);
        const approved = docSnap.exists();
        if (approved) {
            sessionStorage.setItem(cacheKey, 'true');
        }
        return approved;
    } catch (error) {
        console.error("Error checking user approval:", error);
        return false;
    }
};

export const recordAccessRequest = async (email: string, name: string | null): Promise<void> => {
    try {
        await setDoc(doc(db, 'access_requests', email), { 
            name: name || email,
            requestedAt: Date.now() 
        });
    } catch (error) {
        console.error("Error recording access request:", error);
    }
};

export const getAccessRequests = async (): Promise<{email: string, name: string, requestedAt: number}[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, 'access_requests'));
        return querySnapshot.docs.map(doc => ({ 
            email: doc.id,
            name: doc.data().name,
            requestedAt: dateToNumber(doc.data().requestedAt)
        }));
    } catch (error) {
        console.error("Error getting access requests:", error);
        return [];
    }
};

export const approveAccessRequest = async (email: string): Promise<void> => {
    try {
        await addApprovedUser(email);
        deleteDoc(doc(db, 'access_requests', email)).catch(e => console.warn(e));
    } catch (error) {
         console.error("Error approving access request:", error);
         throw error;
    }
};

export const rejectAccessRequest = async (email: string): Promise<void> => {
    try {
        deleteDoc(doc(db, 'access_requests', email)).catch(e => console.warn(e));
    } catch (error) {
         console.error("Error rejecting access request:", error);
         throw error;
    }
};

export const getApprovedUsers = async (): Promise<{email: string}[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, 'approved_users'));
        return querySnapshot.docs.map(doc => ({ email: doc.id }));
    } catch (error) {
        console.error("Error getting approved users:", error);
        return [];
    }
};

export const addApprovedUser = async (email: string): Promise<void> => {
    try {
        await setDoc(doc(db, 'approved_users', email), { addedAt: Date.now() });
    } catch (error) {
        console.error("Error adding approved user:", error);
        throw error;
    }
};

export const removeApprovedUser = async (email: string): Promise<void> => {
    try {
        deleteDoc(doc(db, 'approved_users', email)).catch(e => console.warn(e));
    } catch (error) {
         console.error("Error removing approved user:", error);
         throw error;
    }
};

// ============================================================================
// TP (Tujuan Pembelajaran)
// ============================================================================

export const getTPsBySubject = async (subject: string): Promise<TPData[]> => {
    const q = query(collection(db, 'tps'), where('subject', '==', subject));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return cleanStringsInObject({
                ...data,
                id: doc.id,
                createdAt: dateToNumber(data.createdAt),
                updatedAt: dateToNumber(data.updatedAt)
            }) as TPData;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'tps');
        return [];
    }
};

export const getAllTPs = async (): Promise<TPData[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, 'tps'));
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return cleanStringsInObject({
                ...data,
                id: doc.id,
                createdAt: dateToNumber(data.createdAt),
                updatedAt: dateToNumber(data.updatedAt)
            }) as TPData;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'tps');
        return [];
    }
};

export const saveTP = async (data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<TPData> => {
    if (!auth.currentUser) {
        throw new Error("Penyimpanan gagal: Anda harus login dengan akun Guru terlebih dahulu.");
    }
    let payload = {
        ...data,
        userId: (auth.currentUser?.uid || ""),
        creatorEmail: (auth.currentUser?.email || ""),
        creatorName: data.creatorName || (auth.currentUser?.displayName || auth.currentUser?.email || "User"),
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    
    // Completely sanitize payload to prevent Firestore hanging on undefined values or proxy objects
    payload = JSON.parse(JSON.stringify(payload));

    try {
        const newDocRef = doc(collection(db, 'tps'));
        // Optimistic update: Fire and forget
        setDoc(newDocRef, payload).catch(err => console.warn("Background sync delayed:", err));
        
        return {
            ...payload,
            id: newDocRef.id
        } as TPData;
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'tps');
        throw error;
    }
};

export const updateTP = async (id: string, data: Partial<TPData>): Promise<TPData> => {
    const docRef = doc(db, 'tps', id);
    try {
        // We do not fetch the current doc to allow offline edits to work seamlessly.
        // We will just merge the updates.
        
        let payload = {
            subject: data.subject,
            cpElements: data.cpElements,
            grade: data.grade,
            creatorEmail: (auth.currentUser?.email || ""),
            creatorName: data.creatorName,
            cpSourceVersion: data.cpSourceVersion,
            additionalNotes: data.additionalNotes,
            tpGroups: data.tpGroups,
            updatedAt: Date.now()
        };
        
        // Remove undefined fields so they are not overwritten
        Object.keys(payload).forEach(key => {
          if ((payload as any)[key] === undefined) {
            delete (payload as any)[key];
          }
        });
        
        payload = JSON.parse(JSON.stringify(payload));
        
        // Optimistic update
        updateDoc(docRef, payload).catch(err => console.warn("Background sync delayed:", err));
        
        return {
            ...data, // returns the new values
            id,
            updatedAt: Date.now()
        } as TPData;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tps/${id}`);
        throw error;
    }
};

export const deleteTP = async (id: string): Promise<{ success: boolean }> => {
    try {
        deleteDoc(doc(db, 'tps', id)).catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tps/${id}`);
        throw error;
    }
};

// ============================================================================
// ATP (Alur Tujuan Pembelajaran)
// ============================================================================

export const deleteATPsByTPId = async (tpId: string): Promise<{ success: boolean }> => {
    const q = query(collection(db, 'atps'), where('tpId', '==', tpId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        batch.commit().catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, `atps`);
         throw error;
    }
};

export const getATPsByTPId = async (tpId: string): Promise<ATPData[]> => {
    const q = query(collection(db, 'atps'), where('tpId', '==', tpId));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return cleanStringsInObject({
                ...data,
                id: doc.id,
                createdAt: dateToNumber(data.createdAt)
            }) as ATPData;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'atps');
        return [];
    }
};

export const saveATP = async (data: Omit<ATPData, 'id' | 'createdAt' | 'userId'>): Promise<ATPData> => {
    if (!auth.currentUser) {
        throw new Error("Penyimpanan gagal: Anda harus login dengan akun Guru terlebih dahulu.");
    }
    const newDocRef = doc(collection(db, 'atps'));
    const payload = {
        ...data,
        userId: (auth.currentUser?.uid || ""),
        creatorEmail: (auth.currentUser?.email || ""),
        creatorName: data.creatorName || (auth.currentUser?.displayName || auth.currentUser?.email || "User"),
        createdAt: Date.now(),
    };
    try {
        setDoc(newDocRef, payload).catch(e => console.warn("Background sync delayed:", e));
        return {
            ...data,
            id: newDocRef.id,
            userId: (auth.currentUser?.uid || ""),
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'atps');
        throw error;
    }
};

export const deleteATP = async (id: string): Promise<{ success: boolean }> => {
    try {
        deleteDoc(doc(db, 'atps', id)).catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `atps/${id}`);
        throw error;
    }
};

export const updateATP = async (id: string, data: Partial<ATPData>): Promise<ATPData> => {
    const docRef = doc(db, 'atps', id);
    try {
        const docSnap = await getDoc(docRef);
        if(!docSnap.exists()) throw new Error("Document not found");
        const currentData = docSnap.data();
        
        const payload = {
            userId: currentData.userId,
            tpId: data.tpId ?? currentData.tpId,
            subject: data.subject ?? currentData.subject,
            content: data.content ?? currentData.content,
            creatorName: data.creatorName ?? currentData.creatorName,
            creatorEmail: (auth.currentUser?.email || ""),
            createdAt: currentData.createdAt
        };
        updateDoc(docRef, payload).catch(e => console.warn("Background sync delayed:", e));
        return {
            ...currentData,
            ...payload,
            id,
            createdAt: dateToNumber(currentData.createdAt)
        } as ATPData;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `atps/${id}`);
        throw error;
    }
};

// ============================================================================
// PROTA (Program Tahunan)
// ============================================================================

export const deletePROTAsByTPId = async (tpId: string): Promise<{ success: boolean }> => {
    const q = query(collection(db, 'protas'), where('tpId', '==', tpId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        batch.commit().catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, `protas`);
         throw error;
    }
};

export const getPROTAsByTPId = async (tpId: string): Promise<PROTAData[]> => {
    const q = query(collection(db, 'protas'), where('tpId', '==', tpId));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return cleanStringsInObject({
                ...data,
                id: doc.id,
                createdAt: dateToNumber(data.createdAt)
            }) as PROTAData;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'protas');
        return [];
    }
};

export const savePROTA = async (data: Omit<PROTAData, 'id' | 'createdAt' | 'userId'>): Promise<PROTAData> => {
    if (!auth.currentUser) {
        throw new Error("Penyimpanan gagal: Anda harus login dengan akun Guru terlebih dahulu.");
    }
    const newDocRef = doc(collection(db, 'protas'));
    const payload = {
        ...data,
        userId: (auth.currentUser?.uid || ""),
        creatorName: data.creatorName || (auth.currentUser?.displayName || auth.currentUser?.email || "User"),
        createdAt: Date.now(),
    };
    try {
        setDoc(newDocRef, payload).catch(e => console.warn("Background sync delayed:", e));
        return {
            ...data,
            id: newDocRef.id,
            userId: (auth.currentUser?.uid || ""),
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'protas');
        throw error;
    }
};

export const deletePROTA = async (id: string): Promise<{ success: boolean }> => {
    try {
        deleteDoc(doc(db, 'protas', id)).catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `protas/${id}`);
        throw error;
    }
};

export const updatePROTA = async (id: string, data: Partial<PROTAData>): Promise<PROTAData> => {
    const docRef = doc(db, 'protas', id);
    try {
        const docSnap = await getDoc(docRef);
        if(!docSnap.exists()) throw new Error("Document not found");
        const currentData = docSnap.data();
        const payload = {
            userId: currentData.userId,
            tpId: data.tpId ?? currentData.tpId,
            subject: data.subject ?? currentData.subject,
            jamPertemuan: data.jamPertemuan ?? currentData.jamPertemuan,
            content: data.content ?? currentData.content,
            creatorName: data.creatorName ?? currentData.creatorName,
            createdAt: currentData.createdAt
        };
        updateDoc(docRef, payload).catch(e => console.warn("Background sync delayed:", e));
        return {
            ...currentData,
            ...payload,
            id,
            createdAt: dateToNumber(currentData.createdAt)
        } as PROTAData;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `protas/${id}`);
        throw error;
    }
};

// ============================================================================
// KKTP
// ============================================================================

export const getKKTPsByATPId = async (atpId: string): Promise<KKTPData[]> => {
    const q = query(collection(db, 'kktps'), where('atpId', '==', atpId));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return cleanStringsInObject({
                ...data,
                id: doc.id,
                createdAt: dateToNumber(data.createdAt)
            }) as KKTPData;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'kktps');
        return [];
    }
};

export const saveKKTP = async (data: Omit<KKTPData, 'id' | 'createdAt' | 'userId'>): Promise<KKTPData> => {
    if (!auth.currentUser) {
        throw new Error("Penyimpanan gagal: Anda harus login dengan akun Guru terlebih dahulu.");
    }
    const newDocRef = doc(collection(db, 'kktps'));
    const payload = {
        ...data,
        userId: (auth.currentUser?.uid || ""),
        createdAt: Date.now(),
    };
    try {
        setDoc(newDocRef, payload).catch(e => console.warn("Background sync delayed:", e));
        return {
            ...data,
            id: newDocRef.id,
            userId: (auth.currentUser?.uid || ""),
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'kktps');
        throw error;
    }
};

export const deleteKKTP = async (id: string): Promise<{ success: boolean }> => {
    try {
        deleteDoc(doc(db, 'kktps', id)).catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `kktps/${id}`);
        throw error;
    }
};

export const deleteKKTPsByATPId = async (atpId: string): Promise<{ success: boolean }> => {
    const q = query(collection(db, 'kktps'), where('atpId', '==', atpId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        batch.commit().catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, `kktps`);
         throw error;
    }
};

export const deleteKKTPsByTPId = async (tpId: string): Promise<{ success: boolean }> => {
    // Need to do this properly. Easiest way in NoSQL is mapping, but we don't have tpId on KKTP directly in schema.
    // However the previous implementation just passed tpId to GAS backend.
    // Let's first query ATPs for this TP, then delete related KKTPs.
    try {
        const atps = await getATPsByTPId(tpId);
        const batch = writeBatch(db);
        for(const atp of atps) {
             const q = query(collection(db, 'kktps'), where('atpId', '==', atp.id));
             const snapshot = await getDocs(q);
             snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        batch.commit().catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `kktps_by_tp`);
        throw error;
    }
};

// ============================================================================
// PROSEM
// ============================================================================

export const getPROSEMByProtaId = async (protaId: string): Promise<PROSEMData[]> => {
    const q = query(collection(db, 'prosems'), where('protaId', '==', protaId));
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return cleanStringsInObject({
                ...data,
                id: doc.id,
                createdAt: dateToNumber(data.createdAt)
            }) as PROSEMData;
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'prosems');
        return [];
    }
};

export const savePROSEM = async (data: Omit<PROSEMData, 'id' | 'createdAt' | 'userId'>): Promise<PROSEMData> => {
    if (!auth.currentUser) {
        throw new Error("Penyimpanan gagal: Anda harus login dengan akun Guru terlebih dahulu.");
    }
    const newDocRef = doc(collection(db, 'prosems'));
    const payload = {
        ...data,
        userId: (auth.currentUser?.uid || ""),
        createdAt: Date.now(),
    };
    try {
        setDoc(newDocRef, payload).catch(e => console.warn("Background sync delayed:", e));
        return {
            ...data,
            id: newDocRef.id,
            userId: (auth.currentUser?.uid || ""),
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'prosems');
        throw error;
    }
};

export const updatePROSEM = async (id: string, data: Partial<PROSEMData>): Promise<PROSEMData> => {
    const docRef = doc(db, 'prosems', id);
    try {
        const docSnap = await getDoc(docRef);
        if(!docSnap.exists()) throw new Error("Document not found");
        const currentData = docSnap.data();
        const payload = {
            userId: currentData.userId,
            protaId: data.protaId ?? currentData.protaId,
            subject: data.subject ?? currentData.subject,
            grade: data.grade ?? currentData.grade,
            semester: data.semester ?? currentData.semester,
            headers: data.headers ?? currentData.headers,
            content: data.content ?? currentData.content,
            createdAt: currentData.createdAt
        };
        updateDoc(docRef, payload).catch(e => console.warn("Background sync delayed:", e));
        return {
            ...currentData,
            ...payload,
            id,
            createdAt: dateToNumber(currentData.createdAt)
        } as PROSEMData;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `prosems/${id}`);
        throw error;
    }
};

export const deletePROSEMsByPROTAId = async (protaId: string): Promise<{ success: boolean }> => {
    const q = query(collection(db, 'prosems'), where('protaId', '==', protaId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        batch.commit().catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, `prosems`);
         throw error;
    }
};

export const deletePROSEMsByTPId = async (tpId: string): Promise<{ success: boolean }> => {
    try {
        const protas = await getPROTAsByTPId(tpId);
        const batch = writeBatch(db);
        for(const prota of protas) {
             const q = query(collection(db, 'prosems'), where('protaId', '==', prota.id));
             const snapshot = await getDocs(q);
             snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        batch.commit().catch(e => console.warn("Background sync delayed:", e));
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `prosems_by_tp`);
        throw error;
    }
};


export interface AdminSettings {
  geminiApiKey: string;
  apiKeys?: ApiKeyItem[];
  tahunPelajaran: string;
  kepalaMadrasah: string;
  nipKepalaMadrasah: string;
  mataPelajaran: string[];
  namaAplikasi?: string;
  weeksGanjil78?: Record<string, number[]>;
  weeksGenap78?: Record<string, number[]>;
  weeksGanjil9?: Record<string, number[]>;
  weeksGenap9?: Record<string, number[]>;
  weekLabelsGanjil78?: Record<string, Record<string, string>>;
  weekLabelsGenap78?: Record<string, Record<string, string>>;
  weekLabelsGanjil9?: Record<string, Record<string, string>>;
  weekLabelsGenap9?: Record<string, Record<string, string>>;
}

export const getAdminSettings = async (): Promise<AdminSettings | null> => {
  try {
    const docRef = doc(db, 'settings', 'admin');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as AdminSettings;
    }
    return null;
  } catch (error) {
    console.error("Error getting admin settings:", error);
    return null;
  }
};

export const saveAdminSettings = async (settings: Partial<AdminSettings>): Promise<void> => {
  const docRef = doc(db, 'settings', 'admin');
  await setDoc(docRef, settings, { merge: true });
};
