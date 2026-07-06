import React from 'react';
import { signInWithPopup, GoogleAuthProvider, auth } from '../services/authService';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Popup otentikasi ditutup sebelum login selesai. Silakan coba lagi. Jika Anda mengalami masalah, coba buka aplikasi di tab baru atau izinkan pop-up di browser Anda.');
      } else {
        setError(err.message || 'Terjadi kesalahan saat login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <img
            className="mx-auto h-24 w-auto"
            src="https://id.ppdb.mtsn4jombang.org/assets/img/logo/logo_ppdb695.png"
            alt="MTsN 4 Jombang"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
            Login ke AGRU
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Asisten Guru - MTsN 4 Jombang
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
               <span className="flex items-center">
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Memproses...
               </span>
            ) : (
              <span className="flex items-center">
                Masuk / Sign in
              </span>
            )}
          </button>
        </div>

        {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md text-center">
              {error}
            </div>
        )}
      </div>
    </div>
  );
};

export default Login;
