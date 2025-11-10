import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;

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

const Cart = ({ items, onRemoveItem, onClearCart }) => {
    const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    return (
        <div style={styles.cartContainer}>
            <div style={styles.cartHeader}>
                <h2 style={styles.cardTitle}>Cart</h2>
                <span style={styles.itemCount}>{totalQuantity} Items</span>
            </div>
            {items.length === 0 ? (
                <p style={styles.cartEmptyText}>Add items using the matrix to see them here.</p>
            ) : (
                <>
                    <div style={styles.cartItemsList}>
                        {items.sort((a,b) => a.fullItemData.Style.localeCompare(b.fullItemData.Style)).map(item => (
                            <div key={item.id} style={styles.cartItem}>
                                <div style={styles.cartItemInfo}>
                                    <div style={styles.cartItemDetails}>{`${item.fullItemData.Style} - ${item.fullItemData.Color}`}</div>
                                    <div style={styles.cartItemSubDetails}>{`Size: ${item.fullItemData.Size}`}</div>
                                </div>
                                <div style={styles.cartItemQuantity}>Qty: {item.quantity}</div>
                                <button onClick={() => onRemoveItem(item.fullItemData)} style={styles.cartItemRemoveBtn} aria-label="Remove item">&times;</button>
                            </div>
                        ))}
                    </div>
                    <button onClick={onClearCart} style={{...styles.button, ...styles.secondaryButton, width: '100%', marginTop: 'auto'}}>Clear Cart</button>
                </>
            )}
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
    const [isStyleSearchFocused, setIsStyleSearchFocused] = useState(false);
    const styleSearchRef = useRef(null);
    
    // UI State
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 820);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);


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
        const handleResize = () => setIsMobile(window.innerWidth <= 820);
        window.addEventListener('resize', handleResize);

        const handleClickOutside = (event) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target)) {
                setIsSuggestionsVisible(false);
            }
            if (styleSearchRef.current && !styleSearchRef.current.contains(event.target)) {
                setIsStyleSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousedown', handleClickOutside);
        }
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
                    const newItems = [...currentItems];
                    newItems[existingItemIndex] = { ...newItems[existingItemIndex], quantity: quantity };
                    return newItems;
                } else {
                    const price = parseFloat(String(fullItemData.MRP).replace(/[^0-9.-]+/g, "")) || 0;
                    const newItem = {
                        id: barcode,
                        quantity: quantity,
                        price: price,
                        fullItemData: fullItemData,
                    };
                    return [...currentItems, newItem];
                }
            } else {
                if (existingItemIndex > -1) {
                    return currentItems.filter(item => item.fullItemData.Barcode !== barcode);
                }
            }
            return currentItems;
        });
    };
    
    const handleRemoveItem = (fullItemData) => {
        handleQuantityChange(fullItemData, '0');
    };

    const handleClearCart = () => {
        setItems([]);
    };

    const filteredStyles = useMemo(() => {
        if (!styleSearchTerm) return catalog.styles;
        return catalog.styles.filter(style =>
            style.toLowerCase().includes(styleSearchTerm.toLowerCase())
        );
    }, [styleSearchTerm, catalog.styles]);
    
    const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    // --- RENDER ---
    const mainLayoutStyle = isMobile ? { ...styles.mainLayout, gridTemplateColumns: '1fr' } : styles.mainLayout;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>New Order Entry</h1>
                <div style={styles.actions}>
                    <button style={{ ...styles.button, ...styles.secondaryButton }}>Save Draft</button>
                    <button style={styles.button}>Submit Order</button>
                </div>
            </div>
            
            <div style={mainLayoutStyle}>
                <div style={styles.mainPanel}>
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

                    <div style={{ ...styles.card, flex: 1 }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                          <h2 style={styles.cardTitle}>Order Items</h2>
                          {isSyncing && <div style={styles.syncingText}>Syncing item catalog...</div>}
                        </div>
                        
                        <div style={styles.styleSelectorContainer} ref={styleSearchRef}>
                             <label htmlFor="styleSearch" style={styles.label}>Search Style</label>
                             <input
                                 type="text"
                                 id="styleSearch"
                                 style={styles.input}
                                 placeholder="Type to search for a style..."
                                 value={styleSearchTerm}
                                 onChange={e => setStyleSearchTerm(e.target.value)}
                                 onFocus={() => setIsStyleSearchFocused(true)}
                                 disabled={isSyncing}
                                 autoComplete="off"
                             />
                             {isStyleSearchFocused && filteredStyles.length > 0 && (
                                 <div style={styles.styleResultsContainer}>
                                     {filteredStyles.slice(0, 100).map(style => (
                                         <button
                                             key={style}
                                             style={selectedStyle === style ? {...styles.styleResultItem, ...styles.styleResultItemActive} : styles.styleResultItem}
                                             onClick={() => {
                                                 setSelectedStyle(style);
                                                 setStyleSearchTerm(style);
                                                 setIsStyleSearchFocused(false);
                                             }}
                                         >
                                             {style}
                                         </button>
                                     ))}
                                 </div>
                             )}
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
                </div>

                {!isMobile && (
                    <div style={styles.sidePanel}>
                        <Cart items={items} onRemoveItem={handleRemoveItem} onClearCart={handleClearCart} />
                    </div>
                )}
            </div>

            {isMobile && (
                <button style={styles.floatingCartButton} onClick={() => setIsCartModalOpen(true)} aria-label="Open cart">
                    <CartIcon />
                    {totalQuantity > 0 && <span style={styles.floatingCartCount}>{totalQuantity}</span>}
                </button>
            )}

            {isMobile && isCartModalOpen && (
                <div style={styles.modalOverlay} onClick={() => setIsCartModalOpen(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button style={styles.modalCloseButton} onClick={() => setIsCartModalOpen(false)} aria-label="Close cart">&times;</button>
                        <Cart items={items} onRemoveItem={handleRemoveItem} onClearCart={() => {
                            handleClearCart();
                            setIsCartModalOpen(false);
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0 },
    title: { fontSize: '1.75rem', fontWeight: 600, color: 'var(--dark-grey)' },
    actions: { display: 'flex', gap: '0.75rem' },
    button: { padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s ease' },
    secondaryButton: { backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', border: '1px solid var(--skeleton-bg)' },
    mainLayout: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', flex: 1, minHeight: 0 },
    mainPanel: { display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 },
    sidePanel: { minHeight: 0 },
    card: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '0.5rem', borderBottom: '1px solid var(--skeleton-bg)', paddingBottom: '0.75rem', flexGrow: 1 },
    inputGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' },
    label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-color)' },
    input: { width: '100%', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', backgroundColor: '#fff', color: 'var(--dark-grey)', transition: 'border-color 0.3s ease' },
    suggestionsList: { listStyle: 'none', margin: '0.25rem 0 0', padding: '0.5rem 0', position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: '200px', overflowY: 'auto', zIndex: 10, },
    suggestionItem: { padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-color)', },
    addSuggestionItem: { color: 'var(--brand-color)', fontWeight: 500, },
    syncingText: { fontSize: '0.85rem', color: 'var(--brand-color)', fontWeight: 500, paddingBottom: '0.75rem' },
    styleSelectorContainer: { marginBottom: '1.5rem', position: 'relative' },
    styleResultsContainer: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '160px', overflowY: 'auto', padding: '0.5rem' },
    styleResultItem: { padding: '0.5rem 1rem', backgroundColor: 'var(--light-grey)', color: 'var(--text-color)', border: '1px solid var(--skeleton-bg)', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '0.85rem', fontWeight: 500, },
    styleResultItemActive: { backgroundColor: 'var(--brand-color)', color: '#fff', borderColor: 'var(--brand-color)' },
    matrixContainer: { marginTop: '1rem', overflowY: 'auto' },
    matrixStyleTitle: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--dark-grey)', textAlign: 'center', marginBottom: '1.5rem' },
    matrixGrid: { display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' },
    colorCard: { borderRadius: '12px', padding: '1rem', width: '150px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'background-color 0.3s, color 0.3s' },
    colorHeader: { fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(100, 100, 100, 0.2)' },
    sizeList: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    sizeRow: { display: 'grid', gridTemplateColumns: '40px 1fr', alignItems: 'center', gap: '0.5rem' },
    sizeLabel: { fontSize: '0.9rem', fontWeight: 500 },
    quantityInput: { width: '100%', padding: '6px 8px', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', textAlign: 'right', outline: 'none' },
    cartContainer: { backgroundColor: 'var(--card-bg)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', height: '100%' },
    cartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    itemCount: { fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-color)', paddingBottom: '0.75rem' },
    cartEmptyText: { textAlign: 'center', color: 'var(--text-color)', marginTop: '2rem', flex: 1 },
    cartItemsList: { flex: 1, overflowY: 'auto', margin: '1rem 0', paddingRight: '0.5rem' },
    cartItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--skeleton-bg)' },
    cartItemInfo: { flex: 1 },
    cartItemDetails: { fontWeight: 500, color: 'var(--dark-grey)', fontSize: '0.9rem' },
    cartItemSubDetails: { color: 'var(--text-color)', fontSize: '0.8rem' },
    cartItemQuantity: { fontWeight: 500, color: 'var(--dark-grey)' },
    cartItemRemoveBtn: { background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', fontSize: '1.5rem', padding: '0 0.5rem', lineHeight: 1 },
    floatingCartButton: { position: 'fixed', bottom: '80px', right: '20px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--brand-color)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 100 },
    floatingCartCount: { position: 'absolute', top: '0', right: '0', backgroundColor: '#e74c3c', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, border: '2px solid var(--brand-color)' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: '1rem' },
    modalContent: { backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '500px', maxHeight: '80vh', borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'slideUp 0.3s ease-out' },
    modalCloseButton: { position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', fontSize: '2rem', color: 'var(--text-color)', cursor: 'pointer', zIndex: 1 },
};

// Add keyframes for modal animation
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;
document.head.appendChild(styleSheet);
