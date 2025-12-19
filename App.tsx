import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Repo, AppItem, DeviceProfile, DEFAULT_REPO, DEFAULT_APP, DEFAULT_DEVICE, validateURL, processRepoForExport, getFilteredApps } from './types';
import { InputGroup } from './components/InputGroup';
import { AppCard } from './components/AppCard';
import { DeviceMockup } from './components/DeviceMockup';
import { GeminiAssistant } from './components/GeminiAssistant';
import { PublishManager } from './components/PublishManager';
import { AIImporter } from './components/AIImporter';
import { ImportModal } from './components/ImportModal';
import { DeviceManager } from './components/DeviceManager';
import { CompatibilityScanner } from './components/CompatibilityScanner';
import { Toast, ToastMessage, ToastType } from './components/Toast';
import { 
    Download, 
    Plus, 
    Copy, 
    LayoutTemplate, 
    Smartphone,
    Code,
    Cloud,
    Sparkles,
    Bot,
    X,
    Layers,
    FileDown,
    Filter,
    ShieldAlert,
    History,
    Search,
    Check,
    ScanEye
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const App: React.FC = () => {
    // Lazy initialization for Repo
    const [repo, setRepo] = useState<Repo>(() => {
        const saved = localStorage.getItem('trollapps-repo-draft');
        if (saved) {
            try {
                const parsed: Repo = JSON.parse(saved);
                parsed.apps = parsed.apps.map(app => ({
                    ...app,
                    id: app.id || generateId(),
                    iconURL: app.iconURL || "https://placehold.co/128x128.png",
                    category: app.category || "Utilities",
                    // Ensure compatibilityStatus exists on load
                    compatibilityStatus: app.compatibilityStatus || 'unknown'
                }));
                return parsed;
            } catch (e) {
                console.error("Failed to load draft", e);
                return DEFAULT_REPO;
            }
        }
        return DEFAULT_REPO;
    });

    const [device, setDevice] = useState<DeviceProfile>(() => {
        const savedDevice = localStorage.getItem('trollapps-device-profile');
        if (savedDevice) {
             try {
                return JSON.parse(savedDevice);
            } catch (e) {
                return DEFAULT_DEVICE;
            }
        }
        return DEFAULT_DEVICE;
    });

    // Use ID for selection to stay stable during sorts/filters
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'apps'>('details');
    
    // UI State
    const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'json'>('editor');
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showAIImporter, setShowAIImporter] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showMobileAssistant, setShowMobileAssistant] = useState(false);
    const [showDeviceManager, setShowDeviceManager] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    // Export Options
    const [exportConfig, setExportConfig] = useState({
        deduplicate: true, 
        filterIncompatible: true 
    });

    // Persistence
    useEffect(() => {
        localStorage.setItem('trollapps-repo-draft', JSON.stringify(repo));
    }, [repo]);

    useEffect(() => {
        localStorage.setItem('trollapps-device-profile', JSON.stringify(device));
    }, [device]);

    // --- Actions ---

    const addToast = useCallback((text: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, text, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const handleImportRepo = (newRepo: Repo) => {
        setRepo(newRepo);
        setEditingAppId(null);
        setActiveTab('apps');
        addToast(`Imported "${newRepo.name}" with ${newRepo.apps.length} apps`, 'success');
    };

    const handleRepoChange = (field: keyof Repo, value: any) => {
        setRepo(prev => ({ ...prev, [field]: value }));
    };

    const addApp = () => {
        const id = generateId();
        const newApp: AppItem = {
            ...DEFAULT_APP,
            id,
            name: `New App ${repo.apps.length + 1}`
        };
        setRepo(prev => ({ ...prev, apps: [...prev.apps, newApp] }));
        setEditingAppId(id);
        setActiveTab('apps');
        addToast('New app added', 'success');
    };

    const handleSmartAppImport = (newApp: AppItem) => {
        const id = generateId();
        const appWithId = { ...newApp, id };
        setRepo(prev => ({ ...prev, apps: [...prev.apps, appWithId] }));
        setEditingAppId(id); 
        setActiveTab('apps');
        addToast(`Imported ${newApp.name}`, 'success');
    };

    // Memoized update function using ID - O(N) complexity only on interaction
    const updateApp = useCallback((id: string, updatedApp: AppItem) => {
        setRepo(prev => {
            const index = prev.apps.findIndex(a => a.id === id);
            if (index === -1) return prev;

            // Strict equality check to avoid re-renders if nothing changed
            if (JSON.stringify(prev.apps[index]) === JSON.stringify(updatedApp)) {
                return prev;
            }

            const newApps = [...prev.apps];
            newApps[index] = updatedApp;
            return { ...prev, apps: newApps };
        });
    }, []);

    const handleScanUpdates = useCallback((updates: Record<string, AppItem['compatibilityStatus']>) => {
        setRepo(prev => ({
            ...prev,
            apps: prev.apps.map(app => {
                if (updates[app.id]) {
                    return { ...app, compatibilityStatus: updates[app.id] };
                }
                return app;
            })
        }));
    }, []);

    // Stable Delete Function
    const deleteApp = useCallback((id: string) => {
        setRepo(prev => ({
            ...prev,
            apps: prev.apps.filter(a => a.id !== id)
        }));
        setEditingAppId(null);
        addToast('App deleted', 'info');
    }, [addToast]);

    // Stable Toggle Function
    const handleToggleEdit = useCallback((id: string) => {
        setEditingAppId(prev => (prev === id ? null : id));
    }, []);

    // Stable Close Function (CRITICAL FOR MEMOIZATION)
    const handleCloseEdit = useCallback(() => {
        setEditingAppId(null);
    }, []);

    // --- Computed Data ---

    // Calculate the array of apps that will be included in the export.
    // We use this array for the count and to generate the Set of IDs for the UI visual state.
    const filteredExportApps = useMemo(() => {
        return getFilteredApps(repo.apps, exportConfig);
    }, [repo.apps, exportConfig]);

    const includedIds = useMemo(() => {
        return new Set(filteredExportApps.map(a => a.id));
    }, [filteredExportApps]);

    const generateJSON = () => {
        // Always use the current exportConfig from state
        const finalRepo = processRepoForExport(repo, exportConfig);
        return JSON.stringify(finalRepo, null, 4);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateJSON());
        addToast('JSON copied to clipboard', 'success');
    };

    const downloadJSON = () => {
        const blob = new Blob([generateJSON()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'repo.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('repo.json downloaded', 'success');
    };

    // Memoize filtered and grouped apps for display
    const filteredApps = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return repo.apps.filter(app => 
            app.name.toLowerCase().includes(q) || 
            app.bundleIdentifier?.toLowerCase().includes(q) ||
            app.developerName?.toLowerCase().includes(q)
        );
    }, [repo.apps, searchQuery]);

    const groupedApps = useMemo(() => {
        return filteredApps.reduce((acc, app) => {
            const cat = app.category || "Uncategorized";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(app);
            return acc;
        }, {} as Record<string, AppItem[]>);
    }, [filteredApps]);

    const editingApp = useMemo(() => 
        repo.apps.find(a => a.id === editingAppId), 
    [repo.apps, editingAppId]);

    const repoIconError = validateURL(repo.iconURL, 'image');
    const repoHeaderError = validateURL(repo.headerImageURL, 'image');
    const repoWebsiteError = validateURL(repo.website, 'website');

    return (
        <div className="h-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
            
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div className="pointer-events-auto" key={t.id}>
                        <Toast toast={t} onClose={removeToast} />
                    </div>
                ))}
            </div>

            <header className="bg-slate-900 border-b border-slate-800 h-16 md:h-14 flex items-center justify-between px-4 shrink-0 z-30 relative shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                        <LayoutTemplate size={18} className="text-white" />
                    </div>
                    <h1 className="font-bold text-lg tracking-tight text-white hidden md:block">Repo Gen</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowAIImporter(true)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-indigo-900/30 transition-transform active:scale-95">
                        <Sparkles size={16} /> <span className="hidden sm:inline">Smart Add</span> <span className="sm:hidden">Add</span>
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 transition-all">
                        <FileDown size={16} /> <span className="hidden sm:inline">Import</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setShowPublishModal(true)} className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all border border-slate-700">
                        <Cloud size={14} /> Deploy
                    </button>
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                         <button 
                            onClick={() => setViewMode(viewMode === 'json' ? 'editor' : 'json')} 
                            className={`p-2 rounded-md transition-all ${viewMode === 'json' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`} 
                            title="View Code"
                        >
                            <Code size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode(viewMode === 'preview' ? 'editor' : 'preview')} 
                            className={`p-2 rounded-md transition-all ${viewMode === 'preview' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`} 
                            title="Preview"
                        >
                            <Smartphone size={18} />
                        </button>
                        <button onClick={() => setShowMobileAssistant(true)} className="md:hidden p-2 rounded-md text-indigo-400 hover:text-indigo-300 hover:bg-slate-700 transition-all" title="AI Assistant">
                            <Bot size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Editor Panel */}
                <div className={`flex-1 flex flex-col min-w-0 bg-slate-950 transition-all duration-300 ${viewMode !== 'editor' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="bg-slate-900/30 p-4 border-b border-slate-800 flex flex-wrap gap-4 items-center shrink-0">
                        <div className="flex gap-2 w-full">
                             <button onClick={addApp} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                                <Plus size={16} /> Manual Add
                            </button>
                             <button onClick={() => setShowPublishModal(true)} className="md:hidden flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                                <Cloud size={16} /> Deploy
                            </button>
                        </div>
                    </div>

                    <div className="flex border-b border-slate-800 bg-slate-900/30 px-6 pt-4 gap-6 shrink-0">
                        <button onClick={() => { setActiveTab('details'); setEditingAppId(null); }} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                            Repo Details
                        </button>
                        <button onClick={() => setActiveTab('apps')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'apps' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                            Apps <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-300">{repo.apps.length}</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <div className="max-w-3xl mx-auto space-y-6 pb-32 md:pb-20">
                            {activeTab === 'details' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-sm">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <InputGroup label="Repo Name" value={repo.name} onChange={(v) => handleRepoChange('name', v)} />
                                            <InputGroup label="Subtitle" value={repo.subtitle} onChange={(v) => handleRepoChange('subtitle', v)} />
                                        </div>
                                        <InputGroup label="Description" type="textarea" value={repo.description} onChange={(v) => handleRepoChange('description', v)} />
                                        
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <InputGroup label="Icon URL" type="url" value={repo.iconURL} onChange={(v) => handleRepoChange('iconURL', v)} placeholder="https://..." error={repoIconError} />
                                            <InputGroup label="Header Image URL" type="url" value={repo.headerImageURL} onChange={(v) => handleRepoChange('headerImageURL', v)} placeholder="https://..." error={repoHeaderError} />
                                            <InputGroup label="Website" type="url" value={repo.website} onChange={(v) => handleRepoChange('website', v)} placeholder="https://..." error={repoWebsiteError} />
                                            <InputGroup label="Tint Color" type="color" value={repo.tintColor} onChange={(v) => handleRepoChange('tintColor', v)} />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                                <Filter size={16} /> Local Export Configuration
                                            </h3>
                                        </div>
                                        
                                        <div className="space-y-4 mb-6">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">Deduplication Mode</label>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setExportConfig(c => ({ ...c, deduplicate: true }))} 
                                                            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 border ${exportConfig.deduplicate ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-800'}`}
                                                        >
                                                            <Layers size={14} /> Latest Only
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setExportConfig(c => ({ ...c, deduplicate: false }))} 
                                                            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 border ${!exportConfig.deduplicate ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-800'}`}
                                                        >
                                                            <History size={14} /> Keep All
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex flex-col justify-center">
                                                    <div className="flex items-center justify-between cursor-pointer select-none group" onClick={() => setExportConfig(c => ({ ...c, filterIncompatible: !c.filterIncompatible }))}>
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 group-hover:text-slate-300 transition-colors">
                                                                <ShieldAlert size={12} /> Compatibility Filter
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-1">Remove "Jailbreak Only" apps</p>
                                                        </div>
                                                        <div className={`w-10 h-5 rounded-full transition-colors relative ${exportConfig.filterIncompatible ? 'bg-green-600' : 'bg-slate-700'}`}>
                                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${exportConfig.filterIncompatible ? 'left-6' : 'left-1'}`}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3">
                                                <div className="flex items-start gap-2">
                                                    <div className="text-xs text-blue-300/80 leading-relaxed flex-1">
                                                        {exportConfig.deduplicate 
                                                            ? "Exporting in 'Latest Only' mode. Duplicate Bundle IDs will be merged to keep only the highest version." 
                                                            : "Exporting in 'Archive' mode. All app entries, including duplicates and older versions, will be preserved."}
                                                    </div>
                                                    <div className="text-xs font-mono font-bold text-blue-300 bg-blue-900/30 px-2 py-1 rounded whitespace-nowrap">
                                                        Exporting: {filteredExportApps.length} / {repo.apps.length}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button onClick={copyToClipboard} className="flex items-center gap-2 px-4 py-3 md:py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-700 flex-1 md:flex-none justify-center">
                                                <Copy size={16} /> Copy JSON
                                            </button>
                                            <button onClick={downloadJSON} className="flex items-center gap-2 px-4 py-3 md:py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-700 flex-1 md:flex-none justify-center">
                                                <Download size={16} /> Download
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'apps' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {repo.apps.length > 0 && (
                                        <div className="relative mb-6">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Search apps by name, bundle ID, or developer..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            />
                                        </div>
                                    )}

                                    {/* Quick Filter Toolbar */}
                                    <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                                        <button 
                                            onClick={() => setExportConfig(c => ({ ...c, deduplicate: !c.deduplicate }))}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                                exportConfig.deduplicate 
                                                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            <Layers size={12} />
                                            {exportConfig.deduplicate ? 'Latest Only' : 'Keep All'}
                                        </button>
                                        
                                        <button 
                                            onClick={() => setExportConfig(c => ({ ...c, filterIncompatible: !c.filterIncompatible }))}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                                exportConfig.filterIncompatible 
                                                ? 'bg-green-600/20 text-green-300 border-green-500/50' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            <ShieldAlert size={12} />
                                            {exportConfig.filterIncompatible ? 'Hide Incompatible' : 'Show All'}
                                        </button>

                                        <button 
                                            onClick={() => setShowScanner(true)}
                                            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap bg-indigo-600/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-600/30"
                                        >
                                            <ScanEye size={12} />
                                            AI Scan
                                        </button>

                                        <div className="ml-auto px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                                            <Check size={10} className="text-blue-500" />
                                            <span>Exporting: <span className="text-white font-bold">{filteredExportApps.length}</span> / {repo.apps.length}</span>
                                        </div>
                                    </div>

                                    {Object.keys(groupedApps).length > 0 ? (
                                        Object.entries(groupedApps).sort().map(([category, apps]: [string, AppItem[]]) => (
                                            <div key={category} className="mb-8">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                                                    <Layers size={12} /> {category}
                                                </h3>
                                                <div className="grid gap-4">
                                                    {apps.map((app) => (
                                                        <AppCard
                                                            key={app.id}
                                                            app={app}
                                                            isEditing={editingAppId === app.id}
                                                            isExcluded={!includedIds.has(app.id)}
                                                            onToggleEdit={handleToggleEdit}
                                                            onUpdate={updateApp}
                                                            onDelete={deleteApp}
                                                            onCloseEdit={handleCloseEdit}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                         repo.apps.length > 0 && (
                                            <div className="text-center py-12 text-slate-500">
                                                <p>No apps match "{searchQuery}"</p>
                                                <button onClick={() => setSearchQuery('')} className="text-indigo-400 hover:underline mt-2 text-sm">Clear Search</button>
                                            </div>
                                        )
                                    )}
                                    
                                    {repo.apps.length === 0 && (
                                        <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Sparkles className="text-indigo-400" size={24} />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-2">No apps yet</h3>
                                            <p className="text-slate-400 mb-6 max-w-xs mx-auto text-sm">Use the Smart Add feature to generate an app from a link instantly.</p>
                                            <div className="flex gap-3 justify-center">
                                                <button onClick={() => setShowAIImporter(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg shadow-indigo-900/30 transition-all active:scale-95">Smart Add</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right/Overlay Panel */}
                <div className={`fixed inset-0 z-40 bg-slate-950 md:relative md:inset-auto md:w-[400px] lg:w-[450px] md:border-l md:border-slate-800 md:flex flex-col transition-all duration-300 ${viewMode !== 'editor' ? 'flex' : 'hidden md:flex'}`}>
                    <button onClick={() => setViewMode('editor')} className="md:hidden absolute top-4 right-4 z-50 p-2 bg-slate-800 rounded-full text-white shadow-lg"><X size={24} /></button>
                    
                    {viewMode === 'json' ? (
                        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden animate-in fade-in">
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                                <h3 className="font-bold text-slate-200 flex items-center gap-2"><Code size={16} /> JSON Inspector</h3>
                                <button onClick={copyToClipboard} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md text-white transition-colors">Copy</button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                                <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap break-all">
                                    {generateJSON()}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-hidden relative bg-slate-900/20 flex flex-col items-center justify-center">
                                <DeviceMockup 
                                    device={device} 
                                    repo={repo} 
                                    previewApp={editingApp} 
                                    onConfigure={() => setShowDeviceManager(true)}
                                />
                            </div>
                            <div className="hidden md:block p-4 border-t border-slate-800 bg-slate-900">
                                <GeminiAssistant app={editingApp} device={device} />
                            </div>
                        </>
                    )}
                </div>

                {/* Modals */}
                {showScanner && (
                    <CompatibilityScanner 
                        apps={repo.apps} 
                        onUpdateApps={handleScanUpdates} 
                        onClose={() => setShowScanner(false)} 
                    />
                )}
                {showDeviceManager && (
                    <DeviceManager 
                        device={device} 
                        onChange={setDevice} 
                        onClose={() => setShowDeviceManager(false)} 
                    />
                )}
                
                {showMobileAssistant && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl animate-in slide-in-from-bottom-10">
                            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50">
                                <h3 className="font-bold text-white flex items-center gap-2"><Bot className="text-indigo-400" size={20} /> AI Assistant</h3>
                                <button onClick={() => setShowMobileAssistant(false)} className="p-1 rounded-full hover:bg-slate-800 text-slate-400"><X size={20} /></button>
                            </div>
                            <div className="p-4"><GeminiAssistant app={editingApp} device={device} /></div>
                        </div>
                    </div>
                )}
                {showPublishModal && <PublishManager repo={repo} onClose={() => setShowPublishModal(false)} initialConfig={exportConfig} />}
                {showAIImporter && <AIImporter onImport={handleSmartAppImport} onClose={() => setShowAIImporter(false)} />}
                {showImportModal && <ImportModal onImport={handleImportRepo} onClose={() => setShowImportModal(false)} />}
            </div>
        </div>
    );
};

export default App;