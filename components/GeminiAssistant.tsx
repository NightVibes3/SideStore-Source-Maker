import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppItem, DeviceProfile } from '../types';
import { Bot, Sparkles, AlertCircle, Loader2, Smartphone, ShieldCheck } from 'lucide-react';

interface GeminiAssistantProps {
    app?: AppItem;
    device: DeviceProfile;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ app, device }) => {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkCompatibility = async () => {
        if (!app) return;
        setLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                I am a user with a ${device.model} running iOS ${device.iosVersion}.
                I want to sideload an app using AltStore, SideStore, or TrollStore.
                
                App Details:
                - Name: ${app.name}
                - Bundle ID: ${app.bundleIdentifier}
                - Version: ${app.version}
                - Download URL: ${app.downloadURL}
                
                Task:
                1. Compatibility: Is this likely to work on iOS ${device.iosVersion}?
                2. Sideloading: Does it need JIT? (e.g. UTM, Dolphin, JIT requiring apps).
                3. Safety: Any red flags in the bundle ID or URL?
                
                Be concise (max 3 sentences).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setAnalysis(response.text || "No analysis returned.");
        } catch (err) {
            console.error(err);
            setError("Failed to connect to Gemini.");
        } finally {
            setLoading(false);
        }
    };

    if (!app) return (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <Bot className="text-slate-500" size={20} />
            </div>
            <h4 className="text-slate-200 font-semibold mb-1">AI Assistant Ready</h4>
            <p className="text-xs text-slate-500 max-w-[200px]">
                Select an app from the list to check its compatibility with your {device.model}.
            </p>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 rounded-xl border border-indigo-900/30 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Analysis</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-indigo-300/60 font-mono bg-indigo-950/50 px-2 py-0.5 rounded-full">
                    <Smartphone size={10} />
                    {device.model}
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 shrink-0 overflow-hidden">
                        {app.iconURL ? <img src={app.iconURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-700" />}
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate">{app.name}</div>
                        <div className="text-xs text-slate-400 truncate">v{app.version}</div>
                    </div>
                </div>

                {!analysis && !loading && (
                    <button 
                        onClick={checkCompatibility}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                    >
                        <ShieldCheck size={16} /> Verify Compatibility
                    </button>
                )}

                {loading && (
                    <div className="flex items-center justify-center gap-3 py-2 text-indigo-300">
                        <Loader2 className="animate-spin" size={18} />
                        <span className="text-xs">Analyzing package...</span>
                    </div>
                )}

                {analysis && (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                            <p className="text-sm text-slate-200 leading-relaxed">
                                {analysis.replace(/\*\*/g, '')}
                            </p>
                        </div>
                        <div className="mt-3 flex gap-2">
                             <button 
                                onClick={() => setAnalysis(null)}
                                className="flex-1 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};