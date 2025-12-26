import React, { useState } from 'react';
import { AppItem, validateURL } from '../types';
import { InputGroup } from './InputGroup';
import { Image } from './Image';
import { Trash2, X, Image as ImageIcon, FileSearch, AlertTriangle } from 'lucide-react';

interface AppEditorProps {
    app: AppItem;
    onUpdate: (id: string, updatedApp: AppItem) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    onInspectIPA: () => void;
}

export const AppEditor: React.FC<AppEditorProps> = ({ app, onUpdate, onDelete, onClose, onInspectIPA }) => {
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const handleChange = (field: keyof AppItem, value: any) => {
        onUpdate(app.id, { ...app, [field]: value });
    };

    const handleScreenshotChange = (sIndex: number, value: string) => {
        const newScreenshots = [...app.screenshotURLs];
        newScreenshots[sIndex] = value;
        handleChange('screenshotURLs', newScreenshots);
    };

    const addScreenshot = () => {
        handleChange('screenshotURLs', [...app.screenshotURLs, '']);
    };

    const removeScreenshot = (sIndex: number) => {
        const newScreenshots = app.screenshotURLs.filter((_, i) => i !== sIndex);
        handleChange('screenshotURLs', newScreenshots);
    };

    const handleDelete = () => {
        if (deleteConfirm) {
            onDelete(app.id);
        } else {
            setDeleteConfirm(true);
            setTimeout(() => setDeleteConfirm(false), 3000); // Reset confirm after 3s
        }
    };

    const iconError = validateURL(app.iconURL, 'image');
    const downloadError = validateURL(app.downloadURL, 'file');

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-xl relative animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden border border-slate-600">
                        <Image 
                            src={app.iconURL}
                            className="w-full h-full object-cover"
                            fallback={
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-slate-500" />
                                </div>
                            }
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">Editing App</h3>
                        <p className="text-xs text-slate-400">{app.name || "Untitled"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:bg-slate-700 rounded-full transition-colors"
                        title="Close Editor"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="App Name" value={app.name} onChange={(v) => handleChange('name', v)} />
                <InputGroup label="Category" value={app.category || "Utilities"} onChange={(v) => handleChange('category', v)} placeholder="Games, Tools, etc." />
                
                <InputGroup 
                    label="Bundle ID" 
                    value={app.bundleIdentifier} 
                    onChange={(v) => handleChange('bundleIdentifier', v)} 
                    placeholder="com.example.app" 
                    rightElement={
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold" title="Manual Bundle IDs often mismatch.">
                                <AlertTriangle size={12} />
                                <span className="hidden sm:inline">Verify ID</span>
                            </div>
                            <button 
                                onClick={onInspectIPA}
                                className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded text-white flex items-center gap-1 transition-colors"
                                title="Fix Bundle ID Mismatch by inspecting IPA"
                            >
                                <FileSearch size={10} /> Fix from IPA
                            </button>
                        </div>
                    }
                    helperText="Warning: Bundle IDs often mismatch. Use 'Fix from IPA' to get the exact ID from the file."
                />
                <InputGroup label="Developer" value={app.developerName} onChange={(v) => handleChange('developerName', v)} />

                <InputGroup label="Version" value={app.version} onChange={(v) => handleChange('version', v)} className="md:col-span-1" />
                <InputGroup label="Version Date" type="date" value={app.versionDate} onChange={(v) => handleChange('versionDate', v)} className="md:col-span-1" />

                <div className="md:col-span-2">
                    <InputGroup label="Size (Bytes)" type="number" value={app.size || 0} onChange={(v) => handleChange('size', parseInt(v) || 0)} />
                </div>

                <div className="md:col-span-2">
                    <InputGroup 
                        label="Download URL (IPA)" 
                        type="url" 
                        value={app.downloadURL} 
                        onChange={(v) => handleChange('downloadURL', v)} 
                        placeholder="https://example.com/app.ipa"
                        error={downloadError}
                    />
                </div>
                
                <div className="md:col-span-2">
                    <InputGroup 
                        label="Icon URL" 
                        type="url" 
                        value={app.iconURL} 
                        onChange={(v) => handleChange('iconURL', v)} 
                        placeholder="https://example.com/icon.png" 
                        error={iconError}
                    />
                </div>
                
                <InputGroup label="Short Description" type="textarea" value={app.localizedDescription} onChange={(v) => handleChange('localizedDescription', v)} className="md:col-span-2" />
                <InputGroup label="Version Description" type="textarea" value={app.versionDescription} onChange={(v) => handleChange('versionDescription', v)} className="md:col-span-2" />
                
                <InputGroup label="Tint Color" type="color" value={app.tintColor || "#000000"} onChange={(v) => handleChange('tintColor', v)} />
            </div>

            <div className="mt-8 border-t border-slate-700 pt-6">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Screenshots</label>
                    <button onClick={addScreenshot} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md text-white transition-colors">
                        + Add URL
                    </button>
                </div>
                <div className="space-y-3">
                    {app.screenshotURLs.map((url, i) => {
                        const screenError = validateURL(url, 'image');
                        return (
                            <div key={i} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <input
                                        type="url"
                                        className={`w-full bg-slate-900 border rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 transition-all ${screenError ? 'border-red-500/50 focus:ring-red-500/50' : 'border-slate-700 focus:ring-blue-600'}`}
                                        value={url}
                                        onChange={(e) => handleScreenshotChange(i, e.target.value)}
                                        placeholder="https://example.com/screen.png"
                                    />
                                    {screenError && <p className="text-[10px] text-red-400 mt-1">{screenError}</p>}
                                </div>
                                <button onClick={() => removeScreenshot(i)} className="p-2 mt-0.5 text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                    {app.screenshotURLs.length === 0 && (
                        <p className="text-sm text-slate-600 italic">No screenshots added.</p>
                    )}
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700">
                <button 
                    onClick={handleDelete}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        deleteConfirm 
                        ? 'bg-red-600 hover:bg-red-500 text-white animate-in pulse' 
                        : 'bg-slate-700/50 hover:bg-red-900/30 text-slate-400 hover:text-red-400'
                    }`}
                >
                    <Trash2 size={18} />
                    {deleteConfirm ? "Are you sure? Tap again to delete" : "Delete App"}
                </button>
            </div>
        </div>
    );
};