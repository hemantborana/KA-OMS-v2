import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;

// --- CONFIGURATION ---
const STOCK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyY4ys2VzcsmslZj-vYieV1l-RRTp90eDMwcdANFZ3qecf8VRPgz-dNo46jqIqencqF/exec'; // Replace with your deployed script URL

// --- INDEXEDDB HELPER ---
const DB_NAME = 'StockDataDB';
const DB_VERSION = 1;
const STOCK_STORE = 'stockItems';
const METADATA_STORE = 'metadata';

const stockDb = {
    db: null,
    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STOCK_STORE)) {
                    db.createObjectStore(STOCK_STORE, { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains(METADATA_STORE)) {
                    db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); };
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    clearAndAddStock: async function(items) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STOCK_STORE], 'readwrite');
            const store = transaction.objectStore(STOCK_STORE);
            store.clear();
            items.forEach(item => store.add(item));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    getAllStock: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STOCK_STORE], 'readonly');
            const store = transaction.objectStore(STOCK_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    getMetadata: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([METADATA_STORE], 'readonly');
            const store = transaction.objectStore(METADATA_STORE);
            const request = store.get('syncInfo');
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    setMetadata: async function(metadata) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([METADATA_STORE], 'readwrite');
            const store = transaction.objectStore(METADATA_STORE);
            store.put({ id: 'syncInfo', ...metadata });
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }
};

// --- HELPER FUNCTIONS ---
const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
        const year = ts.substring(0, 4);
        const month = parseInt(ts.substring(4, 6), 10) - 1;
        const day = ts.substring(6, 8);
        const hour = ts.substring(9, 11);
        const minute = ts.substring(11, 13);
        const date = new Date(year, month, day, hour, minute);
        return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
        return 'Invalid Date';
    }
};

const groupStockData = (data) => {
    if (!data) return {};
    const grouped = data.reduce((acc, item) => {
        if (!acc[item.style]) {
            acc[item.style] = { total: 0, items: [] };
        }
        acc[item.style].total += item.stock;
        acc[item.style].items.push(item);
        return acc;
    }, {});

    for (const style in grouped) {
        grouped[style].itemsByColor = grouped[style].items.reduce((acc, item) => {
            if (!acc[item.color]) {
                acc[item.color] = [];
            }
            acc[item.color].push(item);
            return acc;
        }, {});
    }
    return grouped;
};

// --- SUB-COMPONENTS ---
// FIX: Explicitly type component with React.FC to handle the `key` prop correctly.
const StockStyleGroup: React.FC<{ styleName: string; data: any; }> = ({ styleName, data }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const sortedColors = useMemo(() => Object.keys(data.itemsByColor).sort(), [data.itemsByColor]);

    return (
        <div style={styles.styleCard}>
            <button style={styles.styleHeader} onClick={() => setIsCollapsed(!isCollapsed)} aria-expanded={!isCollapsed}>
                <div style={styles.styleInfo}>
                    <span style={styles.styleName}>{styleName}</span>
                    <span style={styles.styleTotalStock}>Total Stock: {data.total}</span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            {!isCollapsed && (
                <div style={styles.styleDetails}>
                    {sortedColors.map(color => (
                        <div key={color} style={styles.colorGroup}>
                            <h4 style={styles.colorTitle}>{color}</h4>
                            <div style={styles.sizeGrid}>
                                {data.itemsByColor[color]
                                    .sort((a,b) => a.size.localeCompare(b.size, undefined, {numeric: true}))
                                    .map(item => (
                                        <div key={item.size} style={styles.sizeItem}>
                                            <span style={styles.sizeLabel}>{item.size}:</span>
                                            <span style={styles.sizeStock}>{item.stock}</span>
                                        </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


export const StockOverview = () => {
    const [stockData, setStockData] = useState({});
    const [lastUpdate, setLastUpdate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const processAndSetData = useCallback((items, timestamp) => {
        const grouped = groupStockData(items);
        setStockData(grouped);
        setLastUpdate(timestamp);
    }, []);

    useEffect(() => {
        const syncData = async () => {
            setIsLoading(true);
            setError('');
            
            // 1. Load from IndexedDB first
            let localTimestamp = '';
            try {
                const [localMeta, localStock] = await Promise.all([stockDb.getMetadata(), stockDb.getAllStock()]);
                // FIX: Add Array.isArray check as a type guard before accessing .length.
                if (localMeta && Array.isArray(localStock) && localStock.length > 0) {
                    localTimestamp = (localMeta as any).timestamp;
                    processAndSetData(localStock, localTimestamp);
                }
            } catch (dbError) {
                console.error("Error reading from IndexedDB:", dbError);
            } finally {
                setIsLoading(false); // Stop initial spinner after loading local data
            }

            // 2. Fetch from remote and compare
            try {
                const response = await fetch(STOCK_SCRIPT_URL);
                const result = await response.json();

                if (result.success) {
                    if (result.timestamp > localTimestamp) {
                        await stockDb.clearAndAddStock(result.data);
                        await stockDb.setMetadata({ timestamp: result.timestamp });
                        processAndSetData(result.data, result.timestamp);
                    }
                } else {
                    throw new Error(result.message || 'Failed to fetch stock data.');
                }
            } catch (fetchError) {
                console.error("Error fetching remote data:", fetchError);
                if (!lastUpdate) { // Only show error if no local data was loaded
                    setError('Could not fetch latest stock. Displaying cached data if available.');
                }
            }
        };

        syncData();
    }, [processAndSetData, lastUpdate]);

    const filteredStyles = useMemo(() => {
        if (!searchTerm) return Object.keys(stockData).sort();
        return Object.keys(stockData).filter(style =>
            style.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort();
    }, [searchTerm, stockData]);

    const renderContent = () => {
        if (isLoading && Object.keys(stockData).length === 0) {
            return <div style={styles.centeredMessage}><Spinner /></div>;
        }

        if (error && Object.keys(stockData).length === 0) {
            return <div style={styles.centeredMessage}>{error}</div>;
        }

        if (filteredStyles.length === 0) {
            return (
                <div style={styles.centeredMessage}>
                    {Object.keys(stockData).length === 0 ? "No stock data available." : "No styles found for your search."}
                </div>
            );
        }

        return (
            <div style={styles.listContainer}>
                {filteredStyles.map(styleName => (
                    <StockStyleGroup
                        key={styleName}
                        styleName={styleName}
                        data={stockData[styleName]}
                    />
                ))}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                <div style={styles.headerInfo}>
                    <p style={styles.lastUpdated}>Last Updated: {formatTimestamp(lastUpdate)}</p>
                </div>
                <div style={styles.searchContainer}>
                    <SearchIcon />
                    <input
                        type="text"
                        style={styles.searchInput}
                        placeholder="Search by style..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' },
    headerCard: { backgroundColor: 'var(--card-bg)', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    headerInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    lastUpdated: { fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500 },
    searchContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--light-grey)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    styleCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', overflow: 'hidden' },
    styleHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    styleInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    styleName: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    styleTotalStock: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    styleDetails: { padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    colorGroup: {},
    colorTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--brand-color)', marginBottom: '0.75rem', borderBottom: '1px solid var(--skeleton-bg)', paddingBottom: '0.5rem' },
    sizeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' },
    sizeItem: { display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--light-grey)', padding: '0.5rem 0.75rem', borderRadius: '6px' },
    sizeLabel: { fontWeight: 500, color: 'var(--text-color)' },
    sizeStock: { fontWeight: 600, color: 'var(--dark-grey)' },
};