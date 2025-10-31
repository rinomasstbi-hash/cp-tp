import { TPData } from '../types';
import { DB_KEY } from '../constants';

type Database = {
  [subject: string]: TPData[];
};

const getDatabase = (): Database => {
  try {
    const dbString = localStorage.getItem(DB_KEY);
    return dbString ? JSON.parse(dbString) : {};
  } catch (error) {
    console.error("Failed to parse database from localStorage", error);
    return {};
  }
};

const saveDatabase = (db: Database) => {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (error) {
    console.error("Failed to save database to localStorage", error);
  }
};

export const getTPsBySubject = (subject: string): TPData[] => {
  const db = getDatabase();
  return db[subject] || [];
};

export const saveTP = (subject: string, data: Omit<TPData, 'id' | 'createdAt' | 'updatedAt'>): TPData => {
  const db = getDatabase();
  const subjectTPs = db[subject] || [];
  
  const now = new Date().toISOString();
  const newTP: TPData = {
    ...data,
    id: crypto.randomUUID(), // Use robust, cryptographically-secure unique IDs
    createdAt: now,
    updatedAt: now,
  };

  // Immutable update: create a new DB object with the new TP added
  const newDb = {
    ...db,
    [subject]: [...subjectTPs, newTP],
  };

  saveDatabase(newDb);
  return newTP;
};

export const updateTP = (subject: string, updatedTP: TPData): TPData | null => {
  const db = getDatabase();
  const subjectTPs = db[subject];

  if (!subjectTPs) {
    return null;
  }

  const tpIndex = subjectTPs.findIndex(tp => tp.id === updatedTP.id);
  if (tpIndex === -1) {
    return null;
  }

  const newTPData = {
      ...updatedTP,
      updatedAt: new Date().toISOString()
  };

  // Immutable update: create a new array with the updated item
  const newSubjectTPs = subjectTPs.map(tp => 
    tp.id === updatedTP.id ? newTPData : tp
  );
  
  // Immutable update: create a new DB object with the updated list
  const newDb = {
    ...db,
    [subject]: newSubjectTPs
  };

  saveDatabase(newDb);
  return newTPData;
};

export const deleteTP = (subject: string, tpId: string): boolean => {
    const db = getDatabase();
    const subjectTPs = db[subject];

    if (!subjectTPs) {
        return false;
    }

    const newSubjectTPs = subjectTPs.filter(tp => tp.id !== tpId);
    
    if (newSubjectTPs.length < subjectTPs.length) {
        // Immutable update: create a new DB object with the filtered list
        const newDb = {
            ...db,
            [subject]: newSubjectTPs
        };
        saveDatabase(newDb);
        return true;
    }
    return false;
};