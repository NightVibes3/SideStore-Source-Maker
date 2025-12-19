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

    const getStatusBadge = () => {
        if (!app.compatibilityStatus || app.compatibilityStatus === 'unknown' || app.compatibilityStatus === 'safe') return null;

        if (app.compatibilityStatus === 'jailbreak_only') {
            return (
                <div className="flex items-center gap-1 bg-purple-900/60 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <ShieldAlert size={10} /> Jailbreak
                </div>
            );
        }
        if (app.compatibilityStatus === 'trollstore_only') {
            return (
                <div className="flex items-center gap-1 bg-red-900/60 border border-red-500/30 text-red-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <AlertTriangle size={10} /> TrollStore
                </div>
            );
        }
        if (app.compatibilityStatus === 'jit_required') {
            return (
                <div className="flex items-center gap-1 bg-amber-900/60 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <Terminal size={10} /> Needs JIT
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`transform transition-all duration-200 ${opacityClass}`}>
            <div 
                className={`relative group overflow-hidden rounded-2xl border transition-all duration-200 ${isEditing ? 'ring-1 shadow-lg scale-[1.01]' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
                style={{ 
                    backgroundColor: isEditing ? '#0f172a' : `${tint}08`, 
                    borderColor: isEditing ? tint : `${tint}20`,
                }}
            >
                {/* Colored Bar */}
                <div 
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5" 
                    style={{ backgroundColor: tint }}
                ></div>
                
                {/* Card Header / Summary */}
                <div 
                    className="p-4 pl-5 flex items-center gap-4 cursor-pointer"
                    onClick={() => onToggleEdit(app.id)}
                >
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 shadow-md border border-white/5 relative z-10">
                        {app.iconURL ? (
                            <img src={app.iconURL} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <Smartphone size={24} className="text-slate-600" />
                        )}
                        {isExcluded && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                <ArchiveX size={20} className="text-white" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white truncate text-lg leading-tight mb-1 group-hover:text-slate-100 transition-colors">
                                {app.name}
                            </h3>
                            {getStatusBadge()}
                            {isExcluded && (
                                <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">EXCLUDED</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-400 truncate max-w-[140px]">{app.developerName || "Unknown Dev"}</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                            <div className="px-1.5 py-0.5 rounded-md bg-slate-900/40 border border-white/5 text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                v{app.version}
                            </div>
                        </div>
                    </div>

                    {/* Meta / Controls */}
                    <div className="flex flex-col items-end gap-2 pl-2">
                        {app.size ? (
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-950/30 px-1.5 py-0.5 rounded">
                                {(app.size / 1024 / 1024).toFixed(1)}MB
                            </span>
                        ) : (
                            <span className="h-5"></span>
                        )}
                        <div className={`flex items-center gap-1 text-xs font-medium transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <span style={{ color: tint }}>Edit</span>
                            <Edit2 size={12} style={{ color: tint }} />
                        </div>
                    </div>
                </div>
                
                {/* Expanded Editor */}
                {isEditing && (
                    <div 
                        className="border-t border-slate-800 p-4 bg-slate-900/50" 
                        style={{ borderTopColor: `${tint}20` }}
                    >
                        <AppEditor 
                            app={app} 
                            onUpdate={onUpdate} 
                            onDelete={onDelete} 
                            onClose={onCloseEdit} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
});

AppCard.displayName = 'AppCard';