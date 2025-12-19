import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppItem } from '../types';
import { ShieldCheck, Loader2, X, AlertTriangle, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';

interface CompatibilityScannerProps {
    apps: AppItem[];
    onUpdateApps: (updates: Record<string, AppItem['compatibilityStatus']>) => void;
    onClose: () => void;
}

export const CompatibilityScanner: React.FC<CompatibilityScannerProps> = ({ apps, onUpdateApps, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<Record<string, string>>({});

    const handleScan = async () => {
        setLoading(true);
        setProgress(0);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Optimization: Increase batch size and use concurrency
        const BATCH_SIZE = 50; 
        const CONCURRENCY_LIMIT = 3; 

        const updates: Record<string, AppItem['compatibilityStatus']> = {};
        
        // 1. Create Batches
        const chunks: AppItem[][] = [];
        for (let i = 0; i < apps.length; i += BATCH_SIZE) {
            chunks.push(apps.slice(i, i + BATCH_SIZE));
        }

        let completedCount = 0;

        // 2. Define Batch Processor
        const processBatch = async (batch: AppItem[]) => {
            const prompt = `
                Analyze these iOS apps and classify their sideloading compatibility.
                
                Return a JSON Array of objects with 'id' and 'status'.
                Status options: 
                - 'safe' (Works on standard AltStore/SideStore, e.g. Delta, uYou+)
                - 'jit_required' (Works but needs JIT, e.g. DolphiniOS, UTM SE/Slow is safe but UTM is JIT)
                - 'trollstore_only' (Needs Entitlements/Unsandboxed, e.g. TrollStore apps, Apps changing system files)
                - 'jailbreak_only' (Needs Root/Jailbreak, e.g. Filza, NewTerm, Tweaks)

                Apps:
                ${JSON.stringify(batch.map(a => ({
                    id: a.id,
                    name: a.name,
                    bundleId: a.bundleIdentifier,
                    desc: (a.localizedDescription || "").substring(0, 100)
                })))}
            `;

            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                });

                const text = response.text;
                if (text) {
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                        data.forEach((item: any) => {
                            if (item.id && item.status) {
                                updates[item.id] = item.status;
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Batch failed", error);
            } finally {
                completedCount += batch.length;
                setProgress((completedCount / apps.length) * 100);
            }
        };

        // 3. Execute with Concurrency Limit
        const queue = [...chunks];
        const workers = Array(Math.min(queue.length, CONCURRENCY_LIMIT)).fill(null).map(async () => {
            while (queue.length > 0) {
                const batch = queue.shift();
                if (batch) await processBatch(batch);
            }
        });

        await Promise.all(workers);

        setResults(updates);
        onUpdateApps(updates);
        setLoading(false);
    };

    const countStatus = (status: string) => Object.values(results).filter(s => s === status).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">
                        <ShieldCheck className="text-indigo-500" /> AI Compatibility Scan
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {!loading && Object.keys(results).length === 0 ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                                <ShieldCheck size={32} className="text-indigo-400" />
                            </div>
                            <h3 className="text-white font-bold mb-2">Scan {apps.length} Apps</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Use Google Gemini to analyze your apps and detect if they require JIT, TrollStore, or a Jailbreak. This improves the accuracy of the Export Filter.
                            </p>
                            <button 
                                onClick={handleScan}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                Start Scan
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {loading ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm text-slate-400">
                                        <span>Analyzing Apps...</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-center text-slate-500 animate-pulse">
                                        Processing batches in parallel...
                                    </p>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4">
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-green-900/20 border border-green-900/50 p-3 rounded-lg flex items-center gap-3">
                                            <CheckCircle2 size={20} className="text-green-500" />
                                            <div>
                                                <div className="text-lg font-bold text-white">{countStatus('safe')}</div>
                                                <div className="text-xs text-green-400">Safe</div>
                                            </div>
                                        </div>
                                        <div className="bg-amber-900/20 border border-amber-900/50 p-3 rounded-lg flex items-center gap-3">
                                            <Terminal size={20} className="text-amber-500" />
                                            <div>
                                                <div className="text-lg font-bold text-white">{countStatus('jit_required')}</div>
                                                <div className="text-xs text-amber-400">JIT Required</div>
                                            </div>
                                        </div>
                                        <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex items-center gap-3">
                                            <AlertOctagon size={20} className="text-red-500" />
                                            <div>
                                                <div className="text-lg font-bold text-white">{countStatus('trollstore_only')}</div>
                                                <div className="text-xs text-red-400">TrollStore</div>
                                            </div>
                                        </div>
                                        <div className="bg-purple-900/20 border border-purple-900/50 p-3 rounded-lg flex items-center gap-3">
                                            <AlertTriangle size={20} className="text-purple-500" />
                                            <div>
                                                <div className="text-lg font-bold text-white">{countStatus('jailbreak_only')}</div>
                                                <div className="text-xs text-purple-400">Jailbreak</div>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={onClose}
                                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};