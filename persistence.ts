
export const PERSISTENCE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export const getPersistedState = <T>(key: string, defaultValue: T): T => {
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const state = JSON.parse(saved);
            const lastSeen = localStorage.getItem('ka_oms_last_seen');
            if (lastSeen && Date.now() - parseInt(lastSeen) < PERSISTENCE_WINDOW_MS) {
                return state;
            }
        } catch (e) {
            console.error(`Error parsing persisted state for ${key}:`, e);
        }
    }
    return defaultValue;
};

export const setPersistedState = <T>(key: string, state: T): void => {
    localStorage.setItem(key, JSON.stringify(state));
};
