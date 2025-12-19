import React from 'react';
import { DeviceProfile } from '../types';
import { X, Smartphone, Tablet, Check, Cpu, Hash } from 'lucide-react';

interface DeviceManagerProps {
    device: DeviceProfile;
    onChange: (device: DeviceProfile) => void;
    onClose: () => void;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({ device, onChange, onClose }) => {
    const models = [
        { id: 'iPhone 16 Pro', name: 'iPhone 16 Pro', type: 'phone', features: 'Dynamic Island, Titanium Frame' },
        { id: 'iPhone 15', name: 'iPhone 15', type: 'phone', features: 'Dynamic Island, Aluminum' },
        { id: 'iPhone SE', name: 'iPhone SE (3rd Gen)', type: 'phone', features: 'Touch ID, Classic Bezel' },
        { id: 'iPad Pro', name: 'iPad Pro 13"', type: 'tablet', features: 'Ultra Retina XDR, M4' },
    ];

    const versions = ['18.2', '18.1', '18.0', '17.6', '17.0', '16.5', '15.0'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <Smartphone className="text-blue-500" /> Device Configuration
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-8 overflow-y-auto">
                    
                    {/* Model Selection */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Cpu size={16} className="text-blue-400" />
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Select Model</label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {models.map(m => {
                                const isSelected = device.model === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => onChange({ ...device, model: m.id as any })}
                                        className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
                                            isSelected
                                            ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' 
                                            : 'bg-slate-950 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2 relative z-10">
                                            {m.type === 'tablet' ? (
                                                <Tablet size={24} className={isSelected ? 'text-blue-400' : 'text-slate-600'} />
                                            ) : (
                                                <Smartphone size={24} className={isSelected ? 'text-blue-400' : 'text-slate-600'} />
                                            )}
                                            {isSelected && <Check size={18} className="text-blue-500" />}
                                        </div>
                                        <div className={`font-bold text-sm mb-1 relative z-10 ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                            {m.name}
                                        </div>
                                        <div className="text-[10px] text-slate-500 relative z-10">
                                            {m.features}
                                        </div>
                                        {/* Glow effect */}
                                        {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none"></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* iOS Version Selection */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Hash size={16} className="text-indigo-400" />
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">System Version</label>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                            <div className="flex flex-wrap gap-2">
                                {versions.map(v => {
                                    const isSelected = device.iosVersion === v;
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => onChange({ ...device, iosVersion: v })}
                                            className={`px-4 py-2 rounded-lg text-sm font-mono font-medium border transition-all ${
                                                isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/50' 
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                            }`}
                                        >
                                            iOS {v}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    placeholder="Custom Version (e.g. 14.3)"
                                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none w-full"
                                    value={versions.includes(device.iosVersion) ? '' : device.iosVersion}
                                    onChange={(e) => onChange({ ...device, iosVersion: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                    <button 
                        onClick={onClose} 
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    >
                        Apply Changes
                    </button>
                </div>
            </div>
        </div>
    );
};