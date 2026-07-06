import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './firebaseApp';

export const auth = getAuth(app);

export { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged };
export type { User };
