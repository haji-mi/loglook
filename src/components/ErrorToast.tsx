import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { AppError } from '../types';

interface ErrorToastProps {
  errors: AppError[];
  onDismiss: (id: string) => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ errors, onDismiss }) => {
  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full px-4 sm:px-0">
      {errors.map((err) => (
        <div
          key={err.id}
          className="flex items-start gap-3 p-4 bg-red-950/90 border border-red-800/80 text-red-200 rounded-xl shadow-2xl backdrop-blur-md animate-fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-red-100">{err.fileName}</div>
            <div className="text-red-300/90 mt-0.5 break-words">{err.message}</div>
          </div>
          <button
            onClick={() => onDismiss(err.id)}
            className="text-red-400 hover:text-red-100 transition-colors p-1"
            title="关闭提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
