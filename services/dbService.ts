import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { TPData, ATPData, PROTAData, KKTPData, PROSEMData } from '../types';

const envConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const activeConfig = envConfig.projectId ? envConfig : firebaseConfig;

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

export const app = initializeApp(activeConfig);
export const db = getFirestore(app, activeConfig.firestoreDatabaseId);
export const auth = getAuth(app);




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
    if (Array.isArray(data)) {
        return data.map(item => cleanStringsInObject(item));
    }
    if (data !== null && typeof data === 'object') {
        const cleanedObject: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                cleanedObject[key] = cleanStringsInObject(data[key]);
            }
        }
        return cleanedObject;
    }
    if (typeof data === 'string') {
        return data.replace(/\$/g, '');
    }
    return data;
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
            requestedAt: serverTimestamp() 
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
        await deleteDoc(doc(db, 'access_requests', email));
    } catch (error) {
         console.error("Error approving access request:", error);
         throw error;
    }
};

export const rejectAccessRequest = async (email: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'access_requests', email));
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
        await setDoc(doc(db, 'approved_users', email), { addedAt: serverTimestamp() });
    } catch (error) {
        console.error("Error adding approved user:", error);
        throw error;
    }
};

export const removeApprovedUser = async (email: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'approved_users', email));
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
    const newDocRef = doc(collection(db, 'tps'));
    const payload = {
        ...data,
        userId: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    try {
        await setDoc(newDocRef, payload);
        return {
            ...data,
            id: newDocRef.id,
            userId: auth.currentUser!.uid,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'tps');
        throw error;
    }
};

export const updateTP = async (id: string, data: Partial<TPData>): Promise<TPData> => {
    const docRef = doc(db, 'tps', id);
    try {
        const docSnap = await getDoc(docRef);
        if(!docSnap.exists()) throw new Error("Document not found");
        const currentData = docSnap.data();
        
        const payload = {
            userId: currentData.userId,
            subject: data.subject ?? currentData.subject,
            cpElements: data.cpElements ?? currentData.cpElements,
            grade: data.grade ?? currentData.grade,
            creatorEmail: data.creatorEmail ?? currentData.creatorEmail,
            creatorName: data.creatorName ?? currentData.creatorName,
            cpSourceVersion: data.cpSourceVersion ?? currentData.cpSourceVersion,
            additionalNotes: data.additionalNotes ?? currentData.additionalNotes,
            tpGroups: data.tpGroups ?? currentData.tpGroups,
            createdAt: currentData.createdAt,
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(docRef, payload);
        return {
            ...currentData,
            ...payload,
            id,
            createdAt: dateToNumber(currentData.createdAt),
            updatedAt: Date.now()
        } as TPData;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tps/${id}`);
        throw error;
    }
};

export const deleteTP = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'tps', id));
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
    const userId = auth.currentUser?.uid;
    if (!userId) return { success: false };
    const q = query(collection(db, 'atps'), where('tpId', '==', tpId), where('userId', '==', userId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
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
    const newDocRef = doc(collection(db, 'atps'));
    const payload = {
        ...data,
        userId: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
    };
    try {
        await setDoc(newDocRef, payload);
        return {
            ...data,
            id: newDocRef.id,
            userId: auth.currentUser!.uid,
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'atps');
        throw error;
    }
};

export const deleteATP = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'atps', id));
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
            creatorEmail: data.creatorEmail ?? currentData.creatorEmail,
            createdAt: currentData.createdAt
        };
        await updateDoc(docRef, payload);
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
    const userId = auth.currentUser?.uid;
    if (!userId) return { success: false };
    const q = query(collection(db, 'protas'), where('tpId', '==', tpId), where('userId', '==', userId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
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
    const newDocRef = doc(collection(db, 'protas'));
    const payload = {
        ...data,
        userId: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
    };
    try {
        await setDoc(newDocRef, payload);
        return {
            ...data,
            id: newDocRef.id,
            userId: auth.currentUser!.uid,
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'protas');
        throw error;
    }
};

export const deletePROTA = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'protas', id));
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
        await updateDoc(docRef, payload);
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
    const newDocRef = doc(collection(db, 'kktps'));
    const payload = {
        ...data,
        userId: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
    };
    try {
        await setDoc(newDocRef, payload);
        return {
            ...data,
            id: newDocRef.id,
            userId: auth.currentUser!.uid,
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'kktps');
        throw error;
    }
};

export const deleteKKTP = async (id: string): Promise<{ success: boolean }> => {
    try {
        await deleteDoc(doc(db, 'kktps', id));
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `kktps/${id}`);
        throw error;
    }
};

export const deleteKKTPsByATPId = async (atpId: string): Promise<{ success: boolean }> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return { success: false };
    const q = query(collection(db, 'kktps'), where('atpId', '==', atpId), where('userId', '==', userId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
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
             const userId = auth.currentUser?.uid || '';
             const q = query(collection(db, 'kktps'), where('atpId', '==', atp.id), where('userId', '==', userId));
             const snapshot = await getDocs(q);
             snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
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
    const newDocRef = doc(collection(db, 'prosems'));
    const payload = {
        ...data,
        userId: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
    };
    try {
        await setDoc(newDocRef, payload);
        return {
            ...data,
            id: newDocRef.id,
            userId: auth.currentUser!.uid,
            createdAt: Date.now(),
        };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'prosems');
        throw error;
    }
};

export const deletePROSEMsByPROTAId = async (protaId: string): Promise<{ success: boolean }> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return { success: false };
    const q = query(collection(db, 'prosems'), where('protaId', '==', protaId), where('userId', '==', userId));
    try {
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
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
             const userId = auth.currentUser?.uid || '';
             const q = query(collection(db, 'prosems'), where('protaId', '==', prota.id), where('userId', '==', userId));
             const snapshot = await getDocs(q);
             snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }
        await batch.commit();
        return { success: true };
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `prosems_by_tp`);
        throw error;
    }
};
