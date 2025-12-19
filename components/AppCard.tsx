import React, { memo } from 'react';
import { AppItem } from '../types';
import { AppEditor } from './AppEditor';
import { Smartphone, Edit2, ArchiveX, ShieldAlert, AlertTriangle, Terminal } from 'lucide-react';

interface AppCardProps {
    app: AppItem;
    isEditing: boolean;
    isExcluded?: boolean;
    onToggleEdit: (id: string) => void;
    onUpdate: (id: string, updatedApp: AppItem) => void;
    onDelete: (id: string) => void;
    onCloseEdit: () => void;
}

export const AppCard = memo(({ 
    app, 
    isEditing, 
    isExcluded,
    onToggleEdit, 
    onUpdate, 
    onDelete, 
    onCloseEdit 
}: AppCardProps) => {
    
    const tint = app.tintColor || '#3b82f6';
    const opacityClass = isExcluded ? 'opacity-50 grayscale-[0.5]' : '';

    return (
        <div className={`transform transition-all duration-200 ${opacityClass}`}>
            <div 
                className={`relative group overflow-hidden rounded-2xl border transition-all duration-200 ${isEditing ? 'ring-1 shadow-lg scale-[1.01]' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                style={{ 
                    backgroundColor: isEditing ? '#0f172a' : `${tint}08`, 
                    borderColor: isEditing ? tint : `${tint}20`,
                }}
            >
                <div 
                    className="absolute left-0 top-0 bottom-0 w-1" 
                    style={{ backgroundColor: tint }}
                ></div>
                
                <div 
                    className="p-4 pl-5 flex items-center gap-4 cursor-pointer"
                    onClick={() => onToggleEdit(app.id)}
                >
                    <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-md border border-white/5 relative z-10">
                        {app.iconURL ? (
                            <img 
                                src={app.iconURL} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('flex-col');
                                    e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>');
                                }}
                            />
                        ) : (
                            <Smartphone size={24} className="text-slate-600" />
                        )}
                        {isExcluded && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                <ArchiveX size={20} className="text-white" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white truncate text-lg leading-tight mb-1">
                                {app.name}
                            </h3>
                            {isExcluded && (
                                <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">EXCLUDED</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{app.developerName || "Unknown Dev"}</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                            <span>v{app.version}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center gap-1 text-xs font-medium transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <span style={{ color: tint }}>Edit</span>
                            <Edit2 size={12} style={{ color: tint }} />
                        </div>
                    </div>
                </div>
                
                {isEditing && (
                    <div className="border-t border-slate-800 p-4 bg-slate-900/50">
                        <AppEditor app={app} onUpdate={onUpdate} onDelete={onDelete} onClose={onCloseEdit} />
                    </div>
                )}
            </div>
        </div>
    );
});