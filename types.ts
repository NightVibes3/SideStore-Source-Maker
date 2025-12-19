export interface AppItem {
    id: string;
    name: string;
    bundleIdentifier: string;
    developerName: string;
    version: string;
    versionDate: string;
    versionDescription: string;
    downloadURL: string;
    localizedDescription: string;
    iconURL: string;
    tintColor?: string;
    size?: number;
    category?: string;
    screenshotURLs: string[];
    compatibilityStatus?: 'safe' | 'jit_required' | 'trollstore_only' | 'jailbreak_only' | 'unknown';
}

export interface Repo {
    name: string;
    subtitle: string;
    description: string;
    iconURL: string;
    headerImageURL: string;
    website: string;
    tintColor: string;
    apps: AppItem[];
}

export interface DeviceProfile {
    model: 'iPhone 16 Pro' | 'iPhone 15' | 'iPhone SE' | 'iPad Pro';
    iosVersion: string;
}

export interface Deployment {
    id: string;
    url: string;
    createdAt: string;
    type: 'public' | 'secret';
    name: string;
}

export const DEFAULT_APP: AppItem = {
    id: "default",
    name: "New App",
    bundleIdentifier: "com.example.app",
    developerName: "Developer Name",
    version: "1.0",
    versionDate: new Date().toISOString().split('T')[0],
    versionDescription: "Initial release",
    downloadURL: "",
    localizedDescription: "Description of the app...",
    iconURL: "",
    tintColor: "#3b82f6",
    size: 0,
    category: "Utilities",
    screenshotURLs: [],
    compatibilityStatus: 'unknown'
};

export const DEFAULT_REPO: Repo = {
    name: "My Repo",
    subtitle: "A collection of apps",
    description: "Welcome to my repository.",
    iconURL: "",
    headerImageURL: "",
    website: "",
    tintColor: "#3b82f6",
    apps: []
};

export const DEFAULT_DEVICE: DeviceProfile = {
    model: 'iPhone 16 Pro',
    iosVersion: '18.0'
};

export const SAMPLE_REPOS: Record<string, Repo> = {
    "Empty Starter": DEFAULT_REPO,
    "Emulators Pack": {
        ...DEFAULT_REPO,
        name: "Retro Gaming",
        subtitle: "Classic Consoles",
        description: "The best emulators for iOS, ready to sideload.",
        apps: [
            {
                ...DEFAULT_APP,
                id: "delta-sample",
                name: "Delta",
                bundleIdentifier: "com.rileytestut.Delta",
                developerName: "Riley Testut",
                version: "1.5.1",
                localizedDescription: "The definitive all-in-one emulator for iPhone.",
                iconURL: "https://github.com/rileytestut/Delta/raw/main/Assets/AppIcon.png",
                tintColor: "#6d28d9",
                category: "Games",
                compatibilityStatus: 'safe'
            },
            {
                ...DEFAULT_APP,
                id: "provenance-sample",
                name: "Provenance",
                bundleIdentifier: "com.provenance-emu.provenance",
                developerName: "Provenance Emu",
                version: "2.2.0",
                localizedDescription: "Multi-system emulator frontend supporting Atari, Sega, Nintendo, Sony and more.",
                iconURL: "https://github.com/Provenance-Emu/Provenance/raw/develop/Provenance/Assets.xcassets/AppIcon.appiconset/Icon-60@3x.png",
                tintColor: "#10b981",
                category: "Games",
                compatibilityStatus: 'safe'
            }
        ]
    }
};

export const validateURL = (url: string | undefined, context: 'image' | 'file' | 'website'): string | null => {
    if (!url || url.trim() === '') return null;
    const lower = url.toLowerCase();
    if (!lower.startsWith('https://')) return "Must start with https://";
    if (lower.includes('localhost') || lower.includes('127.0.0.1')) return "Localhost links won't work.";
    if (!lower.includes('.')) return "Invalid domain.";
    return null;
};

export const compareVersions = (v1: string, v2: string) => {
    const clean = (v: string) => (v || "").replace(/^v/i, '').trim();
    const s1 = clean(v1);
    const s2 = clean(v2);
    if (s1 === s2) return 0;
    const p1 = s1.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n));
    const p2 = s2.replace(/[^0-9.]/g, '').split('.').map(n => parseInt(n));
    const n1 = p1.filter(n => !isNaN(n));
    const n2 = p2.filter(n => !isNaN(n));
    if (n1.length === 0 && n2.length === 0) return s1.localeCompare(s2);
    const len = Math.max(n1.length, n2.length);
    for (let i = 0; i < len; i++) {
        const val1 = n1[i] || 0;
        const val2 = n2[i] || 0;
        if (val1 > val2) return 1;
        if (val1 < val2) return -1;
    }
    return 0;
};

export const getFilteredApps = (apps: AppItem[], config: { deduplicate: boolean, filterIncompatible: boolean }): AppItem[] => {
    if (!config.deduplicate && !config.filterIncompatible) return apps;
    let processed = [...apps];
    if (config.filterIncompatible) {
        processed = processed.filter(app => {
            if (app.compatibilityStatus && app.compatibilityStatus !== 'unknown') {
                return !['jailbreak_only', 'trollstore_only', 'jit_required'].includes(app.compatibilityStatus);
            }
            return true;
        });
    }
    if (!config.deduplicate) return processed;
    const latestMap = new Map<string, AppItem>();
    processed.forEach(app => {
        const key = app.bundleIdentifier?.toLowerCase() || app.name.toLowerCase();
        const existing = latestMap.get(key);
        if (!existing || compareVersions(app.version, existing.version) >= 0) {
            latestMap.set(key, app);
        }
    });
    return Array.from(latestMap.values());
};

export const processRepoForExport = (repo: Repo, config: { deduplicate: boolean, filterIncompatible: boolean }): any => {
    const processedApps = getFilteredApps(repo.apps, config);
    return {
        ...repo,
        apps: processedApps.map(({ compatibilityStatus, ...rest }) => ({
            ...rest,
            screenshotURLs: rest.screenshotURLs.filter(u => u && u.trim() !== "")
        }))
    };
};