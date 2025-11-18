
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const CardViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const TableViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const SortIcon = ({ direction }) => <svg style={{ width: 14, height: 14, opacity: direction ? 1 : 0.3, transform: direction === 'descending' ? 'rotate(180deg)' : 'none' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;

// --- CONFIGURATION ---
const STOCK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyY4ys2VzcsmslZj-vYieV1l-RRTp90eDMwcdANFZ3qecf8VRPgz-dNo46jqIqencqF/exec';

// --- INDEXEDDB HELPER ---
const DB_NAME = 'StockDataDB';
const DB_VERSION = 4;
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
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
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

const StockTable = ({ items, onSort, sortConfig }) => {
    const headers = [
        { key: 'style', label: 'Style' },
        { key: 'color', label: 'Color' },
        { key: 'size', label: 'Size' },
        { key: 'stock', label: 'Stock' },
    ];
    return (
        <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        {headers.map(header => (
                            <th key={header.key} style={styles.th} onClick={() => onSort(header.key)}>
                                <div style={styles.thContent}>
                                    {header.label}
                                    <SortIcon direction={sortConfig.key === header.key ? sortConfig.direction : null} />
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} style={styles.tr}>
                            <td style={styles.td}>{item.style}</td>
                            <td style={styles.td}>{item.color}</td>
                            <td style={styles.td}>{item.size}</td>
                            <td style={{...styles.td, ...styles.tdStock}}>{item.stock}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export const StockOverview = () => {
    const [allStock, setAllStock] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('card');
    const [sortConfig, setSortConfig] = useState({ key: 'style', direction: 'ascending' });

    const processAndSetData = useCallback((items, timestamp) => {
        setAllStock(items);
        setLastUpdate(timestamp);
    }, []);

    useEffect(() => {
        const syncData = async () => {
            setIsLoading(true);
            setIsSyncing(false);
            setError('');
            let localDataLoaded = false;
            let localTimestamp = '';
            
            try {
                // Step 1: Attempt to load from IndexedDB first for an instant display
                const [localMeta, localStock] = await Promise.all([stockDb.getMetadata(), stockDb.getAllStock()]);
    
                if (localMeta && Array.isArray(localStock) && localStock.length > 0) {
                    localTimestamp = (localMeta as any).timestamp;
                    processAndSetData(localStock, localTimestamp);
                    setIsLoading(false); // Show cached data immediately
                    localDataLoaded = true;
                }

                // Step 2: Start background sync to fetch the latest data
                setIsSyncing(true);
                const response = await fetch(STOCK_SCRIPT_URL);
                if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
                const result = await response.json();
    
                if (result.success) {
                    // Update UI and DB only if network data is newer
                    if (!localTimestamp || result.timestamp > localTimestamp) {
                        await stockDb.clearAndAddStock(result.data);
                        await stockDb.setMetadata({ timestamp: result.timestamp });
                        processAndSetData(result.data, result.timestamp); // Re-render with fresh data
                    }
                } else {
                    throw new Error(result.message || 'API returned an error.');
                }
    
            } catch (err) {
                console.error("Data sync error:", err);
                // If local data is already showing, a toast is less disruptive for background errors
                if (localDataLoaded) {
                    showToast('Could not sync latest stock data.', 'error');
                } else {
                    // Show a full-page error only if we failed to load any data at all
                    setError('Could not load stock data. Please check your connection and try again.');
                }
            } finally {
                setIsLoading(false); // Ensure main loader is off
                setIsSyncing(false); // Turn off background sync indicator
            }
        };
    
        syncData();
    }, [processAndSetData]);

    const filteredAndSortedData = useMemo(() => {
        let items = [...allStock];
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.style.toLowerCase().includes(lowercasedTerm) ||
                item.color.toLowerCase().includes(lowercasedTerm)
            );
        }

        if (sortConfig.key) {
            items.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                const aIsNum = !isNaN(aVal);
                const bIsNum = !isNaN(bVal);

                if (aIsNum && bIsNum) {
                    return sortConfig.direction === 'ascending' ? aVal - bVal : bVal - aVal;
                }
                if (String(aVal).toLowerCase() < String(bVal).toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (String(aVal).toLowerCase() > String(bVal).toLowerCase()) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return items;
    }, [searchTerm, allStock, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;

        if (filteredAndSortedData.length === 0) {
            return (
                <div style={styles.centeredMessage}>
                    {allStock.length === 0 ? "No stock data available." : "No items found for your search."}
                </div>
            );
        }
        
        if (view === 'table') {
            return <StockTable items={filteredAndSortedData} onSort={requestSort} sortConfig={sortConfig} />;
        }
        
        // Card View
        const groupedData = groupStockData(filteredAndSortedData);
        const styleNames = Object.keys(groupedData).sort();

        return (
            <div style={styles.listContainer}>
                {styleNames.map(styleName => (
                    <StockStyleGroup key={styleName} styleName={styleName} data={groupedData[styleName]} />
                ))}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                <div style={styles.headerInfo}>
                    <p style={styles.lastUpdated}>Last Updated: {formatTimestamp(lastUpdate)}
                        {isSyncing && <span style={styles.syncingIndicator}> (Syncing...)</span>}
                    </p>
                    <div style={styles.viewToggle}>
                        <button onClick={() => setView('card')} style={view === 'card' ? styles.toggleButtonActive : styles.toggleButton}><CardViewIcon /></button>
                        <button onClick={() => setView('table')} style={view === 'table' ? styles.toggleButtonActive : styles.toggleButton}><TableViewIcon /></button>
                    </div>
                </div>
                <div style={styles.searchContainer}>
                    <SearchIcon />
                    <input
                        type="text"
                        style={styles.searchInput}
                        className="global-search-input"
                        placeholder="Search by style or color..."
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
    container: { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 },
    headerCard: { backgroundColor: 'var(--card-bg)', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    headerInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    lastUpdated: { fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500 },
    syncingIndicator: { color: 'var(--brand-color)', fontSize: '0.8rem', fontWeight: 500 },
    viewToggle: { display: 'flex', backgroundColor: 'var(--light-grey)', borderRadius: '8px', padding: '4px' },
    toggleButton: { background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '6px' },
    toggleButtonActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--brand-color)', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
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
    // Table Styles
    tableContainer: { flex: 1, overflowY: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f8f9fa', padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)', cursor: 'pointer', userSelect: 'none' },
    thContent: { display: 'flex', alignItems: 'center', gap: '8px' },
    tr: { borderBottom: '1px solid var(--skeleton-bg)' },
    td: { padding: '12px 16px', color: 'var(--text-color)', fontSize: '0.9rem' },
    tdStock: { fontWeight: 600, color: 'var(--dark-grey)', textAlign: 'right' },
};