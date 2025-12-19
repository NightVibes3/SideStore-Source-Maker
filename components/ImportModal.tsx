import React, { useState } from 'react';
import { Repo, DEFAULT_REPO } from '../types';
import { X, Globe, Code, Loader2, AlertCircle, FileJson, ArrowRight, CheckCircle2, Smartphone, Layers, Package } from 'lucide-react';

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

    // Robust string cleaner that removes BOM and weird whitespace
    const cleanString = (str: string) => str.replace(/^\uFEFF/, '').trim();

    // --- Cydia/APT Parsing Logic ---
    const handleCydiaImport = async (baseUrl: string) => {
        // Ensure trailing slash for relative path resolution
        const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        
        let name = "Imported Repo";
        let description = "";
        let iconURL = "";
        let website = url;

        // 1. Try fetching Release file for metadata (Optional)
        try {
            const releaseRes = await fetch(`${url}Release`);
            if (releaseRes.ok) {
                const text = await releaseRes.text();
                const info: any = {};
                text.split('\n').forEach(line => {
                    const [k, ...v] = line.split(':');
                    if (k && v) info[k.trim().toLowerCase()] = v.join(':').trim();
                });
                name = info.origin || info.label || name;
                description = info.description || description;
            }
        } catch (e) {
            console.log("Release file fetch failed, skipping metadata");
        }

        // 2. Fetch Packages (Try plaintext, then GZ)
        let packagesText = "";
        
        try {
            // Try plaintext first
            const res = await fetch(`${url}Packages`);
            if (res.ok) {
                packagesText = await res.text();
            } else {
                throw new Error("No plaintext");
            }
        } catch (e) {
            // Try Packages.gz using DecompressionStream
            try {
                const res = await fetch(`${url}Packages.gz`);
                if (res.ok && res.body) {
                    try {
                        const ds = new DecompressionStream('gzip');
                        const decompressed = res.body.pipeThrough(ds);
                        packagesText = await new Response(decompressed).text();
                    } catch (streamErr) {
                         // Fallback for older browsers or non-stream bodies
                        console.error("Decompression failed", streamErr);
                        throw new Error("Browser does not support GZIP decompression stream.");
                    }
                } else {
                    throw new Error("Packages file not found");
                }
            } catch (gzErr) {
                console.error(gzErr);
                throw new Error(`Failed to fetch packages from ${url}. The repo might block browser access (CORS).`);
            }
        }

        if (!packagesText) throw new Error("Could not retrieve package list.");

        // 3. Parse Packages (Debian Control Format)
        const apps: any[] = [];
        // Blocks are separated by blank lines
        const blocks = packagesText.split(/\n\n+/);
        
        for (const block of blocks) {
            if (!block.trim()) continue;
            
            const info: any = {};
            // Parse Key: Value
            block.split('\n').forEach(line => {
                 const match = line.match(/^([a-zA-Z0-9-]+):\s*(.+)$/);
                 if (match) info[match[1].toLowerCase()] = match[2];
            });

            // "Filename" is required for a valid download
            if (info.package && info.filename) {
                // Resolve URL: It is usually relative to the repo root
                const dlUrl = new URL(info.filename, url).toString();
                // Resolve Icon: Cydia repos use 'Icon', sometimes valid URL, sometimes relative
                let icon = "";
                if (info.icon) {
                     try {
                        icon = new URL(info.icon, url).toString();
                     } catch(e) { icon = info.icon; } // Keep as is if parsing fails
                }
                
                apps.push({
                    id: info.package,
                    name: info.name || info.package,
                    bundleIdentifier: info.package,
                    developerName: info.author || info.maintainer || "Unknown",
                    version: info.version || "1.0",
                    versionDate: new Date().toISOString().split('T')[0],
                    versionDescription: "Imported from Cydia Repo",
                    downloadURL: dlUrl,
                    localizedDescription: info.description || "No description provided.",
                    iconURL: icon,
                    tintColor: "#3b82f6",
                    size: 0,
                    screenshotURLs: []
                });
            }
        }

        if (apps.length === 0) throw new Error("Parsed repo but found no valid packages.");

        return {
            name,
            subtitle: "Imported Cydia Repository",
            description,
            iconURL,
            headerImageURL: "",
            website,
            tintColor: "#3b82f6",
            apps
        };
    };

    const processParsing = (data: any) => {
        try {
            // 1. Unwrap "source" if it exists (common wrapper in TrollApps)
            const source = (data.source && typeof data.source === 'object' && !Array.isArray(data.source)) 
                ? data.source 
                : data;

            // 2. Validate essential fields
            if (!source || typeof source !== 'object') {
                throw new Error("Data must be a JSON object.");
            }

            // 3. Map Repo Fields - PRIORITIZE USER DATA
            const newRepo: Repo = {
                name: source.name || "Imported Repo",
                subtitle: source.subtitle !== undefined ? String(source.subtitle) : DEFAULT_REPO.subtitle,
                description: source.description !== undefined ? String(source.description) : DEFAULT_REPO.description,
                
                // Images: Use user's value if present (even if empty string), fallback only if undefined
                iconURL: source.iconURL !== undefined ? String(source.iconURL) : (source.icon || DEFAULT_REPO.iconURL),
                headerImageURL: source.headerImageURL !== undefined ? String(source.headerImageURL) : (source.headerImage || ""),
                
                website: source.website !== undefined ? String(source.website) : "",
                tintColor: source.tintColor || DEFAULT_REPO.tintColor,
                
                apps: []
            };

            // 4. Map Apps
            const rawApps = source.apps || source.packages || [];
            if (!Array.isArray(rawApps)) {
                console.warn("No apps array found");
            }

            if (Array.isArray(rawApps)) {
                newRepo.apps = rawApps.map((app: any, index: number) => {
                    const generateId = () => Math.random().toString(36).substring(2, 9);
                    return {
                        id: app.id ? String(app.id) : generateId(),
                        name: app.name || `App ${index + 1}`,
                        bundleIdentifier: app.bundleIdentifier || app.bundleID || app.identifier || "com.example.app",
                        developerName: app.developerName || app.developer || "Unknown",
                        version: app.version ? String(app.version) : "1.0",
                        versionDate: app.versionDate || new Date().toISOString().split('T')[0],
                        versionDescription: app.versionDescription || app.changelog || "",
                        downloadURL: app.downloadURL || app.download || "",
                        localizedDescription: app.localizedDescription || app.description || "",
                        iconURL: app.iconURL || app.icon || "",
                        tintColor: app.tintColor || newRepo.tintColor,
                        size: app.size ? Number(app.size) : 0,
                        screenshotURLs: Array.isArray(app.screenshotURLs) ? app.screenshotURLs.map(String) : []
                    };
                });
            }

            // 5. Set Preview (Don't auto close)
            setPreviewRepo(newRepo);

        } catch (err: any) {
            console.error("Import processing failed:", err);
            throw new Error(err.message || "Failed to parse repository data.");
        }
    };

    const handleParse = async () => {
        setLoading(true);
        setError(null);

        try {
            if (mode === 'url') {
                const url = urlInput.trim();
                if (!url) throw new Error("Please enter a URL.");

                // Check for Cydia/APT Repo characteristics (No .json extension)
                const isJson = url.endsWith('.json');
                
                // If explicitly JSON or GitHub Blob (convert to raw)
                if (isJson || url.includes('github.com')) {
                     let fetchUrl = url;
                    if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
                        fetchUrl = fetchUrl.replace('/blob/', '/raw/');
                    }

                    const res = await fetch(fetchUrl, { cache: 'no-store' });
                    if (!res.ok) throw new Error(`Network Error: ${res.status}`);
                    const jsonString = await res.text();
                    processParsing(JSON.parse(cleanString(jsonString)));
                } else {
                    // Attempt Cydia Import
                    const cydiaRepo = await handleCydiaImport(url);
                    setPreviewRepo(cydiaRepo);
                }

            } else {
                const cleaned = cleanString(jsonInput);
                if (!cleaned) throw new Error("Input is empty.");
                let parsedData;
                try {
                    parsedData = JSON.parse(cleaned);
                } catch (jsonErr: any) {
                    const snippet = cleaned.substring(0, 50);
                    throw new Error(`Invalid JSON syntax. Starts with: '${snippet}...'`);
                }
                processParsing(parsedData);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmImport = () => {
        if (previewRepo) {
            onImport(previewRepo);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-2 text-white">
                        <FileJson className="text-indigo-500" />
                        <h2 className="font-bold text-lg">Import Repository</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {!previewRepo ? (
                    <>
                        <div className="p-2 bg-slate-900 border-b border-slate-800 flex gap-2">
                            <button 
                                onClick={() => { setMode('url'); setError(null); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'url' ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
                            >
                                <Globe size={16} /> From URL
                            </button>
                            <button 
                                onClick={() => { setMode('json'); setError(null); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'json' ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/50' : 'text-slate-400 hover:bg-slate-800'}`}
                            >
                                <Code size={16} /> Paste JSON
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {mode === 'url' ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-400">
                                        Enter a direct URL to a <code>repo.json</code> <strong>OR</strong> a Cydia/APT Repository URL.
                                    </p>
                                    <input 
                                        type="url" 
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://repo.chariz.com/"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                        autoFocus
                                    />
                                    <div className="text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-800/50">
                                        <p className="font-bold mb-1">Supported Formats:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            <li>Standard JSON (AltStore/TrollApps)</li>
                                            <li>Cydia/Sileo Repos (Parses Packages.gz)</li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-400">
                                        Paste the raw JSON content directly below.
                                    </p>
                                    <textarea 
                                        value={jsonInput}
                                        onChange={(e) => setJsonInput(e.target.value)}
                                        placeholder='{ "name": "My Repo", "apps": [...] }'
                                        className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex gap-3 items-start animate-in fade-in">
                                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-red-200 font-bold mb-1">Import Failed</p>
                                        <p className="text-xs text-red-200/80 leading-relaxed break-words">{error}</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 pt-4 border-t border-slate-800">
                                <button
                                    onClick={handleParse}
                                    disabled={loading}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-95"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                                    {loading ? 'Processing...' : 'Review & Import'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    // Preview Step
                    <div className="p-6 bg-slate-900 space-y-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 mb-4 overflow-hidden shadow-lg border border-slate-700">
                                {previewRepo.iconURL ? (
                                    <img src={previewRepo.iconURL} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = 'https://placehold.co/128x128/png'} />
                                ) : (
                                    <Package size={32} className="text-slate-600" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{previewRepo.name}</h3>
                            <p className="text-slate-400 text-sm">{previewRepo.subtitle}</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800 grid grid-cols-2 gap-4">
                            <div className="flex flex-col items-center p-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Apps Found</span>
                                <span className="text-lg font-bold text-white flex items-center gap-2">
                                    <Layers size={18} className="text-indigo-400" />
                                    {previewRepo.apps.length}
                                </span>
                            </div>
                            <div className="flex flex-col items-center p-2 border-l border-slate-700">
                                <span className="text-xs font-bold text-slate-500 uppercase">Tint Color</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: previewRepo.tintColor }}></div>
                                    <span className="text-sm font-mono text-slate-300">{previewRepo.tintColor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button 
                                onClick={() => setPreviewRepo(null)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={confirmImport}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                Import Now
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};