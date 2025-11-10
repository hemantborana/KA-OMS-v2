import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBRV-i_70Xdk86bNuQQ43jiYkRNCXGvvyo",
  authDomain: "hcoms-221aa.firebaseapp.com",
  databaseURL: "https://hcoms-221aa-default-rtdb.firebaseio.com",
  projectId: "hcoms-221aa",
  storageBucket: "hcoms-221aa.appspot.com",
  messagingSenderId: "817694176734",
  appId: "1:817694176734:web:176bf69333bd7119d3194f",
  measurementId: "G-JB143EY71N"
};

// --- FIREBASE INITIALIZATION ---
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- INDEXEDDB HELPER ---
const DB_NAME = 'ItemCatalogDB';
const DB_VERSION = 1;
const ITEMS_STORE = 'items';
const METADATA_STORE = 'metadata';

const itemDb = {
    db: null,
    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) { return resolve(this.db); }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(ITEMS_STORE)) {
                    db.createObjectStore(ITEMS_STORE, { keyPath: 'Barcode' });
                }
                if (!db.objectStoreNames.contains(METADATA_STORE)) {
                    db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); };
            request.onerror = (event) => { console.error('IndexedDB error:', (event.target as IDBRequest).error); reject((event.target as IDBRequest).error); };
        });
    },
    clearAndAddItems: async function(items) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ITEMS_STORE], 'readwrite');
            const store = transaction.objectStore(ITEMS_STORE);
            store.clear();
            items.forEach(item => store.add(item));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    getAllItems: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([ITEMS_STORE], 'readonly');
            const store = transaction.objectStore(ITEMS_STORE);
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

