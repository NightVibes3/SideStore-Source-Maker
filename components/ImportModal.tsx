import React, { useState } from 'react';
import { Repo, AppItem } from '../types';
import { X, Loader2, FileJson, Package } from 'lucide-react';

interface ImportModalProps {
    onImport: (repo: Repo) => void;
    onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
    const [mode, setMode] = useState<'url' | 'json'>('url');
    const [urlInput, setUrlInput] = useState('');
    const [jsonInput, setJsonInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewRepo, setPreviewRepo] = useState<Repo | null>(null);

    const cleanString = (str: string) => str.replace(/^\uFEFF/, '').trim();

    const processParsing = (data: any) => {
        try {
            // Support both AltStore wrapped structure { source: ... } and direct Repo structure
            const source = data.source || data;
            if (!source || typeof source !== 'object') throw new Error("Invalid repository format.");

            const newRepo: Repo = {
                name: source.name || "Imported Repo",
                subtitle: source.subtitle || "",
                description: source.description || "",
                iconURL: source.iconURL || source.icon || source.icon_url || "",
                headerImageURL: source.headerImageURL || source.headerImage || "",
                website: source.website || "",
                tintColor: source.tintColor || "#3b82f6",
                apps: []
            };

            const rawApps = source.apps || source.packages || [];
            if (Array.isArray(rawApps)) {
                newRepo.apps = rawApps.map((app: any, index: number): AppItem => ({
                    // Keep existing ID if present to match the user's preferred format
                    id: String(app.id || Math.random().toString(36).substring(7)),
                    name: app.name || `App ${index + 1}`,
                    bundleIdentifier: app.bundleIdentifier || app.bundleID || app.identifier || "",
                    developerName: app.developerName || app.developer || "Unknown",
                    version: String(app.version || "1.0"),
                    versionDate: app.versionDate || new Date().toISOString().split('T')[0],
                    versionDescription: app.versionDescription || "",
                    downloadURL: app.downloadURL || app.download || "",
                    localizedDescription: app.localizedDescription || app.description || "",
                    iconURL: app.iconURL || app.icon || app.icon_url || app.app_icon || "",
                    tintColor: app.tintColor || newRepo.tintColor,
                    size: Number(app.size || 0),
                    screenshotURLs: Array.isArray(app.screenshotURLs) ? app.screenshotURLs.map(String) : [],
                    compatibilityStatus: 'unknown'
                }));
            }
            setPreviewRepo(newRepo);
        } catch (err: any) {
            throw new Error(err.message || "Failed to parse JSON.");
        }
    };

    const handleParse = async () => {
        setLoading(true);
        setError(null);
        try {
            if (mode === 'url') {
                let fetchUrl = urlInput.trim();
                // Helper to handle GitHub blob links automatically
                if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
                    fetchUrl = fetchUrl.replace('/blob/', '/raw/');
                }
                const res = await fetch(fetchUrl);
                if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
                processParsing(JSON.parse(cleanString(await res.text())));
            } else {
                processParsing(JSON.parse(cleanString(jsonInput)));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h2 className="font-bold text-white flex items-center gap-2"><FileJson size={20} /> Import Repository</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
                </div>

                {!previewRepo ? (
                    <div className="p-6 space-y-4">
                        <div className="flex bg-slate-950 p-1 rounded-lg">
                            <button onClick={() => setMode('url')} className={`flex-1 py-2 rounded text-sm font-medium ${mode === 'url' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>URL</button>
                            <button onClick={() => setMode('json')} className={`flex-1 py-2 rounded text-sm font-medium ${mode === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>JSON</button>
                        </div>
                        {mode === 'url' ? (
                            <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white" />
                        ) : (
                            <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder='{"name": "..."}' className="w-full h-40 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-white" />
                        )}
                        {error && <p className="text-red-400 text-xs">{error}</p>}
                        <button onClick={handleParse} disabled={loading} className="w-full py-3 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 text-white">
                            {loading ? <Loader2 className="animate-spin" /> : "Review Import"}
                        </button>
                    </div>
                ) : (
                    <div className="p-6 space-y-6 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-slate-800 mx-auto overflow-hidden border border-slate-700">
                            {previewRepo.iconURL ? <img src={previewRepo.iconURL} className="w-full h-full object-cover" /> : <Package size={32} className="m-auto mt-6 text-slate-600" />}
                        </div>
                        <h3 className="text-xl font-bold text-white">{previewRepo.name}</h3>
                        <div className="bg-slate-800 p-4 rounded-xl flex justify-around">
                            <div className="text-center"><div className="text-xs text-slate-500 uppercase">Apps</div><div className="font-bold text-white">{previewRepo.apps.length}</div></div>
                            <div className="text-center"><div className="text-xs text-slate-500 uppercase">Tint</div><div className="w-4 h-4 rounded-full mx-auto mt-1" style={{ backgroundColor: previewRepo.tintColor }}></div></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setPreviewRepo(null)} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold text-white">Back</button>
                            <button onClick={() => { onImport(previewRepo); onClose(); }} className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold text-white">Import Now</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};