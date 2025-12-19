
import React from 'react';
import { X, Twitter, Github, Coffee, ChevronRight } from 'lucide-react';

interface AboutModalProps {
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
    // Convert GitHub blob URL to raw for direct image display
    const profileImageUrl = "https://github.com/NightVibes3/Test/raw/main/super_resolution_20251210210218561.jpeg";

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black animate-in fade-in duration-200 sm:items-center sm:bg-black/90 sm:p-4">
            <div className="w-full h-full bg-black overflow-y-auto flex flex-col relative sm:w-[400px] sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] sm:border sm:border-slate-900 sm:shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                
                {/* Mobile Header */}
                <div className="sticky top-0 z-10 w-full px-6 py-4 flex justify-center items-center bg-black/80 backdrop-blur-md border-b border-white/5">
                    <h2 className="text-white font-bold text-lg">About</h2>
                    <button 
                        onClick={onClose} 
                        className="absolute right-6 p-1 text-slate-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="px-5 py-8 flex flex-col items-center">
                    {/* Profile Icon/Image - Matching the circular-squircle look */}
                    <div className="w-28 h-28 rounded-[32%] overflow-hidden mb-12 shadow-2xl ring-1 ring-white/10 mt-4">
                        <img 
                            src={profileImageUrl} 
                            alt="ZYN" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = "https://placehold.co/200x200?text=ZYN";
                            }}
                        />
                    </div>

                    <div className="w-full space-y-9">
                        {/* Software Info Section */}
                        <div className="space-y-2">
                            <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-tight px-4 mb-2">SOFTWARE INFORMATION</h3>
                            <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-white/5 mx-1">
                                <div className="flex justify-between items-center px-4 py-3.5">
                                    <span className="text-slate-200 text-[17px]">Name</span>
                                    <span className="text-slate-500 text-[17px]">SideStore Source Maker</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-3.5">
                                    <span className="text-slate-200 text-[17px]">Version</span>
                                    <span className="text-slate-500 text-[17px]">1.0</span>
                                </div>
                            </div>
                        </div>

                        {/* Creator Section */}
                        <div className="space-y-2">
                            <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-tight px-4 mb-2">CREATOR</h3>
                            <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden divide-y divide-white/5 mx-1">
                                <a 
                                    href="https://x.com/xboxsignout999_?s=21&t=k6RkcjRI6uMwGvJ_q6XC7A" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#00acee] flex items-center justify-center text-white shrink-0">
                                        <Twitter size={18} fill="currentColor" strokeWidth={0} />
                                    </div>
                                    <span className="text-slate-200 text-[17px] flex-1">Twitter</span>
                                    <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                </a>
                                <a 
                                    href="https://github.com/NightVibes3" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#333] flex items-center justify-center text-white shrink-0">
                                        <Github size={18} />
                                    </div>
                                    <span className="text-slate-200 text-[17px] flex-1">GitHub</span>
                                    <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                </a>
                                <a 
                                    href="https://buymeacoffee.com/ZYN3" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#ff5e5b] flex items-center justify-center text-white shrink-0">
                                        <Coffee size={18} />
                                    </div>
                                    <span className="text-slate-200 text-[17px] flex-1">Buy me a coffee</span>
                                    <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Footer Bio */}
                    <div className="mt-16 mb-8 text-center px-6 max-w-[320px]">
                        <p className="text-[#8e8e93] text-[15px] leading-relaxed mb-2">
                            My name is ZYN, and this is a secure client-side SideStore Source Maker built with privacy in mind.
                        </p>
                    </div>
                </div>
                
                {/* Home Indicator Spacer (Mobile) */}
                <div className="h-8 shrink-0 sm:hidden"></div>
            </div>
        </div>
    );
};
