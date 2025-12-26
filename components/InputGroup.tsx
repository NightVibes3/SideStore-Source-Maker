import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputGroupProps {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: 'text' | 'url' | 'date' | 'number' | 'color' | 'textarea';
    placeholder?: string;
    helperText?: string;
    error?: string | null;
    className?: string;
    rightElement?: React.ReactNode;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
    label, 
    value, 
    onChange, 
    type = 'text', 
    placeholder, 
    helperText,
    error,
    className = "",
    rightElement
}) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex justify-between items-center">
                <span>{label}</span>
                <div className="flex items-center gap-2">
                    {rightElement}
                    {error && <span className="text-red-400 flex items-center gap-1 normal-case tracking-normal"><AlertCircle size={10} /> {error}</span>}
                </div>
            </label>
            {type === 'textarea' ? (
                <textarea
                    className={`bg-slate-900 border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 transition-all min-h-[80px] ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-slate-700 focus:ring-blue-600 focus:border-transparent'}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            ) : type === 'color' ? (
                 <div className="flex items-center gap-2">
                    <input
                        type="color"
                        className="h-10 w-12 bg-transparent border-0 rounded cursor-pointer"
                        value={value.toString()}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <input
                        type="text"
                        className={`flex-1 bg-slate-900 border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 transition-all ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-slate-700 focus:ring-blue-600 focus:border-transparent'}`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="#000000"
                    />
                </div>
            ) : (
                <input
                    type={type}
                    className={`bg-slate-900 border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 transition-all ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-slate-700 focus:ring-blue-600 focus:border-transparent'}`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            )}
            {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
        </div>
    );
};