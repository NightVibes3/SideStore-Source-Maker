import React, { useState, useEffect } from 'react';
import { Repo, Deployment, processRepoForExport } from '../types';
import { Cloud, Check, Copy, AlertCircle, Loader2, Server, Github, Globe, Lock, X, Filter, Layers, History, ShieldAlert, BookOpen, AlertTriangle, Terminal, Edit, RefreshCw, ChevronRight } from 'lucide-react';

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
    
    // New State for Update Mode
    const [mode, setMode] = useState<'create' | 'update'>('create');
    const [targetGistId, setTargetGistId] = useState('');

    // Initial state derived from props
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
        
        // Priority 1: Match standard 32-char hex Gist ID (most common)
        // This handles standard URLs, raw URLs, and direct ID pastes.
        // Gist IDs are hex, commit hashes are also hex but longer (40 chars) or come later in URL.
        const hexMatch = clean.match(/[0-9a-f]{32}/i);
        if (hexMatch) return hexMatch[0];

        // Priority 2: Structure based fallback
        if (clean.includes('/')) {
            const parts = clean.split('/').filter(p => p.length > 0);
            
            // If URL contains '/raw/', the ID is typically the segment BEFORE 'raw'
            // e.g. .../username/gist_id/raw/...
            const rawIndex = parts.indexOf('raw');
            if (rawIndex > 0) return parts[rawIndex - 1];

            // If URL ends in a filename (has dot), try segment before
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
                    description: `TrollApps Repo: ${finalRepo.name} (Generated via Repo Gen)`,
                    public: !isUpdate ? (deployType === 'public') : undefined, // Only set public on create
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

            // Update History
            const newDeployment: Deployment = {
                id: data.id,
                url: rawUrl,
                createdAt: new Date().toISOString(),
                type: data.public ? 'public' : 'secret',
                name: finalRepo.name
            };

            // Remove existing entry for this ID if updating, then add to top
            const filteredHistory = history.filter(h => h.id !== data.id);
            const newHistory = [newDeployment, ...filteredHistory];
            setHistory(newHistory);
            localStorage.setItem('deploy_history', JSON.stringify(newHistory));

            setSuccessMsg(isUpdate ? "Repo updated successfully!" : "New server deployed successfully!");
            
            // If create, switch to update mode with the new ID pre-filled
            if (!isUpdate) {
                setTargetGistId(data.id);
            }

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

    // Helper to verify ID extraction for UI
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
                                <li>Open your Gist on GitHub (click the link in History below).</li>
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
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-2 text-white">
                        <Cloud className="text-blue-500" />
                        <h2 className="font-bold text-lg">Cloud Hosting</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
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
                        {/* Intro / Context */}
                        <div className={`p-4 rounded-lg flex items-start gap-3 border ${mode === 'create' ? 'bg-blue-900/20 border-blue-900/50' : 'bg-amber-900/20 border-amber-900/50'}`}>
                            <div className="flex-1">
                                <p className={`text-sm leading-relaxed ${mode === 'create' ? 'text-blue-200' : 'text-amber-200'}`}>
                                    {mode === 'create' 
                                        ? "Deploy your repo JSON to a new GitHub Gist. This generates a fresh permanent URL." 
                                        : "Push the latest changes to an existing Gist without changing its URL. Keeps your users connected."}
                                </p>
                            </div>
                        </div>

                        {/* Export Config Section */}
                        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                             <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Filter size={12} /> Export Configuration
                                </h3>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setExportConfig(c => ({ ...c, deduplicate: true }))} 
                                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border ${exportConfig.deduplicate ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-transparent'}`}
                                    >
                                        <div className="flex items-center justify-center gap-1.5"><Layers size={12} /> Latest Only</div>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setExportConfig(c => ({ ...c, deduplicate: false }))} 
                                        className={`flex-1 py-1.5 px-2 rounded text-xs font-medium border ${!exportConfig.deduplicate ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-transparent'}`}
                                    >
                                        <div className="flex items-center justify-center gap-1.5"><History size={12} /> Archive All</div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 cursor-pointer group" onClick={() => setExportConfig(c => ({ ...c, filterIncompatible: !c.filterIncompatible }))}>
                                    <div className="flex items-center gap-1.5">
                                        <ShieldAlert size={12} className={exportConfig.filterIncompatible ? 'text-green-400' : 'text-slate-500'} />
                                        <span className={`text-xs font-bold transition-colors ${exportConfig.filterIncompatible ? 'text-green-300' : 'text-slate-500'}`}>Filter Jailbreak Apps</span>
                                    </div>
                                    <div className={`w-8 h-4 rounded-full transition-colors relative ${exportConfig.filterIncompatible ? 'bg-green-600' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${exportConfig.filterIncompatible ? 'left-4.5' : 'left-0.5'}`} style={{ left: exportConfig.filterIncompatible ? '18px' : '2px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Token Input (Shared) */}
                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                GitHub Personal Access Token
                            </label>
                            <div className="relative">
                                <Github className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                <input 
                                    type="password" 
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Mode Specific Controls */}
                        {mode === 'create' ? (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    Server Privacy
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setDeployType('public')}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${deployType === 'public' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <Globe size={20} />
                                        <span className="text-sm font-medium">Public</span>
                                    </button>
                                    <button
                                        onClick={() => setDeployType('secret')}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${deployType === 'secret' ? 'bg-amber-600/20 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <Lock size={20} />
                                        <span className="text-sm font-medium">Secret</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        Target Gist ID or URL
                                    </label>
                                    <button onClick={() => setShowUpdateGuide(true)} className="text-[10px] text-amber-500 hover:underline flex items-center gap-1">
                                        <BookOpen size={10} /> Guide
                                    </button>
                                </div>
                                <div className="relative">
                                    <Server className="absolute left-3 top-2.5 text-slate-500" size={16} />
                                    <input 
                                        type="text" 
                                        value={targetGistId}
                                        onChange={(e) => setTargetGistId(e.target.value)}
                                        placeholder="e.g. 8f6d... or https://gist.github.com/..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                
                                {/* Feedback for ID Extraction */}
                                {debugExtractedId && (
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-900/50 rounded border border-slate-800/50 animate-in fade-in">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Target ID:</span>
                                        <span className="font-mono text-[10px] text-blue-400">{debugExtractedId}</span>
                                    </div>
                                )}
                                
                                <p className="text-[10px] text-slate-500">
                                    Paste a raw URL, Gist URL, or ID.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-900/30 border border-red-900/50 rounded text-xs text-red-200 flex items-start gap-2 animate-in fade-in">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-3 bg-green-900/30 border border-green-900/50 rounded text-xs text-green-200 flex items-start gap-2 animate-in fade-in">
                                <Check size={14} className="mt-0.5 shrink-0" />
                                {successMsg}
                            </div>
                        )}

                        <button
                            onClick={() => processDeploy(mode === 'update')}
                            disabled={loading}
                            className={`w-full py-3 font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                mode === 'create' 
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20' 
                                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/20'
                            }`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (mode === 'create' ? <Server size={18} /> : <RefreshCw size={18} />)}
                            {loading ? 'Processing...' : (mode === 'create' ? 'Deploy New Server' : 'Push Update')}
                        </button>
                    </div>

                    {/* History */}
                    {history.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            <h3 className="text-xs font-bold text-slate-400 uppercase">Recent Deployments</h3>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                                {history.map((dep) => (
                                    <div 
                                        key={dep.id} 
                                        onClick={() => {
                                            if (mode === 'update') setTargetGistId(dep.id);
                                        }}
                                        className={`bg-slate-950 p-3 rounded border flex items-center justify-between group transition-colors ${
                                            mode === 'update' && targetGistId === dep.id 
                                                ? 'border-amber-500/50 ring-1 ring-amber-500/20 cursor-default' 
                                                : 'border-slate-800 hover:border-slate-700'
                                        } ${mode === 'update' ? 'cursor-pointer' : ''}`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${dep.type === 'public' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                                <span className="text-sm font-medium text-slate-300 truncate">{dep.name}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-600 font-mono truncate max-w-[200px]">ID: {dep.id}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            {mode === 'update' && (
                                                <div className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 ${targetGistId === dep.id ? 'bg-amber-900/30 text-amber-400' : 'bg-slate-900 text-slate-500'}`}>
                                                    {targetGistId === dep.id ? <Check size={10} /> : <ChevronRight size={10} />}
                                                    {targetGistId === dep.id ? 'Selected' : 'Select'}
                                                </div>
                                            )}
                                            {mode === 'create' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(dep.url); }}
                                                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                                    title="Copy Raw URL"
                                                >
                                                    {copiedUrl === dep.url ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
};