const StyleMatrix = ({ style, catalogData, orderItems, onQuantityChange }) => {
    const styleData = catalogData[style] || {};
    const colors = Object.keys(styleData).sort();

    // Create a comprehensive, sorted list of all unique sizes for this style
    const allSizesForStyle = useMemo(() => {
        const sizeSet = new Set<string>();
        colors.forEach(color => {
            styleData[color].forEach(item => sizeSet.add(item.Size));
        });
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
        return Array.from(sizeSet).sort((a, b) => {
            const aIndex = sizeOrder.indexOf(a);
            const bIndex = sizeOrder.indexOf(b);
            if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
    }, [style, catalogData]);

    const itemsByBarcode = useMemo(() => {
        return orderItems.reduce((acc, item) => {
            acc[item.fullItemData.Barcode] = item.quantity;
            return acc;
        }, {});
    }, [orderItems]);

    // Helper to get dynamic styles for color cards
    const getColorCardStyle = (colorName) => {
        const baseStyle = { ...styles.colorCard };
        const upperColor = colorName.toUpperCase();
        if (upperColor.includes('BLK') || upperColor.includes('BLACK') || upperColor.includes('NAVY')) {
            baseStyle.backgroundColor = upperColor.includes('NAVY') ? '#2d3748' : '#1A202C';
            baseStyle.color = '#FFFFFF';
        } else {
            baseStyle.backgroundColor = '#FFFFFF';
            baseStyle.color = '#1A202C';
            baseStyle.border = '1px solid var(--skeleton-bg)';
        }
        return baseStyle;
    };

    return (
        <div style={styles.matrixContainer}>
            <h3 style={styles.matrixStyleTitle}>{style}</h3>
            <div style={styles.matrixGrid}>
                {colors.map(color => {
                    const itemsInColor = styleData[color];
                    const itemsBySize = itemsInColor.reduce((acc, item) => {
                        acc[item.Size] = item;
                        return acc;
                    }, {});

                    return (
                        <div key={color} style={getColorCardStyle(color)}>
                            <div style={styles.colorHeader}>{color}</div>
                            <div style={styles.sizeList}>
                                {allSizesForStyle.map(size => {
                                    const itemData = itemsBySize[size];
                                    if (itemData) {
                                        const quantity = itemsByBarcode[itemData.Barcode] || '';
                                        return (
                                            <div key={size} style={styles.sizeRow}>
                                                <label style={styles.sizeLabel}>{size}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    style={styles.quantityInput}
                                                    value={quantity}
                                                    onChange={(e) => onQuantityChange(itemData, e.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        );
                                    }
                                    // Render a placeholder to maintain grid alignment
                                    return <div key={size} style={{...styles.sizeRow, visibility: 'hidden'}}>...</div>;
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export const NewOrderEntry = () => {
    // --- STATE MANAGEMENT ---
    const [partyName, setPartyName] = useState('');
    const [items, setItems] = useState([]);
    
    // Party Name Suggestions State
    const [allParties, setAllParties] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const suggestionBoxRef = useRef(null);

    // Item Catalog State
    const [isSyncing, setIsSyncing] = useState(true);
    const [catalog, setCatalog] = useState({ styles: [], groupedData: {} });
    const [selectedStyle, setSelectedStyle] = useState('');
    const [styleSearchTerm, setStyleSearchTerm] = useState('');

    // --- DATA FETCHING & SYNC ---
    useEffect(() => {
        const partyRef = database.ref('PartyData');
        const listener = partyRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const partyList = Object.values(data).map((p: any) => p.name).filter(Boolean);
                setAllParties([...new Set(partyList)]);
            } else { setAllParties([]); }
        });
        return () => partyRef.off('value', listener);
    }, []);

    useEffect(() => {
        const metadataRef = database.ref('itemData/metadata');
        const syncCheck = (snapshot) => {
            const remoteMeta = snapshot.val() as { uploadDate: string; manualSync: string; };
            if (!remoteMeta) {
                console.error("Firebase item metadata not found!");
                setIsSyncing(false);
                loadItemsFromDb();
                return;
            }
            itemDb.getMetadata().then(localMeta => {
                const needsSync = !localMeta || remoteMeta.uploadDate !== (localMeta as any).uploadDate || remoteMeta.manualSync === 'Y';
                if (needsSync) {
                    setIsSyncing(true);
                    database.ref('itemData/items').once('value').then(itemSnapshot => {
                        const itemsData = itemSnapshot.val();
                        if (itemsData && Array.isArray(itemsData)) {
                            itemDb.clearAndAddItems(itemsData).then(() => {
                                itemDb.setMetadata({ uploadDate: remoteMeta.uploadDate }).then(() => {
                                    loadItemsFromDb();
                                    if (remoteMeta.manualSync === 'Y') {
                                        metadataRef.update({ manualSync: 'N' });
                                    }
                                });
                            });
                        }
                    }).finally(() => setIsSyncing(false));
                } else {
                    loadItemsFromDb();
                    setIsSyncing(false);
                }
            });
        };
        metadataRef.on('value', syncCheck);
        return () => metadataRef.off('value', syncCheck);
    }, []);

    const loadItemsFromDb = async () => {
        const dbItems = await itemDb.getAllItems() as any[];
        if (dbItems && dbItems.length > 0) {
            const grouped = dbItems.reduce((acc, item) => {
                const { Style, Color } = item;
                if (!Style || !Color) return acc;
                if (!acc[Style]) acc[Style] = {};
                if (!acc[Style][Color]) acc[Style][Color] = [];
                acc[Style][Color].push(item);
                return acc;
            }, {});
            setCatalog({ styles: Object.keys(grouped).sort(), groupedData: grouped });
        }
    };
    
    // --- UI INTERACTION HANDLERS ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target)) {
                setIsSuggestionsVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePartyNameChange = (e) => {
        const value = e.target.value;
        setPartyName(value);
        if (value.trim()) {
            const filtered = allParties.filter(p => p.toLowerCase().includes(value.toLowerCase()));
            if (!allParties.some(p => p.toLowerCase() === value.toLowerCase())) {
                filtered.push(`Add: ${value}`);
            }
            setSuggestions(filtered);
            setIsSuggestionsVisible(true);
        } else { setIsSuggestionsVisible(false); }
    };

    const handleSuggestionClick = (suggestion) => {
        if (suggestion.startsWith('Add: ')) {
            const newParty = suggestion.substring(5).trim();
            if (!allParties.some(p => p.toLowerCase() === newParty.toLowerCase())) {
                database.ref('PartyData').push().set({ name: newParty });
            }
            setPartyName(newParty);
        } else { setPartyName(suggestion); }
        setIsSuggestionsVisible(false);
    };

    const handleQuantityChange = (fullItemData, quantityStr) => {
        const quantity = parseInt(quantityStr, 10) || 0;
        const barcode = fullItemData.Barcode;
    
        setItems(currentItems => {
            const existingItemIndex = currentItems.findIndex(item => item.fullItemData.Barcode === barcode);
    
            if (quantity > 0) {
                if (existingItemIndex > -1) {
                    // Update quantity if item exists
                    const newItems = [...currentItems];
                    newItems[existingItemIndex] = { ...newItems[existingItemIndex], quantity: quantity };
                    return newItems;
                } else {
                    // Add new item if it doesn't exist
                    const price = parseFloat(String(fullItemData.MRP).replace(/[^0-9.-]+/g, "")) || 0;
                    const newItem = {
                        id: barcode, // Use barcode as a stable ID
                        quantity: quantity,
                        price: price,
                        fullItemData: fullItemData,
                    };
                    return [...currentItems, newItem];
                }
            } else {
                // Remove item if quantity is 0 or less
                if (existingItemIndex > -1) {
                    return currentItems.filter(item => item.fullItemData.Barcode !== barcode);
                }
            }
            return currentItems; // No change
        });
    };

    const { subtotal, gst, grandTotal } = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const gst = subtotal * 0.18;
        const grandTotal = subtotal + gst;
        return { subtotal, gst, grandTotal };
    }, [items]);

    const filteredStyles = useMemo(() => {
        if (!styleSearchTerm) return catalog.styles;
        return catalog.styles.filter(style =>
            style.toLowerCase().includes(styleSearchTerm.toLowerCase())
        );
    }, [styleSearchTerm, catalog.styles]);

    // --- RENDER ---
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>New Order Entry</h1>
                <div style={styles.actions}>
                    <button style={{ ...styles.button, ...styles.secondaryButton }}>Save Draft</button>
                    <button style={styles.button}>Submit Order</button>
                </div>
            </div>
            
            <div style={styles.formGrid}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Order Details</h2>
                    <div style={{...styles.inputGroup, position: 'relative'}} ref={suggestionBoxRef}>
                        <label htmlFor="partyName" style={styles.label}>Party Name</label>
                        <input type="text" id="partyName" style={styles.input} value={partyName} onChange={handlePartyNameChange} onFocus={() => partyName && suggestions.length > 0 && setIsSuggestionsVisible(true)} placeholder="Enter or select a customer" autoComplete="off" />
                         {isSuggestionsVisible && suggestions.length > 0 && (
                            <ul style={styles.suggestionsList}>
                                {suggestions.map((s, i) => (
                                    <li key={i} style={{...styles.suggestionItem, ...(s.startsWith('Add: ') ? styles.addSuggestionItem : {})}} onClick={() => handleSuggestionClick(s)} onMouseDown={(e) => e.preventDefault()}>
                                        {s.startsWith('Add: ') ? `+ Add "${s.substring(5)}"` : s}
                                    </li>
                                ))}
                            </ul>
                         )}
                    </div>
                </div>

                <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                      <h2 style={styles.cardTitle}>Order Items</h2>
                      {isSyncing && <div style={styles.syncingText}>Syncing item catalog...</div>}
                    </div>
                    
                    <div style={styles.styleSelectorContainer}>
                         <label htmlFor="styleSearch" style={styles.label}>Search Style</label>
                         <input
                             type="text"
                             id="styleSearch"
                             style={styles.input}
                             placeholder="Type to search for a style..."
                             value={styleSearchTerm}
                             onChange={e => setStyleSearchTerm(e.target.value)}
                             disabled={isSyncing}
                         />
                         <div style={styles.styleResultsContainer}>
                             {filteredStyles.slice(0, 100).map(style => ( // Limit rendered styles for performance
                                 <button
                                     key={style}
                                     style={selectedStyle === style ? {...styles.styleResultItem, ...styles.styleResultItemActive} : styles.styleResultItem}
                                     onClick={() => setSelectedStyle(style)}
                                 >
                                     {style}
                                 </button>
                             ))}
                         </div>
                    </div>

                    {selectedStyle && (
                        <StyleMatrix 
                            style={selectedStyle} 
                            catalogData={catalog.groupedData}
                            orderItems={items}
                            onQuantityChange={handleQuantityChange}
                        />
                    )}
                </div>

                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Order Summary</h2>
                    <div style={styles.summary}>
                        <div style={styles.summaryRow}><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                        <div style={styles.summaryRow}><span>GST (18%)</span><span>{gst.toFixed(2)}</span></div>
                        <div style={{...styles.summaryRow, ...styles.summaryTotal}}><span>Grand Total</span><span>{grandTotal.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
    title: { fontSize: '1.75rem', fontWeight: 600, color: 'var(--dark-grey)' },
    actions: { display: 'flex', gap: '0.75rem' },
    button: { padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s ease' },
    secondaryButton: { backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', border: '1px solid var(--skeleton-bg)' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' },
    card: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '0.5rem', borderBottom: '1px solid var(--skeleton-bg)', paddingBottom: '0.75rem', flexGrow: 1 },
    inputGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' },
    label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-color)' },
    input: { width: '100%', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', backgroundColor: '#fff', color: 'var(--dark-grey)', transition: 'border-color 0.3s ease' },
    summary: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-color)', fontSize: '0.9rem' },
    summaryTotal: { fontWeight: 600, color: 'var(--dark-grey)', fontSize: '1.1rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--skeleton-bg)' },
    suggestionsList: { listStyle: 'none', margin: '0.25rem 0 0', padding: '0.5rem 0', position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: '200px', overflowY: 'auto', zIndex: 10, },
    suggestionItem: { padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-color)', },
    addSuggestionItem: { color: 'var(--brand-color)', fontWeight: 500, },
    syncingText: { fontSize: '0.85rem', color: 'var(--brand-color)', fontWeight: 500, paddingBottom: '0.75rem' },
    styleSelectorContainer: { marginBottom: '1.5rem' },
    styleResultsContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', maxHeight: '160px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px' },
    styleResultItem: { padding: '0.5rem 1rem', backgroundColor: 'var(--light-grey)', color: 'var(--text-color)', border: '1px solid var(--skeleton-bg)', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '0.85rem', fontWeight: 500, },
    styleResultItemActive: { backgroundColor: 'var(--brand-color)', color: '#fff', borderColor: 'var(--brand-color)' },
    matrixContainer: { marginTop: '1rem' },
    matrixStyleTitle: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--dark-grey)', textAlign: 'center', marginBottom: '1.5rem' },
    matrixGrid: { display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' },
    colorCard: { borderRadius: '12px', padding: '1rem', width: '150px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'background-color 0.3s, color 0.3s' },
    colorHeader: { fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(100, 100, 100, 0.2)' },
    sizeList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    sizeRow: { display: 'grid', gridTemplateColumns: '40px 1fr', alignItems: 'center', gap: '0.5rem' },
    sizeLabel: { fontSize: '0.9rem', fontWeight: 500 },
    quantityInput: { width: '100%', padding: '6px 8px', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', textAlign: 'right', outline: 'none' },
};