import React from 'react';
import { SparklesIcon } from './icons';

interface LoadingOverlayProps {
  isLoading: boolean;
  title: string;
  message: string;
  progress?: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, title, message, progress }) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex flex-col justify-center items-center z-50 p-4 text-center transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
        <SparklesIcon className="w-16 h-16 text-teal-500 mx-auto animate-pulse" />
        <h3 className="text-2xl font-bold text-slate-800 mt-4">{title}</h3>
        <p className="text-slate-600 mt-2">{message}</p>
        {progress !== undefined && (
          <div className="mt-6 w-full">
            <div className="bg-slate-200 rounded-full h-2.5">
              <div 
                className="bg-teal-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {progress > 0 && <p className="text-teal-700 font-semibold mt-3 text-sm">{progress}%</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
