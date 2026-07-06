export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
}

const STORAGE_KEY = 'mock_auth_user';

export const auth = {
    get currentUser(): User | null {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    }
};

type AuthStateCallback = (user: User | null) => void;
const listeners: AuthStateCallback[] = [];

export const onAuthStateChanged = (authObj: any, callback: AuthStateCallback) => {
    listeners.push(callback);
    setTimeout(() => callback(auth.currentUser), 0);
    return () => {
        const index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
    };
};

const notifyListeners = () => {
    const user = auth.currentUser;
    listeners.forEach(cb => cb(user));
};

export const signInAnonymously = async (authObj: any) => {
    const user = {
        uid: 'anon_' + Math.random().toString(36).substr(2, 9),
        email: 'rinomasstbi@gmail.com',
        displayName: 'Guru MTsN 4 Jombang'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyListeners();
    return { user };
};

export const signOut = async (authObj: any) => {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
};

export class GoogleAuthProvider {}

export const signInWithPopup = async (authObj: any, provider: any) => {
    // Faking a generic login for this demo
    const user = {
        uid: 'user_' + Math.random().toString(36).substr(2, 9),
        email: 'user@example.com',
        displayName: 'Demo User'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyListeners();
    return { user };
};
