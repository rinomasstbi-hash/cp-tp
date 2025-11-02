import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebase';
import { APP_TITLE } from '../constants';
import { AlertIcon } from './icons';

const Login: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    // Change error state to an object for more structured content
    const [error, setError] = useState<{title: string, message: React.ReactNode} | null>(null);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (err: any) {
            let title = "Gagal Masuk";
            let message: React.ReactNode = "Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.";
            
            if (err.code === 'auth/unauthorized-domain') {
                title = "Domain Tidak Diizinkan";
                // Get project ID from the live auth instance to build a helpful link
                const projectId = auth.app.options.projectId;
                const consoleUrl = projectId ? `https://console.firebase.google.com/u/0/project/${projectId}/authentication/settings` : '#';
                
                message = (
                    <>
                        <p className="mb-2">Firebase menolak permintaan karena domain <code className="bg-red-100 text-red-800 px-1 rounded">aistudio.google.com</code> tidak ada dalam daftar domain resmi Anda.</p>
                        <p className="font-semibold mb-1">Langkah-langkah untuk memperbaiki:</p>
                        <ol className="list-decimal list-inside text-sm space-y-1">
                            <li>Buka Pengaturan Autentikasi Firebase Anda.</li>
                            <li>Klik "Add domain" dan masukkan <code className="bg-red-100 text-red-800 px-1 rounded">aistudio.google.com</code> persis seperti ini.</li>
                            <li>Jika Anda baru saja menambahkannya, mohon tunggu 2-5 menit lalu coba lagi (ini disebut 'propagation delay').</li>
                        </ol>
                        {projectId && (
                            <a href={consoleUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-blue-600 hover:text-blue-800 hover:underline font-semibold">
                                Buka Firebase Console &rarr;
                            </a>
                        )}
                    </>
                );
            } else {
                message = err.message || 'Gagal masuk dengan Google. Silakan coba lagi.';
            }
            
            setError({ title, message });
            console.error("Firebase Auth Error:", err);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
                 <img src="https://picsum.photos/seed/mtsn4/100/100" alt="Logo MTsN 4 Jombang" className="w-24 h-24 mx-auto rounded-full shadow-lg mb-4" />
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{APP_TITLE}</h1>
                <p className="text-slate-600 mt-2 mb-8">Silakan masuk untuk mulai mengelola Tujuan Pembelajaran.</p>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                           <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                           <span>Memproses...</span>
                        </>
                    ) : (
                        <>
                           <svg className="w-6 h-6" viewBox="0 0 48 48">
                                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h13.04c-.58 2.77-2.26 5.13-4.81 6.74l7.98 6.19C45.33 36.6 48 31.05 48 24c0-.66-.05-1.3-.15-1.95l-1.42-.5z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.11 1.45-4.79 2.3-7.91 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                <path fill="none" d="M0 0h48v48H0z"></path>
                           </svg>
                           <span className="text-base font-semibold text-slate-700">Masuk dengan Google</span>
                        </>
                    )}
                    
                </button>
                 {error && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertIcon className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{error.title}</h3>
                                <div className="mt-2 text-sm text-red-700">
                                    {error.message}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
             <footer className="text-center mt-8 text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} MTsN 4 Jombang. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Login;