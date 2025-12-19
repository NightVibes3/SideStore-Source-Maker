
import React, { useState, useEffect } from 'react';
import { Repo, Deployment, processRepoForExport } from '../types';
import { Cloud, Check, Copy, AlertCircle, Loader2, Server, Github, Globe, Lock, X, Filter, Layers, History, ShieldAlert, BookOpen, AlertTriangle, Edit, RefreshCw, ChevronRight } from 'lucide-react';

interface PublishManagerProps {
    repo: Repo;
    onClose: () => void;
    initialConfig?: { deduplicate: boolean, filterIncompatible: boolean };
}

export const PublishManager: React.FC<PublishManagerProps> = ({ repo, onClose, initialConfig }) => {
    const [token, setToken] = useState('');
    const [deployType, setDeployType] = useState<'public' | 'secret'>('public');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [history, setHistory] = useState<Deployment[]>([]);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [showUpdateGuide, setShowUpdateGuide] = useState(false);
    
    const [mode, setMode] = useState<'create' | 'update'>('create');
    const [targetGistId, setTargetGistId] = useState('');

    const [exportConfig, setExportConfig] = useState(initialConfig || {
        deduplicate: true, 
        filterIncompatible: true 
    });

    useEffect(() => {
        const savedToken = localStorage.getItem('gh_token');
        if (savedToken) setToken(savedToken);

        const savedHistory = localStorage.getItem('deploy_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
    }, []);

    const extractGistId = (input: string) => {
        const clean = input.trim();
        const hexMatch = clean.match(/[0-9a-f]{32}/i);
        if (hexMatch) return hexMatch[0];

        if (clean.includes('/')) {
            const parts = clean.split('/').filter(p => p.length > 0);
            const rawIndex = parts.indexOf('raw');
            if (rawIndex > 0) return parts[rawIndex - 1];
            const last = parts[parts.length - 1];
            if (last.includes('.') && parts.length > 1) return parts[parts.length - 2];
            return last;
        }
        return clean;
    };

    const processDeploy = async (isUpdate: boolean) => {
        if (!token) {
            setError("GitHub Personal Access Token is required.");
            return;
        }

        const gistId = isUpdate ? extractGistId(targetGistId) : null;
        if (isUpdate && !gistId) {
            setError("Could not extract a valid Gist ID from the input.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        localStorage.setItem('gh_token', token);

        const finalRepo = processRepoForExport(repo, exportConfig);
        const endpoint = isUpdate 
            ? `https://api.github.com/gists/${gistId}`
            : 'https://api.github.com/gists';

        try {
            const response = await fetch(endpoint, {
                method: isUpdate ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: `SideStore Repo: ${finalRepo.name} (Generated via SideStore Source Maker)`,
                    public: !isUpdate ? (deployType === 'public') : undefined,
                    files: {
                        'repo.json': {
                            content: JSON.stringify(finalRepo, null, 4)
                        }
                    }
                })
            });

            if (!response.ok) {
                if (response.status === 404) throw new Error("Gist not found. Check ID and Token permissions.");
                if (response.status === 401) throw new Error("Invalid Token or expired.");
                throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const rawUrl = data.files['repo.json'].raw_url;

            const newDeployment: Deployment = {
                id: data.id,
                url: rawUrl,
                createdAt: new Date().toISOString(),
                type: data.public ? 'public' : 'secret',
                name: finalRepo.name
            };

            const filteredHistory = history.filter(h => h.id !== data.id);
            const newHistory = [newDeployment, ...filteredHistory];
            setHistory(newHistory);
            localStorage.setItem('deploy_history', JSON.stringify(newHistory));

            setSuccessMsg(isUpdate ? "Repo updated successfully!" : "New server deployed successfully!");
            if (!isUpdate) setTargetGistId(data.id);
        } catch (err: any) {
            setError(err.message || "Operation failed.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    const copyJsonToClipboard = () => {
        const finalRepo = processRepoForExport(repo, exportConfig);
        navigator.clipboard.writeText(JSON.stringify(finalRepo, null, 4));
        setCopiedUrl('json');
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    const debugExtractedId = mode === 'update' && targetGistId ? extractGistId(targetGistId) : null;

    if (showUpdateGuide) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                        <div className="flex items-center gap-2 text-white">
                            <BookOpen className="text-amber-500" />
                            <h2 className="font-bold text-lg">Manual Update Guide</h2>
                        </div>
                        <button onClick={() => setShowUpdateGuide(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6">
                        <div className="bg-amber-900/20 border border-amber-900/50 p-4 rounded-lg flex gap-3">
                            <AlertTriangle className="text-amber-500 shrink-0" />
                            <div>
                                <h3 className="text-amber-200 font-bold text-sm">Do NOT create a new Gist</h3>
                                <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">
                                    Your users have already added your specific Gist URL to SideStore. If you create a new Gist, the URL changes, and users will NOT receive updates. You must <strong>EDIT</strong> the existing Gist.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide border-b border-slate-800 pb-2">
                                Method 1: Web Edit (Easiest)
                            </h3>
                            <ol className="list-decimal list-inside space-y-3 text-sm text-slate-300">
                                <li>
                                    <button 
                                        onClick={copyJsonToClipboard}
                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold text-white transition-colors align-middle"
                                    >
                                        {copiedUrl === 'json' ? <Check size={12} /> : <Copy size={12} />}
                                        Copy New JSON
                                    </button>
                                    <span className="ml-2">from this app.</span>
                                </li>
                                <li>Open your Gist on GitHub.</li>
                                <li>Click the <strong className="text-white"><Edit size={12} className="inline" /> Edit</strong> button in the top right corner.</li>
                                <li>Delete the old content in <code>repo.json</code> and paste the new JSON.</li>
                                <li>Click <strong className="text-white">Update public gist</strong>.</li>
                            </ol>
                        </div>
                        
                        <button 
                            onClick={() => setShowUpdateGuide(false)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
                        >
                            Back to Tools
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-2 text-white">
                        <Cloud className="text-blue-500" />
                        <h2 className="font-bold text-lg">Cloud Hosting</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b border-slate-800 bg-slate-950/50">
                    <button 
                        onClick={() => { setMode('create'); setError(null); setSuccessMsg(null); }}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${mode === 'create' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                    >
                        <Server size={16} /> Create New
                    </button>
                    <button 
                        onClick={() => { setMode('update'); setError(null); setSuccessMsg(null); }}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${mode === 'update' ? 'border-amber-500 text-amber-400 bg-amber-900/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                    >
                        <RefreshCw size={16} /> Update Existing
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg flex items-start gap-3 border ${mode === 'create' ? 'bg-blue-900/20 border-blue-900/50' : 'bg-amber-900/20 border-amber-900/50'}`}>
                            <div className="flex-1">
                                <p className={`text-sm leading-relaxed ${mode === 'create' ? 'text-blue-200' : 'text-amber-200'}`}>
                                    {mode === 'create' ? "Deploy to a new Gist." : "Update an existing Gist."}
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                             <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Filter size={12} /> Export Configuration
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <button onClick={() => setExportConfig(c => ({ ...c, deduplicate: true }))} className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border ${exportConfig.deduplicate ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-transparent'}`}>
                                        Latest Only
                                    </button>
                                    <button onClick={() => setExportConfig(c => ({ ...c, deduplicate: false }))} className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border ${!exportConfig.deduplicate ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-transparent'}`}>
                                        Archive All
                                    </button>
                                </div>
                                <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 cursor-pointer" onClick={() => setExportConfig(c => ({ ...c, filterIncompatible: !c.filterIncompatible }))}>
                                    <span className={`text-xs font-bold ${exportConfig.filterIncompatible ? 'text-green-300' : 'text-slate-500'}`}>Filter Jailbreak Apps</span>
                                    <div className={`w-8 h-4 rounded-full transition-colors relative ${exportConfig.filterIncompatible ? 'bg-green-600' : 'bg-slate-700'}`}>
                                        <div className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all" style={{ left: exportConfig.filterIncompatible ? '18px' : '2px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">GitHub Token</label>
                            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_..." className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-4 text-sm text-white focus:outline-none focus:border-blue-500" />
                        </div>

                        {mode === 'create' ? (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Privacy</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setDeployType('public')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${deployType === 'public' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                        <Globe size={20} />
                                        <span className="text-sm font-medium">Public</span>
                                    </button>
                                    <button onClick={() => setDeployType('secret')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${deployType === 'secret' ? 'bg-amber-600/20 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                        <Lock size={20} />
                                        <span className="text-sm font-medium">Secret</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Target Gist ID or URL</label>
                                    <button onClick={() => setShowUpdateGuide(true)} className="text-[10px] text-amber-500 hover:underline">Guide</button>
                                </div>
                                <input type="text" value={targetGistId} onChange={(e) => setTargetGistId(e.target.value)} placeholder="https://gist..." className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-4 text-sm text-white focus:outline-none focus:border-amber-500" />
                                {debugExtractedId && (
                                    <div className="text-[10px] text-blue-400 bg-slate-900 p-1 rounded">Target ID: {debugExtractedId}</div>
                                )}
                            </div>
                        )}

                        {error && <div className="p-3 bg-red-900/30 border border-red-900/50 rounded text-xs text-red-200">{error}</div>}
                        {successMsg && <div className="p-3 bg-green-900/30 border border-green-900/50 rounded text-xs text-green-200">{successMsg}</div>}

                        <button onClick={() => processDeploy(mode === 'update')} disabled={loading} className={`w-full py-3 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${mode === 'create' ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'}`}>
                            {loading ? <Loader2 className="animate-spin" /> : (mode === 'create' ? 'Deploy' : 'Update')}
                        </button>
                    </div>

                    {history.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            <h3 className="text-xs font-bold text-slate-400 uppercase">History</h3>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {history.map((dep) => (
                                    <div key={dep.id} onClick={() => mode === 'update' && setTargetGistId(dep.id)} className={`bg-slate-950 p-3 rounded border flex items-center justify-between group ${mode === 'update' && targetGistId === dep.id ? 'border-amber-500' : 'border-slate-800'} ${mode === 'update' ? 'cursor-pointer' : ''}`}>
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-slate-300 truncate">{dep.name}</div>
                                            <p className="text-[10px] text-slate-600 truncate">ID: {dep.id}</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(dep.url); }} className="p-2 bg-slate-800 rounded text-slate-400">
                                            {copiedUrl === dep.url ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
