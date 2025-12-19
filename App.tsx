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
import { AboutModal } from './components/AboutModal';
import { Toast, ToastMessage, ToastType } from './components/Toast';
import { Download, Plus, Copy, LayoutTemplate, Smartphone, Code, Cloud, Sparkles, Bot, X, Layers, FileDown, Filter, ShieldAlert, History, Search, Check, ScanEye, Info, Palette, Globe, Type } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const App: React.FC = () => {
    const [repo, setRepo] = useState<Repo>(() => {
        const saved = localStorage.getItem('trollapps-repo-draft');
        if (saved) {
            try {
                const parsed: Repo = JSON.parse(saved);
                parsed.apps = parsed.apps.map(app => ({
                    ...app,
                    id: app.id || generateId(),
                    category: app.category || "Utilities",
                    compatibilityStatus: app.compatibilityStatus || 'unknown'
                }));
                return parsed;
            } catch (e) {
                return DEFAULT_REPO;
            }
        }
        return DEFAULT_REPO;
    });

    const [device, setDevice] = useState<DeviceProfile>(() => {
        const savedDevice = localStorage.getItem('trollapps-device-profile');
        if (savedDevice) {
            try { return JSON.parse(savedDevice); } catch (e) { return DEFAULT_DEVICE; }
        }
        return DEFAULT_DEVICE;
    });

    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'apps'>('details');
    const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'json'>('editor');
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showAIImporter, setShowAIImporter] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showDeviceManager, setShowDeviceManager] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const [exportConfig, setExportConfig] = useState({ deduplicate: true, filterIncompatible: true });

    useEffect(() => { localStorage.setItem('trollapps-repo-draft', JSON.stringify(repo)); }, [repo]);
    useEffect(() => { localStorage.setItem('trollapps-device-profile', JSON.stringify(device)); }, [device]);

    const addToast = useCallback((text: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, text, type }]);
    }, []);

    const removeToast = useCallback((id: string) => { setToasts(prev => prev.filter(t => t.id !== id)); }, []);

    const handleImportRepo = (newRepo: Repo) => {
        setRepo(newRepo);
        setEditingAppId(null);
        setActiveTab('apps');
        addToast(`Imported "${newRepo.name}"`, 'success');
    };

    const handleRepoChange = (field: keyof Repo, value: any) => {
        setRepo(prev => ({ ...prev, [field]: value }));
    };

    const addApp = () => {
        const id = generateId();
        const newApp: AppItem = { ...DEFAULT_APP, id, name: `New App ${repo.apps.length + 1}` };
        setRepo(prev => ({ ...prev, apps: [...prev.apps, newApp] }));
        setEditingAppId(id);
        setActiveTab('apps');
    };

    const handleSmartAppImport = (newApp: AppItem) => {
        const id = generateId();
        setRepo(prev => ({ ...prev, apps: [...prev.apps, { ...newApp, id }] }));
        setEditingAppId(id); 
        setActiveTab('apps');
    };

    const updateApp = useCallback((id: string, updatedApp: AppItem) => {
        setRepo(prev => {
            const index = prev.apps.findIndex(a => a.id === id);
            if (index === -1) return prev;
            const newApps = [...prev.apps];
            newApps[index] = updatedApp;
            return { ...prev, apps: newApps };
        });
    }, []);

    const handleScanUpdates = useCallback((updates: Record<string, AppItem['compatibilityStatus']>) => {
        setRepo(prev => ({
            ...prev,
            apps: prev.apps.map(app => updates[app.id] ? { ...app, compatibilityStatus: updates[app.id] } : app)
        }));
    }, []);

    const deleteApp = useCallback((id: string) => {
        setRepo(prev => ({ ...prev, apps: prev.apps.filter(a => a.id !== id) }));
        setEditingAppId(null);
    }, []);

    const handleToggleEdit = useCallback((id: string) => { setEditingAppId(prev => (prev === id ? null : id)); }, []);
    const handleCloseEdit = useCallback(() => { setEditingAppId(null); }, []);

    const filteredExportApps = useMemo(() => getFilteredApps(repo.apps, exportConfig), [repo.apps, exportConfig]);
    const includedIds = useMemo(() => new Set(filteredExportApps.map(a => a.id)), [filteredExportApps]);

    const generateJSON = () => JSON.stringify(processRepoForExport(repo, exportConfig), null, 4);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateJSON());
        addToast('JSON copied', 'success');
    };

    const filteredApps = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return repo.apps.filter(app => app.name.toLowerCase().includes(q) || app.bundleIdentifier?.toLowerCase().includes(q));
    }, [repo.apps, searchQuery]);

    const groupedApps = useMemo((): Record<string, AppItem[]> => {
        return filteredApps.reduce((acc, app) => {
            const cat = app.category || "Uncategorized";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(app);
            return acc;
        }, {} as Record<string, AppItem[]>);
    }, [filteredApps]);

    const editingApp = useMemo(() => repo.apps.find(a => a.id === editingAppId), [repo.apps, editingAppId]);

    return (
        <div className="h-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden">
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => <Toast key={t.id} toast={t} onClose={removeToast} />)}
            </div>

            <header className="bg-slate-900 border-b border-slate-800 h-16 md:h-14 flex items-center justify-between px-4 shrink-0 z-30 relative shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                        <LayoutTemplate size={18} className="text-white" />
                    </div>
                    <h1 className="font-bold text-lg text-white hidden md:block">SideStore Source Maker</h1>
                    <button 
                        onClick={() => setShowAboutModal(true)}
                        className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                        title="About SideStore Source Maker"
                    >
                        <Info size={18} />
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowAIImporter(true)} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                        <Sparkles size={16} /> <span className="hidden sm:inline">Smart Add</span>
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="bg-slate-800 text-slate-200 px-3 py-2 rounded-lg text-sm border border-slate-700 flex items-center gap-2">
                        <FileDown size={16} /> <span className="hidden sm:inline">Import</span>
                    </button>
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => setViewMode(viewMode === 'json' ? 'editor' : 'json')} className={`p-2 rounded-md ${viewMode === 'json' ? 'bg-slate-600' : 'text-slate-400'}`}><Code size={18} /></button>
                        <button onClick={() => setViewMode(viewMode === 'preview' ? 'editor' : 'preview')} className={`p-2 rounded-md ${viewMode === 'preview' ? 'bg-slate-600' : 'text-slate-400'}`}><Smartphone size={18} /></button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                <div className={`flex-1 flex flex-col bg-slate-950 ${viewMode !== 'editor' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex border-b border-slate-800 bg-slate-900/30 px-6 pt-4 gap-6 shrink-0">
                        <button onClick={() => { setActiveTab('details'); setEditingAppId(null); }} className={`pb-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'details' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Repo Details</button>
                        <button onClick={() => setActiveTab('apps')} className={`pb-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${activeTab === 'apps' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Apps ({repo.apps.length})</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                        <div className="max-w-3xl mx-auto space-y-6 pb-20">
                            {activeTab === 'details' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Header Preview Section */}
                                    <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden shadow-lg group">
                                        <div className="h-40 bg-slate-800 relative">
                                            {repo.headerImageURL ? (
                                                <img src={repo.headerImageURL} className="w-full h-full object-cover" alt="Header Preview" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="w-full h-full bg-indigo-600/10 flex flex-col items-center justify-center text-indigo-500/50">
                                                    <Layers size={32} className="mb-2 opacity-50" />
                                                    <span className="text-xs font-bold uppercase tracking-widest">No Header Image</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-4">
                                                 <div className="w-16 h-16 rounded-[22%] bg-slate-900 border-2 border-slate-800 overflow-hidden shadow-2xl">
                                                    {repo.iconURL ? (
                                                        <img src={repo.iconURL} className="w-full h-full object-cover" alt="Repo Icon" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                                                            <LayoutTemplate size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <InputGroup label="Header Image URL" value={repo.headerImageURL} onChange={(v) => handleRepoChange('headerImageURL', v)} placeholder="https://example.com/banner.png" />
                                        </div>
                                    </div>

                                    {/* Identity Section */}
                                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-md">
                                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-2">
                                            <div className="p-2 bg-indigo-600/10 rounded-lg">
                                                <Type size={18} className="text-indigo-400" />
                                            </div>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Repo Details</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputGroup label="Repo Name" value={repo.name} onChange={(v) => handleRepoChange('name', v)} placeholder="Enter repository name" />
                                            <InputGroup label="Subtitle" value={repo.subtitle} onChange={(v) => handleRepoChange('subtitle', v)} placeholder="Brief tagline" />
                                        </div>
                                        <InputGroup label="Description" type="textarea" value={repo.description} onChange={(v) => handleRepoChange('description', v)} placeholder="Enter a long-form description for your repository..." />
                                    </div>

                                    {/* Links & Appearance Section */}
                                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-md">
                                        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-2">
                                            <div className="p-2 bg-blue-600/10 rounded-lg">
                                                <Palette size={18} className="text-blue-400" />
                                            </div>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Branding & Links</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputGroup label="Icon URL" value={repo.iconURL} onChange={(v) => handleRepoChange('iconURL', v)} placeholder="https://example.com/icon.png" />
                                            <InputGroup label="Website" value={repo.website} onChange={(v) => handleRepoChange('website', v)} placeholder="https://example.com" />
                                            <InputGroup label="Tint Color" type="color" value={repo.tintColor} onChange={(v) => handleRepoChange('tintColor', v)} />
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex flex-wrap gap-4 pt-4 pb-20">
                                        <button onClick={copyToClipboard} className="flex-1 min-w-[160px] py-4 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 text-slate-200">
                                            <Copy size={20} /> Copy JSON
                                        </button>
                                        <button onClick={() => setShowPublishModal(true)} className="flex-1 min-w-[160px] py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-indigo-900/30 transition-all active:scale-95 text-white">
                                            <Cloud size={20} /> Deploy to Gist
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="relative flex-1">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input 
                                                placeholder="Search apps by name or bundle ID..." 
                                                value={searchQuery} 
                                                onChange={(e) => setSearchQuery(e.target.value)} 
                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                            />
                                        </div>
                                        <button onClick={addApp} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all active:scale-95 shadow-lg shadow-indigo-900/20">
                                            <Plus size={18} /> Add App
                                        </button>
                                    </div>
                                    {(Object.entries(groupedApps) as [string, AppItem[]][]).map(([cat, apps]: [string, AppItem[]]) => (
                                        <div key={cat} className="space-y-4 pt-2">
                                            <div className="flex items-center gap-2 px-2">
                                                <div className="h-px bg-slate-800 flex-1"></div>
                                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{cat}</h3>
                                                <div className="h-px bg-slate-800 flex-1"></div>
                                            </div>
                                            {apps.map(app => (
                                                <AppCard key={app.id} app={app} isEditing={editingAppId === app.id} isExcluded={!includedIds.has(app.id)} onToggleEdit={handleToggleEdit} onUpdate={updateApp} onDelete={deleteApp} onCloseEdit={handleCloseEdit} />
                                            ))}
                                        </div>
                                    ))}
                                    {filteredApps.length === 0 && (
                                        <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                                            <div className="p-4 bg-slate-800 rounded-full w-fit mx-auto mb-4 text-slate-500">
                                                <Search size={32} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-300">No apps found</h3>
                                            <p className="text-sm text-slate-500">Try adjusting your search or add a new app.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`fixed inset-0 z-40 bg-slate-950 md:relative md:w-[450px] md:border-l md:border-slate-800 ${viewMode !== 'editor' ? 'flex' : 'hidden md:flex'} flex-col`}>
                    <DeviceMockup device={device} repo={repo} previewApp={editingApp} onConfigure={() => setShowDeviceManager(true)} />
                </div>

                {showScanner && <CompatibilityScanner apps={repo.apps} onUpdateApps={handleScanUpdates} onClose={() => setShowScanner(false)} />}
                {showDeviceManager && <DeviceManager device={device} onChange={setDevice} onClose={() => setShowDeviceManager(false)} />}
                {showPublishModal && <PublishManager repo={repo} onClose={() => setShowPublishModal(false)} initialConfig={exportConfig} />}
                {showAIImporter && <AIImporter onImport={handleSmartAppImport} onClose={() => setShowAIImporter(false)} />}
                {showImportModal && <ImportModal onImport={handleImportRepo} onClose={() => setShowImportModal(false)} />}
                {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
            </div>
        </div>
    );
};

export default App;