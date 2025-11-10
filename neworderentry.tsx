import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

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
                    // FIX: Changed keyPath from invalid 'Mat Code' to 'Barcode'
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
            store.clear(); // Clear old items
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


export const NewOrderEntry = () => {
    // --- STATE MANAGEMENT ---
    const [partyName, setPartyName] = useState('');
    const [items, setItems] = useState([{ id: Date.now(), style: '', color: '', size: '', quantity: 1, price: 0, fullItemData: null }]);
    
    // Party Name Suggestions State
    const [allParties, setAllParties] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const suggestionBoxRef = useRef(null);
    const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);

    // Item Catalog State
    const [isSyncing, setIsSyncing] = useState(true);
    const [catalog, setCatalog] = useState({ styles: [], groupedData: {} });

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
            // FIX: Cast Firebase snapshot value to access its properties without type errors.
            const remoteMeta = snapshot.val() as { uploadDate: string; manualSync: string; };
            if (!remoteMeta) {
                console.error("Firebase item metadata not found!");
                setIsSyncing(false);
                loadItemsFromDb(); // Try to load from cache anyway
                return;
            }

            itemDb.getMetadata().then(localMeta => {
                const needsSync = !localMeta || remoteMeta.uploadDate !== (localMeta as any).uploadDate || remoteMeta.manualSync === 'Y';
                
                if (needsSync) {
                    console.log("Sync required. Fetching new item data from Firebase...");
                    setIsSyncing(true);
                    database.ref('itemData/items').once('value').then(itemSnapshot => {
                        const items = itemSnapshot.val();
                        if (items && Array.isArray(items)) {
                            itemDb.clearAndAddItems(items).then(() => {
                                itemDb.setMetadata({ uploadDate: remoteMeta.uploadDate }).then(() => {
                                    console.log("Sync complete. Local DB updated.");
                                    loadItemsFromDb(); // Load fresh data
                                    if (remoteMeta.manualSync === 'Y') {
                                        metadataRef.update({ manualSync: 'N' }); // Reset flag
                                    }
                                });
                            });
                        }
                    }).finally(() => setIsSyncing(false));
                } else {
                    console.log("No sync needed. Loading from local DB.");
                    loadItemsFromDb();
                    setIsSyncing(false);
                }
            });
        };

        metadataRef.on('value', syncCheck);
        return () => metadataRef.off('value', syncCheck);
    }, []);

    const loadItemsFromDb = async () => {
        // FIX: Cast the result of getAllItems to an array to use array methods like .length and .reduce.
        const dbItems = await itemDb.getAllItems() as any[];
        if (dbItems && dbItems.length > 0) {
            const grouped = dbItems.reduce((acc: any, item: any) => {
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

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'style') { // Reset dependent fields
                    updatedItem.color = '';
                    updatedItem.size = '';
                    updatedItem.price = 0;
                    updatedItem.fullItemData = null;
                }
                if (field === 'color') { // Reset size and price
                    updatedItem.size = '';
                    updatedItem.price = 0;
                    updatedItem.fullItemData = null;
                }
                if (field === 'size') {
                    const fullItem = (catalog.groupedData as any)[item.style]?.[item.color]?.find(i => i.Size === value);
                    if (fullItem) {
                        updatedItem.fullItemData = fullItem;
                        updatedItem.price = parseFloat(String(fullItem.MRP).replace(/[^0-9.-]+/g, "")) || 0;
                    }
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), style: '', color: '', size: '', quantity: 1, price: 0, fullItemData: null }]);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };
    
    const { subtotal, gst, grandTotal } = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        const gst = subtotal * 0.18;
        const grandTotal = subtotal + gst;
        return { subtotal, gst, grandTotal };
    }, [items]);

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
                                    <li key={i} style={{...styles.suggestionItem, ...(s.startsWith('Add: ') ? styles.addSuggestionItem : {}), ...(hoveredSuggestionIndex === i ? styles.suggestionItemHover : {})}} onClick={() => handleSuggestionClick(s)} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setHoveredSuggestionIndex(i)} onMouseLeave={() => setHoveredSuggestionIndex(-1)}>
                                        {s.startsWith('Add: ') ? `+ Add "${s.substring(5)}"` : s}
                                    </li>
                                ))}
                            </ul>
                         )}
                    </div>
                </div>

                <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <h2 style={styles.cardTitle}>Order Items</h2>
                      {isSyncing && <div style={styles.syncingText}>Syncing item catalog...</div>}
                    </div>
                    <div style={styles.itemTable}>
                        <div style={styles.itemHeader}>
                            <div style={{...styles.itemCell, flex: 3}}>Style</div>
                            <div style={{...styles.itemCell, flex: 2}}>Color</div>
                            <div style={{...styles.itemCell, flex: 1}}>Size</div>
                            <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>Qty</div>
                            <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>Price</div>
                            <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>Total</div>
                            <div style={{...styles.itemCell, flex: '0 0 40px'}}></div>
                        </div>
                        {items.map((item) => {
                            const availableColors = item.style ? Object.keys((catalog.groupedData as any)[item.style] || {}).sort() : [];
                            const availableSizes = item.color ? ((catalog.groupedData as any)[item.style]?.[item.color] || []).map(i => i.Size).sort() : [];

                            return (
                            <div key={item.id} style={styles.itemRow}>
                                <div style={{...styles.itemCell, flex: 3}}>
                                    <select style={styles.tableInput} value={item.style} onChange={e => handleItemChange(item.id, 'style', e.target.value)} disabled={isSyncing}><option value="">Select Style</option>{catalog.styles.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                <div style={{...styles.itemCell, flex: 2}}>
                                    <select style={styles.tableInput} value={item.color} onChange={e => handleItemChange(item.id, 'color', e.target.value)} disabled={!item.style}><option value="">Select Color</option>{availableColors.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                </div>
                                <div style={{...styles.itemCell, flex: 1}}>
                                    <select style={styles.tableInput} value={item.size} onChange={e => handleItemChange(item.id, 'size', e.target.value)} disabled={!item.color}><option value="">Select Size</option>{availableSizes.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>
                                    <input type="number" style={{...styles.tableInput, textAlign: 'right'}} min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)} />
                                </div>
                                <div style={{...styles.itemCell, flex: 1, textAlign: 'right'}}>
                                    <input type="number" style={{...styles.tableInput, textAlign: 'right'}} value={item.price} readOnly />
                                </div>
                                <div style={{...styles.itemCell, flex: 1, textAlign: 'right', padding: '8px', fontWeight: 500}}>
                                    {(item.quantity * item.price).toFixed(2)}
                                </div>
                                <div style={{...styles.itemCell, flex: '0 0 40px', justifyContent: 'center'}}>
                                    {items.length > 1 && <button onClick={() => handleRemoveItem(item.id)} style={styles.deleteButton}><TrashIcon /></button>}
                                </div>
                            </div>
                        )})}
                    </div>
                    <button onClick={handleAddItem} style={styles.addButton} disabled={isSyncing}><PlusIcon /> Add Item</button>
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
    tableInput: { width: '100%', padding: '8px', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', outline: 'none', WebkitAppearance: 'none', appearance: 'none', background: 'var(--light-grey) url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236A7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E\') no-repeat right .7em top 50%', backgroundSize: '.65em auto' },
    itemTable: { display: 'flex', flexDirection: 'column' },
    itemHeader: { display: 'flex', padding: '0 8px', borderBottom: '1px solid var(--skeleton-bg)', marginBottom: '0.5rem', color: 'var(--text-color)', fontWeight: 500, fontSize: '0.8rem', textTransform: 'uppercase' },
    itemRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' },
    itemCell: { padding: '4px', display: 'flex', alignItems: 'center' },
    deleteButton: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    addButton: { alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', background: 'none', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 },
    summary: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-color)', fontSize: '0.9rem' },
    summaryTotal: { fontWeight: 600, color: 'var(--dark-grey)', fontSize: '1.1rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--skeleton-bg)' },
    suggestionsList: { listStyle: 'none', margin: '0.25rem 0 0', padding: '0.5rem 0', position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: '200px', overflowY: 'auto', zIndex: 10, },
    suggestionItem: { padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-color)', },
    suggestionItemHover: { backgroundColor: 'var(--active-bg)', },
    addSuggestionItem: { color: 'var(--brand-color)', fontWeight: 500, },
    syncingText: { fontSize: '0.85rem', color: 'var(--brand-color)', fontWeight: 500, paddingBottom: '0.75rem' }
};