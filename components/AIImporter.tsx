import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppItem, DEFAULT_APP } from '../types';
import { Sparkles, Link, Search, AlertCircle, Loader2, X, ArrowRight, Github, Globe, Info, Archive, List, FileText, Binary } from 'lucide-react';
// @ts-ignore
import { unzip } from 'unzipit';
// @ts-ignore
import plist from 'plist';

interface AIImporterProps {
    onImport: (app: AppItem) => void; // For single imports
    onClose: () => void;
}

export const AIImporter: React.FC<AIImporterProps> = ({ onImport, onClose }) => {
    const [mode, setMode] = useState<'search' | 'bulk'>('search');
    const [input, setInput] = useState('');
    const [bulkInput, setBulkInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [groundingLinks, setGroundingLinks] = useState<any[]>([]);

    const fetchAndInspectIPA = async (url: string): Promise<any | null> => {
        try {
            setStatusMessage('Attempting to inspect IPA file...');
            // Try to unzip the URL directly
            const { entries } = await unzip(url);
            
            // Find Info.plist in Payload/*.app/Info.plist
            const plistEntry = Object.values(entries).find((e: any) => 
                e.name.match(/^Payload\/[^/]+\.app\/Info\.plist$/)
            );

            if (!plistEntry) {
                console.warn("No Info.plist found in IPA");
                return null;
            }

            setStatusMessage('Extracting Info.plist...');
            // @ts-ignore
            const blob = await plistEntry.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const textContent = await blob.text();

            // Check if XML or Binary
            if (textContent.trim().startsWith('<?xml') || textContent.trim().startsWith('<plist')) {
                setStatusMessage('Parsing XML Plist...');
                try {
                    const parsed = plist.parse(textContent);
                    return {
                        name: parsed.CFBundleDisplayName || parsed.CFBundleName,
                        bundleIdentifier: parsed.CFBundleIdentifier,
                        version: parsed.CFBundleShortVersionString || parsed.CFBundleVersion,
                        minOS: parsed.MinimumOSVersion
                    };
                } catch (e) {
                    console.error("XML Parsing failed, trying AI", e);
                }
            }
            
            // If binary or XML parse failed, use AI with Hex Dump (Reliable & Text-based)
            setStatusMessage('Analyzing Binary Plist with AI...');
            
            const bytes = new Uint8Array(arrayBuffer);
            const hex = Array.from(bytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                I have the HEX DUMP of a binary iOS Info.plist file.
                Decode it and extract the metadata.

                HEX DATA:
                ${hex.substring(0, 30000)} ${hex.length > 30000 ? '... (truncated)' : ''}

                REQUIRED JSON OUTPUT:
                {
                    "name": "CFBundleDisplayName" or "CFBundleName",
                    "bundleIdentifier": "CFBundleIdentifier",
                    "version": "CFBundleShortVersionString",
                    "versionDescription": "Release notes if found, else 'Initial Import'",
                    "minOS": "MinimumOSVersion"
                }

                Strictly return JSON.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const text = response.text;
            if (!text) return null;
            return JSON.parse(text);

        } catch (e) {
            console.error("IPA Inspection failed (likely CORS or not a zip):", e);
            return null;
        }
    };

    const performSearch = async (term: string) => {
        if (!term.trim()) return;
        
        // Decode URL encoded logs if pasted directly
        let processedTerm = term;
        try {
            if (term.includes('%20') || term.includes('%3A')) {
                processedTerm = decodeURIComponent(term);
            }
        } catch (e) {
            // ignore
        }

        setInput(processedTerm); // Update UI to show decoded text
        setLoading(true);
        setError(null);
        setGroundingLinks([]);

        try {
            const isUrl = processedTerm.trim().match(/^https?:\/\//);
            let inspectedData = null;

            if (isUrl) {
                inspectedData = await fetchAndInspectIPA(processedTerm.trim());
            }

            setStatusMessage(inspectedData ? 'Finalizing app details...' : 'Analyzing input (Search or Error Log)...');

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                You are an expert iOS repository assistant.
                
                USER INPUT: "${processedTerm}"
                
                ${inspectedData ? `
                MODE: DIRECT FILE INSPECTION SUCCESSFUL.
                I have already inspected the IPA file and found the EXACT metadata.
                
                INSPECTED DATA (Use this TRUTH over any search results):
                ${JSON.stringify(inspectedData)}
                
                Task:
                1. Use the "bundleIdentifier" from INSPECTED DATA. Do NOT change it.
                2. Use the "version" from INSPECTED DATA.
                3. Use the provided URL as "downloadURL".
                4. Fill in missing fields (description, iconURL) using the name/id.
                ` : `
                MODE: ${isUrl ? 'URL Search (Inspection Failed)' : 'Name/Text Search'}.
                1. ${isUrl ? 'Use the URL as downloadURL.' : 'Find download URL.'}
                2. Find accurate metadata using Google Search.
                
                CRITICAL - ERROR LOG PARSING:
                If the user pasted a SideStore/AltStore error log (e.g., "The bundle ID X does not match the one specified by the source Y"):
                - Extract the *ACTUAL* Bundle ID (X). This is the one found in the file/log.
                - Use this ACTUAL ID as the "bundleIdentifier".
                - Use the name of the app mentioned in the log.
                - Ignore the "specified by source" ID (Y), as it is incorrect.
                
                CRITICAL: ACCURATE BUNDLE ID
                The user explicitly forbids guessing. You MUST search for the real Bundle Identifier.
                `}

                REQUIRED JSON OUTPUT:
                {
                    "name": "App Name",
                    "bundleIdentifier": "com.real.verified.bundle.id", 
                    "developerName": "Developer Name",
                    "version": "1.0",
                    "versionDate": "YYYY-MM-DD",
                    "versionDescription": "Release notes",
                    "downloadURL": "URL",
                    "localizedDescription": "Description",
                    "iconURL": "Image URL",
                    "tintColor": "#hex",
                    "category": "Utilities",
                    "size": 0
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview', 
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });

            const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (grounding) {
                setGroundingLinks(grounding);
            }

            const text = response.text;
            if (!text) throw new Error("No response from AI");

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Could not parse JSON from AI response");
            
            const appData = JSON.parse(jsonMatch[0]);
            
            const newApp: AppItem = {
                ...DEFAULT_APP,
                ...appData,
                id: undefined,
                screenshotURLs: [] 
            };
            
            const isFakeUrl = (url?: string) => !url || url.includes('example.com') || url.includes('placeholder') || !url.startsWith('http');
            if (isFakeUrl(newApp.downloadURL)) newApp.downloadURL = "";
            if (isFakeUrl(newApp.iconURL)) newApp.iconURL = "";

            if (inspectedData && inspectedData.bundleIdentifier) {
                newApp.bundleIdentifier = inspectedData.bundleIdentifier;
                newApp.version = inspectedData.version;
            }

            onImport(newApp);
            onClose();

        } catch (err: any) {
            console.error(err);
            setError("Failed to process. If providing a link, ensure it is accessible. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const performBulkImport = async () => {
        const urls = bulkInput.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length === 0) {
            setError("Please enter at least one URL.");
            return;
        }

        setLoading(true);
        setError(null);
        setStatusMessage(`Analyzing ${urls.length} links...`);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                I have a list of iOS IPA download URLs. 
                For each URL, generate a JSON object representing an app entry.
                
                URLs:
                ${JSON.stringify(urls)}

                Instructions:
                1. Infer "name" and "version" from the URL filename.
                2. For "bundleIdentifier":
                   - Do NOT lazy guess "com.example.app".
                   - Try to construct it from the URL path if it contains the developer name or project name.
                3. "downloadURL" MUST be the URL I provided.
                4. Return a JSON ARRAY of objects.
                
                Example Item Structure:
                {
                    "name": "App Name",
                    "bundleIdentifier": "com.dev.app",
                    "version": "1.0",
                    "versionDate": "${new Date().toISOString().split('T')[0]}",
                    "versionDescription": "Imported from URL",
                    "downloadURL": "THE_INPUT_URL",
                    "localizedDescription": "Imported app.",
                    "iconURL": "", 
                    "tintColor": "#3b82f6",
                    "category": "Utilities",
                    "size": 0
                }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const text = response.text;
            if (!text) throw new Error("No response from AI");

            const apps: any[] = JSON.parse(text);
            
            if (Array.isArray(apps)) {
                let count = 0;
                apps.forEach(app => {
                    onImport({
                        ...DEFAULT_APP,
                        ...app,
                        id: undefined, // Let parent gen ID
                        screenshotURLs: []
                    });
                    count++;
                });
                setStatusMessage(`Successfully imported ${count} apps!`);
                setTimeout(onClose, 1000);
            } else {
                throw new Error("AI did not return an array.");
            }

        } catch (err: any) {
            console.error(err);
            setError("Bulk import failed. Ensure URLs are valid.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-slate-400 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="p-8 pb-4 shrink-0">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Smart Import</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Search for an app, paste a link, or paste a SideStore Error Log to fix it.
                    </p>
                </div>

                {/* Tabs */}
                <div className="px-8 border-b border-slate-800 flex gap-6">
                    <button 
                        onClick={() => { setMode('search'); setError(null); }}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mode === 'search' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        <Search size={16} /> Single Search
                    </button>
                    <button 
                        onClick={() => { setMode('bulk'); setError(null); }}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${mode === 'bulk' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        <List size={16} /> Bulk Import
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto">
                    
                    {mode === 'search' ? (
                        <>
                            <div className="space-y-2">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        {input.startsWith('http') ? <Link size={18} className="text-indigo-400" /> : <Search size={18} className="text-slate-500" />}
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-4 py-4 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        placeholder="Search, paste URL, or paste Error Log..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && performSearch(input)}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    If you paste a URL, we will attempt to <strong>inspect</strong> the file for 100% accurate Bundle IDs (if CORS allowed).
                                </p>
                            </div>
                            
                            {!showGuide && !loading && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Popular Open Source Apps</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Delta Emulator', 'UTM', 'Enmity', 'Provenance', 'uYouPlus'].map((app) => (
                                            <button
                                                key={app}
                                                onClick={() => performSearch(app)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/50 text-xs text-slate-300 transition-all"
                                            >
                                                {app}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">
                                Paste a list of direct IPA download URLs (one per line). <br/>
                                <span className="text-xs text-amber-500">Note: Terabox/Mega links are not supported for Direct Import.</span>
                            </p>
                            <textarea 
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                placeholder={`https://example.com/app1.ipa\nhttps://example.com/app2.ipa\n...`}
                                className="w-full h-48 bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                        </div>
                    )}

                    {groundingLinks.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Search Sources</h4>
                            <div className="flex flex-col gap-1.5">
                                {groundingLinks.map((chunk, idx) => (
                                    chunk.web && (
                                        <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 truncate">
                                            <Link size={10} />
                                            <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                                        </a>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-xl flex gap-3 items-start animate-in fade-in">
                            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={mode === 'search' ? () => performSearch(input) : performBulkImport}
                        disabled={loading || (mode === 'search' ? !input.trim() : !bulkInput.trim())}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-95 active:scale-95"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" />
                                <span>{statusMessage || 'Processing...'}</span>
                            </>
                        ) : (
                            <>
                                {mode === 'search' ? <span>Find & Import</span> : <span>Process List</span>}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    {/* Help / Sources Guide */}
                    {mode === 'search' && (
                        <div className="pt-2 border-t border-slate-800">
                            <button 
                                onClick={() => setShowGuide(!showGuide)}
                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors mx-auto"
                            >
                                <Info size={14} />
                                <span>Where do we search?</span>
                            </button>

                            {showGuide && (
                                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 space-y-3 animate-in slide-in-from-top-2 text-sm">
                                    <div className="flex items-start gap-3">
                                        <Binary className="text-blue-400 shrink-0 mt-1" size={16} />
                                        <div>
                                            <p className="font-bold text-slate-200">Binary Inspection</p>
                                            <p className="text-slate-400 text-xs mt-1">
                                                We now inspect the IPA file directly (if CORS allowed) to get the <strong>exact</strong> Bundle ID.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Github className="text-white shrink-0 mt-1" size={16} />
                                        <div>
                                            <p className="font-bold text-slate-200">GitHub</p>
                                            <p className="text-slate-400 text-xs mt-1">
                                                We support Releases and raw file links.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Archive className="text-amber-400 shrink-0 mt-1" size={16} />
                                        <div>
                                            <p className="font-bold text-slate-200">Archive.org</p>
                                            <p className="text-slate-400 text-xs mt-1">
                                                We prioritize the <strong>ios-ipa-collection</strong>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};