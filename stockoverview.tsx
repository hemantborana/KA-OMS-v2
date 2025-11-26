
import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const CardViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const TableViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const SortIcon = ({ direction }) => <svg style={{ width: 14, height: 14, opacity: direction ? 1 : 0.3, transform: direction === 'descending' ? 'rotate(180deg)' : 'none', color: 'var(--brand-color)' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;

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
const Marquee: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={styles.marqueeContainer}>
        <div style={styles.marqueeContent}>
            <span style={styles.marqueeItem}>{children}</span>
            <span style={styles.marqueeItem} aria-hidden="true">{children}</span>
        </div>
    </div>
);


const StockStyleGroup: React.FC<{ styleName: string; data: any; }> = ({ styleName, data }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const sortedColors = useMemo(() => Object.keys(data.itemsByColor).sort(), [data.itemsByColor]);

    const getColorTagStyle = (colorName: string): React.CSSProperties => {
        const upper = colorName.toUpperCase();
        const isDark = upper.includes('BLK') || upper.includes('BLACK') || upper.includes('NAVY');
        
        if (isDark) {
            return {
                backgroundColor: upper.includes('NAVY') ? '#2d3748' : '#1A202C',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: '6px',
                display: 'inline-block',
                fontSize: '0.9rem',
            };
        }
        
        return {
            backgroundColor: 'var(--light-grey)',
            color: 'var(--dark-grey)',
            padding: '4px 10px',
            borderRadius: '6px',
            display: 'inline-block',
            border: '1px solid var(--skeleton-bg)',
            fontSize: '0.9rem',
        };
    };

    return (
        <div style={styles.styleCard}>
            <button style={styles.styleHeader} onClick={() => setIsCollapsed(!isCollapsed)} aria-expanded={!isCollapsed}>
                <div style={styles.styleInfo}>
                    <span style={styles.styleName}>{styleName}</span>
                    <span style={styles.styleTotalStock}>Total Stock: {data.total}</span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            <div style={isCollapsed ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                <div style={styles.collapsibleContentWrapper}>
                    <div style={styles.styleDetails}>
                        {sortedColors.map((color) => (
                            <div key={color} style={{...styles.colorGroup}}>
                                <h4 style={{...styles.colorTitle, ...getColorTagStyle(color)}}>{color}</h4>
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
                </div>
            </div>
        </div>
    );
};

const StockTable = ({ items, onHeaderClick, sortConfigs, isMobile }) => {
    const headers = [
        { key: 'style', label: 'Style' },
        { key: 'color', label: 'Color' },
        { key: 'size', label: 'Size' },
        { key: 'stock', label: 'Stock' },
    ];
    
    const thStyle = isMobile ? { ...styles.th, ...styles.thMobile } : styles.th;
    const tdStyle = isMobile ? { ...styles.td, ...styles.tdMobile, textAlign: 'center' as const } : { ...styles.td, textAlign: 'center' as const };

    return (
        <table style={styles.table}>
            <thead>
                <tr>
                    {headers.map(header => {
                         const sortIndex = sortConfigs.findIndex(s => s.key === header.key);
                         const sort = sortIndex > -1 ? sortConfigs[sortIndex] : null;
                         return (
                            <th key={header.key} style={thStyle} onClick={(e) => onHeaderClick(e, header.key)}>
                                <div style={styles.thContent}>
                                    {header.label}
                                    {sort && <span style={styles.sortPriorityBadge}>{sortIndex + 1}</span>}
                                    <SortIcon direction={sort ? sort.direction : null} />
                                </div>
                            </th>
                        )
                    })}
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index} style={index % 2 !== 0 ? { ...styles.tr, backgroundColor: 'var(--stripe-bg)' } : styles.tr}>
                        <td style={{...tdStyle, textAlign: 'left'}}>{item.style}</td>
                        <td style={{...tdStyle, textAlign: 'left'}}>{item.color}</td>
                        <td style={tdStyle}>{item.size}</td>
                        <td style={tdStyle}>{item.stock}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const SortPopover = ({ target, sortKey, currentSorts, onSortChange, onClose, isClosing }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({});

    const currentSort = currentSorts.find(s => s.key === sortKey);
    const currentDirection = currentSort ? currentSort.direction : null;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);
    
    useLayoutEffect(() => {
        if (target && popoverRef.current) {
            const popoverWidth = popoverRef.current.offsetWidth || 150;
            const offsetParent = target.offsetParent as HTMLElement | null;

            if (offsetParent) {
                let top = target.offsetTop + target.offsetHeight + 8;
                let left = target.offsetLeft + target.offsetWidth / 2;
                
                const parentWidth = offsetParent.clientWidth;

                if ((left - popoverWidth / 2) < 8) {
                   left = (popoverWidth / 2) + 8;
                }
                if ((left + popoverWidth / 2) > (parentWidth - 8)) {
                   left = parentWidth - (popoverWidth / 2) - 8;
                }

                setStyle({
                    top: `${top}px`,
                    left: `${left}px`,
                });
            }
        }
    }, [target]);
    
    const animationStyle: React.CSSProperties = {
        animation: `${isClosing ? 'popover-out' : 'popover-in'} 0.2s ease-out forwards`,
        transformOrigin: 'top center',
    };

    return (
        <div ref={popoverRef} style={{...styles.popover, ...style, ...animationStyle}}>
            <button
                style={currentDirection === 'ascending' ? styles.popoverButtonActive : styles.popoverButton}
                onClick={() => onSortChange(sortKey, 'ascending')}
            >
                Ascending
            </button>
            <button
                style={currentDirection === 'descending' ? styles.popoverButtonActive : styles.popoverButton}
                onClick={() => onSortChange(sortKey, 'descending')}
            >
                Descending
            </button>
            {currentDirection && (
                 <button
                    style={styles.popoverClearButton}
                    onClick={() => onSortChange(sortKey, 'clear')}
                >
                    Clear Sort
                </button>
            )}
        </div>
    );
};

export const StockOverview = () => {
    const [allStock, setAllStock] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('card');
    const [sortConfigs, setSortConfigs] = useState([{ key: 'style', direction: 'ascending' }]);
    const [popoverState, setPopoverState] = useState({ visible: false, target: null, sortKey: null, isClosing: false });
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                const [localMeta, localStock] = await Promise.all([stockDb.getMetadata(), stockDb.getAllStock()]);
    
                if (localMeta && Array.isArray(localStock) && localStock.length > 0) {
                    localTimestamp = (localMeta as any).timestamp;
                    processAndSetData(localStock, localTimestamp);
                    setIsLoading(false); 
                    localDataLoaded = true;
                }

                setIsSyncing(true);
                const response = await fetch(STOCK_SCRIPT_URL);
                if (!response.ok) throw new Error(`Network error: ${response.statusText}`);
                const result = await response.json();
    
                if (result.success) {
                    if (!localTimestamp || result.timestamp > localTimestamp) {
                        await stockDb.clearAndAddStock(result.data);
                        await stockDb.setMetadata({ timestamp: result.timestamp });
                        processAndSetData(result.data, result.timestamp);
                    }
                } else {
                    throw new Error(result.message || 'API returned an error.');
                }
    
            } catch (err) {
                console.error("Data sync error:", err);
                if (localDataLoaded) {
                    showToast('Could not sync latest stock data.', 'error');
                } else {
                    setError('Could not load stock data. Please check your connection and try again.');
                }
            } finally {
                setIsLoading(false); 
                setIsSyncing(false); 
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

        if (sortConfigs.length > 0) {
            items.sort((a, b) => {
                for (const config of sortConfigs) {
                    const { key, direction } = config;
                    const aVal = a[key];
                    const bVal = b[key];
                    const aIsNum = !isNaN(aVal);
                    const bIsNum = !isNaN(bVal);

                    let comparison = 0;
                    if (aIsNum && bIsNum) {
                        comparison = aVal - bVal;
                    } else {
                        comparison = String(aVal).localeCompare(String(bVal));
                    }

                    if (comparison !== 0) {
                        return direction === 'ascending' ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }
        return items;
    }, [searchTerm, allStock, sortConfigs]);

    const handleClosePopover = () => {
        if (popoverState.visible && !popoverState.isClosing) {
            setPopoverState(prev => ({ ...prev, isClosing: true }));
            setTimeout(() => {
                setPopoverState({ visible: false, target: null, sortKey: null, isClosing: false });
            }, 200); // Animation duration
        }
    };

    const handleHeaderClick = (event, key) => {
        if (popoverState.visible && popoverState.sortKey === key && !popoverState.isClosing) {
            handleClosePopover();
        } else {
            setPopoverState({
                visible: true,
                target: event.currentTarget,
                sortKey: key,
                isClosing: false,
            });
        }
    };
    
    const handleSortChange = (key, direction) => {
        setSortConfigs(prevConfigs => {
            const existingIndex = prevConfigs.findIndex(c => c.key === key);
            let newConfigs = [...prevConfigs];
    
            if (direction === 'clear') {
                if (existingIndex > -1) {
                    newConfigs.splice(existingIndex, 1);
                }
            } else {
                if (existingIndex > -1) {
                    newConfigs[existingIndex] = { ...newConfigs[existingIndex], direction };
                } else {
                    newConfigs.push({ key, direction });
                }
            }
            return newConfigs;
        });
        handleClosePopover();
    };

    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;

        const animationKey = `${view}-${JSON.stringify(sortConfigs)}-${searchTerm}`;

        const content = () => {
            if (filteredAndSortedData.length === 0) {
                return (
                    <div style={styles.centeredMessage}>
                        {allStock.length === 0 ? "No stock data available." : "No items found for your search."}
                    </div>
                );
            }
            
            if (view === 'table') {
                return (
                    <div style={{...styles.tableContainer, position: 'relative'}}>
                        {popoverState.visible && (
                            <SortPopover
                                target={popoverState.target}
                                sortKey={popoverState.sortKey}
                                currentSorts={sortConfigs}
                                onSortChange={handleSortChange}
                                onClose={handleClosePopover}
                                isClosing={popoverState.isClosing}
                            />
                        )}
                        <StockTable items={filteredAndSortedData} onHeaderClick={handleHeaderClick} sortConfigs={sortConfigs} isMobile={isMobile} />
                    </div>
                );
            }
            
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
            <div key={animationKey} className="fade-in-slide">
                {content()}
            </div>
        )
    };

    return (
        <div style={styles.container}>
            <style>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                @keyframes popover-in {
                    from { opacity: 0; transform: scale(0.95) translateY(-5px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes popover-out {
                    from { opacity: 1; transform: scale(1) translateY(0); }
                    to { opacity: 0; transform: scale(0.95) translateY(-5px); }
                }
                .fade-in-slide { animation: fadeInSlide 0.4s ease-out forwards; }
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <div style={styles.headerCard}>
                <div style={styles.headerInfo}>
                     <h2 style={styles.pageTitle}>Stock Overview</h2>
                    <div style={styles.viewToggle}>
                        <button onClick={() => setView('card')} style={view === 'card' ? styles.toggleButtonActive : styles.toggleButton}><CardViewIcon /></button>
                        <button onClick={() => setView('table')} style={view === 'table' ? styles.toggleButtonActive : styles.toggleButton}><TableViewIcon /></button>
                    </div>
                </div>
                <div style={isSearchFocused ? {...styles.searchContainer, ...styles.searchContainerActive} : styles.searchContainer}>
                    <SearchIcon />
                    <input
                        type="text"
                        style={styles.searchInput}
                        className="global-search-input"
                        placeholder="Search by style or color..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                </div>
                 <div style={styles.marqueeWrapper}>
                    <Marquee>
                        <p style={styles.lastUpdated}>
                            Last Updated: {formatTimestamp(lastUpdate)}
                            {isSyncing && <span style={styles.syncingIndicator}> (Syncing...)</span>}
                        </p>
                    </Marquee>
                 </div>
            </div>
            {renderContent()}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '0rem', flex: 1 },
    headerCard: {
        padding: '1rem 1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem', 
        border: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'linear-gradient(to bottom, var(--light-grey) 90%, transparent)',
    },
    pageTitle: { display: 'none' },
    headerInfo: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
    lastUpdated: { fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500, whiteSpace: 'nowrap' },
    syncingIndicator: { color: 'var(--brand-color)', fontSize: '0.8rem', fontWeight: 500 },
    viewToggle: { display: 'flex', backgroundColor: 'var(--light-grey)', borderRadius: '8px', padding: '4px' },
    toggleButton: { background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '6px' },
    toggleButtonActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--brand-color)', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    searchContainer: { 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 12px',
        backgroundColor: 'var(--card-bg)', 
        padding: '11px', 
        borderRadius: '20px',
        border: '1px solid transparent',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    searchContainerActive: {
        borderColor: 'var(--brand-color)',
    },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem', paddingLeft: '1rem', paddingRight: '1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    styleCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', boxShadow: 'rgba(0, 0, 0, 0.04) 0px 2px 4px', border: 'none', overflow: 'hidden' },
    styleHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    styleInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    styleName: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    styleTotalStock: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    styleDetails: { padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    colorGroup: {borderTop: '1px solid var(--separator-color)', paddingTop: '1rem'},
    colorTitle: { fontWeight: 600, marginBottom: '0.75rem' },
    sizeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' },
    sizeItem: { display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--light-grey)', padding: '0.5rem 0.75rem', borderRadius: '6px' },
    sizeLabel: { fontWeight: 500, color: 'var(--text-color)' },
    sizeStock: { fontWeight: 600, color: 'var(--dark-grey)' },
    // Table Styles
    tableContainer: { flex: 1, overflowY: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--separator-color)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: 'var(--card-bg-tertiary)', padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '1px solid var(--separator-color)', cursor: 'pointer', userSelect: 'none', fontSize: '0.8rem' },
    thContent: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    tr: { borderBottom: '1px solid var(--separator-color)' },
    td: { padding: '16px 20px', color: 'var(--text-color)', fontSize: '0.9rem' },
    tdStock: { fontWeight: 600, color: 'var(--dark-grey)' },
    thMobile: { padding: '12px 8px', fontSize: '0.8rem' },
    tdMobile: { padding: '12px 8px', fontSize: '0.85rem' },
    // Marquee Styles
    marqueeWrapper: {
        backgroundColor: 'var(--card-bg-tertiary)',
        borderRadius: '12px',
        padding: '0.25rem 0',
    },
    marqueeContainer: { 
        width: '100%', 
        overflow: 'hidden', 
        position: 'relative', 
        display: 'flex',
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' 
    },
    marqueeContent: { 
        display: 'flex',
        width: 'fit-content',
        animation: 'marquee 25s linear infinite',
    },
    marqueeItem: {
        whiteSpace: 'nowrap',
        padding: '0 2rem',
    },
    // Animation Styles
    collapsibleContainer: { display: 'grid', gridTemplateRows: '0fr', transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)' },
    collapsibleContainerExpanded: { gridTemplateRows: '1fr' },
    collapsibleContentWrapper: { overflow: 'hidden', minHeight: 0 },
    // Sort Popover
    popover: {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '6px',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '10px',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        transform: 'translateX(-50%)',
        zIndex: 1000,
    },
    popoverButton: {
        background: 'transparent',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--dark-grey)',
        fontSize: '0.9rem',
        width: '150px'
    },
    popoverButtonActive: {
        background: 'var(--brand-color)',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        textAlign: 'left',
        color: '#fff',
        fontSize: '0.9rem',
        fontWeight: 600,
        width: '150px'
    },
    popoverClearButton: {
        background: 'transparent',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '6px',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'var(--red)',
        fontSize: '0.9rem',
        borderTop: '1px solid var(--glass-border)',
        marginTop: '4px',
        width: '150px'
    },
    sortPriorityBadge: {
        backgroundColor: 'var(--brand-color)',
        color: 'white',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.7rem',
        fontWeight: 'bold',
    },
};
