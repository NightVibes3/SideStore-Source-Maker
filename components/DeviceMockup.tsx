import React from 'react';
import { Repo, AppItem, DeviceProfile } from '../types';
import { Image } from './Image';
import { Wifi, Battery, Signal, Settings, Smartphone, ChevronLeft } from 'lucide-react';

interface DeviceMockupProps {
    device: DeviceProfile;
    repo: Repo;
    previewApp?: AppItem;
    onConfigure?: () => void;
    onGoBack?: () => void;
}

export const DeviceMockup: React.FC<DeviceMockupProps> = ({ device, repo, previewApp, onConfigure, onGoBack }) => {
    
    // Simple, clean frame styles closer to the original design
    const getFrameStyles = () => {
        switch (device.model) {
            case 'iPhone SE':
                return "aspect-[9/16] max-w-[320px] rounded-[2rem] border-x-[12px] border-y-[60px]";
            case 'iPad Pro':
                return "aspect-[3/4] max-w-[500px] rounded-[1.5rem] border-[12px]";
            default: // iPhone 16/15
                return "aspect-[9/19.5] max-w-[340px] rounded-[3.5rem] border-[12px]";
        }
    };

    const hasDynamicIsland = device.model.includes('16') || device.model.includes('15');
    const hasHomeButton = device.model === 'iPhone SE';

    return (
        <div className="relative flex flex-col items-center justify-center h-full p-8 w-full transition-all">
            
            {/* Main Device Frame - Single container with border and overflow hidden */}
            <div className={`relative bg-slate-50 dark:bg-slate-950 border-slate-900 shadow-2xl overflow-hidden flex flex-col z-10 box-border ${getFrameStyles()}`}>
                
                {/* Dynamic Island (Floating Pill) */}
                {hasDynamicIsland && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 h-[35px] w-[120px] bg-black rounded-full z-50 flex items-center justify-center pointer-events-none shadow-sm">
                        {/* Camera/Sensor indicators */}
                        <div className="absolute right-3.5 w-3 h-3 rounded-full bg-slate-800/40 blur-[0.5px]"></div>
                        <div className="absolute left-4 w-1.5 h-1.5 rounded-full bg-slate-800/30 blur-[0.5px]"></div>
                    </div>
                )}

                {/* Floating Back Button on Screen */}
                {onGoBack && (
                    <button 
                        onClick={onGoBack}
                        className="absolute top-12 left-6 z-30 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:bg-black/60 transition-colors border border-white/10"
                        title="Back"
                    >
                        <ChevronLeft size={20} className="-ml-0.5" />
                    </button>
                )}
                
                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar bg-slate-950 text-slate-200">
                    
                    {/* Status Bar */}
                    <div className={`flex justify-between items-center px-7 pt-3.5 pb-1 text-[11px] font-bold text-white z-20 relative select-none ${hasDynamicIsland ? 'mt-1' : ''}`}>
                        <span>9:41</span>
                        <div className="flex gap-1.5 items-center">
                            <Signal size={13} className="fill-current" />
                            <Wifi size={13} />
                            <Battery size={18} />
                        </div>
                    </div>

                    {/* Header Image */}
                    <div className="relative h-48 w-full group">
                        <Image 
                            src={repo.headerImageURL} 
                            className="w-full h-full object-cover" 
                            alt="Header" 
                            fallback={
                                <div className="w-full h-full bg-blue-600/20 flex items-center justify-center text-blue-500 text-xs">Header Image</div>
                            }
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                        
                        {/* Repo Icon */}
                        <div className="absolute -bottom-8 left-6 p-1 bg-slate-950 rounded-[22%]">
                            <div className="w-20 h-20 rounded-[20%] overflow-hidden bg-slate-800 border border-slate-800/50">
                                <Image 
                                    src={repo.iconURL} 
                                    className="w-full h-full object-cover" 
                                    fallback={
                                        <div className="w-full h-full flex items-center justify-center text-slate-600">Icon</div>
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Repo Info */}
                    <div className="mt-10 px-6 space-y-1">
                        <h2 className="text-2xl font-bold text-white">{repo.name || "Repo Name"}</h2>
                        <p className="text-sm text-slate-400">{repo.subtitle || "Subtitle"}</p>
                        <p className="text-sm text-slate-500 mt-4 leading-relaxed line-clamp-3">
                            {repo.description || "Description..."}
                        </p>
                    </div>

                    {/* Apps List */}
                    <div className="mt-8 px-4 pb-12">
                        <h3 className="text-lg font-bold mb-4 px-2 text-white">Latest Apps</h3>
                        <div className="space-y-3">
                            {repo.apps.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">No apps available</div>
                            ) : (
                                repo.apps.map((app, i) => (
                                    <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${previewApp === app ? 'bg-blue-900/20 ring-1 ring-blue-500/50' : 'bg-slate-900'}`}>
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0">
                                            <Image src={app.iconURL} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white truncate">{app.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{app.developerName}</div>
                                        </div>
                                        <button 
                                            className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600/20 text-blue-400 uppercase tracking-wide"
                                            style={{ color: repo.tintColor }}
                                        >
                                            Get
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* Home Indicator / Button */}
                {hasHomeButton ? (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800/50 z-20 pointer-events-none"></div>
                ) : (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-20 pointer-events-none"></div>
                )}
            </div>
            
            {/* Bottom Controls - Moved here to prevent stacking on top */}
            <div className="mt-8 text-center">
                 <button 
                    onClick={onConfigure}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-xs font-medium text-slate-400 hover:text-white transition-all group shadow-lg"
                 >
                    <Smartphone size={14} className="group-hover:text-blue-400 transition-colors" />
                    <span>{device.model} • iOS {device.iosVersion}</span>
                    <div className="w-px h-3 bg-slate-700 mx-1"></div>
                    <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
            </div>
        </div>
    );
};