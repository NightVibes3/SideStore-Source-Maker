import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    text: string;
}

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => onClose(toast.id), 3000);
        return () => clearTimeout(timer);
    }, [toast.id, onClose]);

    const icons = {
        success: <CheckCircle size={18} className="text-green-400" />,
        error: <AlertCircle size={18} className="text-red-400" />,
        info: <Info size={18} className="text-blue-400" />
    };

    const styles = {
        success: 'bg-green-900/90 border-green-500/30 text-green-100',
        error: 'bg-red-900/90 border-red-500/30 text-red-100',
        info: 'bg-blue-900/90 border-blue-500/30 text-blue-100'
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 fade-in ${styles[toast.type]} min-w-[300px]`}>
            {icons[toast.type]}
            <p className="text-sm font-medium flex-1">{toast.text}</p>
            <button onClick={() => onClose(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity p-1">
                <X size={16} />
            </button>
        </div>
    );
};