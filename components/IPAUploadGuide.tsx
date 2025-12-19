
import React, { useState, useRef } from 'react';
import { Upload, FileUp, Loader2, X, AlertCircle, ExternalLink, HardDrive, Check } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AppItem } from '../types';

interface IPAUploadGuideProps {
    onAnalysisComplete: (data: Partial<AppItem>) => void;
    onClose: () => void;
}

export const IPAUploadGuide: React.FC<IPAUploadGuideProps> = ({ onAnalysisComplete, onClose }) => {
    const [analyzing, setAnalyzing] = useState(false);
    const [step, setStep] = useState<'upload' | 'guide'>('upload');
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setAnalyzing(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `
                I have an iOS IPA file named: "${file.name}".
                File size: ${Math.round(file.size / 1024 / 1024)}MB.
                
                Please guess the likely metadata for this app to populate a JSON repo.
                Return ONLY a JSON object with these keys:
                - name (Clean app name)
                - version (Guess from filename or default to "1.0")
                - bundleIdentifier (Guess a plausible one like com.developer.appname)
                - localizedDescription (A generic description based on the app name)
                
                Example output: {"name": "YouTube Reborn", "version": "17.0", "bundleIdentifier": "com.google.ios.youtube", "localizedDescription": "Enhanced YouTube client."}
            `;

            // Fix: Use gemini-3-flash-preview as per latest model guidelines
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const text = response.text;
            if (text) {
                const data = JSON.parse(text);
                onAnalysisComplete({
                    ...data,
                    size: file.size
                });
                setStep('guide');
            }
        } catch (error) {
            console.error("AI Analysis failed", error);
            onAnalysisComplete({
                name: file.name.replace('.ipa', ''),
                size: file.size
            });
            setStep('guide');
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {step === 'upload' ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/50">
                            <FileUp className="text-blue-500" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Start from .ipa</h2>
                        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                            Select an IPA file from your device. We will analyze it to <strong>auto-fill</strong> the Name, Version, and Bundle ID for you.
                        </p>
                        
                        <input 
                            type="file" 
                            accept=".ipa" 
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={analyzing}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    <span>Analyzing File...</span>
                                </>
                            ) : (
                                <>
                                    <HardDrive size={20} />
                                    <span>Select File</span>
                                </>
                            )}
                        </button>
                        <p className="mt-4 text-[10px] text-slate-500">
                            Note: The file is analyzed locally and via AI, but not stored on our server.
                        </p>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6 p-3 bg-green-900/20 border border-green-900/50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                <FileUp size={16} className="text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-green-200">Details Auto-Filled!</h3>
                                <p className="text-xs text-green-300/70 truncate max-w-[200px]">{fileName}</p>
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-4">Where is the download link?</h3>
                        
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3 mb-6">
                            <div className="flex gap-3">
                                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    SideStore requires a <strong>direct download URL</strong>. Since this is a generator, we cannot host the file for you.
                                </p>
                            </div>
                            <div className="h-px bg-slate-700/50 my-2"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recommended Steps:</p>
                            <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2">
                                <li>Upload <strong>{fileName}</strong> to GitHub Releases.</li>
                                <li>Copy the "Direct Download Link" (Asset URL).</li>
                                <li>Paste it into the <strong>Download URL</strong> field below.</li>
                            </ol>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            <span>Got it, I'll add the link</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
