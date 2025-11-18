

// FIX: Removed extraneous "START OF FILE" markers from the top of this file.
import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- Firebase & App Script Configuration ---
const DRAFTS_REF = 'KA-OMS-v2-Draft';
const ORDER_COUNTER_REF = 'orderCounter/KA-OMS-v2-Counter';
const PENDING_ORDERS_REF = 'Pending_Order_V2';
const GSHEET_BACKUP_URL = 'https://script.google.com/macros/s/AKfycbyCvFsdhuuhDg3y3TTjYYjMvnrVkn1SDYk5n8yE9k_PoyyhHTdgbEHJ6PtPLl7V8jiXdw/exec';
const ORDER_NUMBER_PREFIX = 'K';
const STOCK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyY4ys2VzcsmslZj-vYieV1l-RRTp90eDMwcdANFZ3qecf8VRPgz-dNo46jqIqencqF/exec';


// --- Type definitions for order items and drafts ---
interface OrderItem {
    id: string;
    quantity: number;
    price: number;
    fullItemData: Record<string, any>;
}

interface Draft {
    items: OrderItem[];
    timestamp: string;
}

// --- ICONS ---
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;


const ChevronIcon = ({ collapsed }) => (
    <svg style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
);

// --- FEEDBACK HELPERS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

const triggerHapticFeedback = () => {
    if (navigator.vibrate) {
        navigator.vibrate(50); // A short vibration
    }
};

const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.exponentialRampToValueAtTime(783.99, audioContext.currentTime + 0.15); // G5

    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
};

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

// --- INDEXEDDB HELPERS ---
const itemDb = {
    db: null,
    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) { return resolve(this.db); }
            const request = indexedDB.open('ItemCatalogDB', 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('items')) {
                    db.createObjectStore('items', { keyPath: 'Barcode' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); };
            request.onerror = (event) => { console.error('IndexedDB error:', (event.target as IDBRequest).error); reject((event.target as IDBRequest).error); };
        });
    },
    clearAndAddItems: async function(items) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            store.clear();
            items.forEach(item => store.add(item));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    getAllItems: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    getMetadata: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get('syncInfo');
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    setMetadata: async function(metadata) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            store.put({ id: 'syncInfo', ...metadata });
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }
};

const stockDb = {
    db: null,
    init: function() {
        return new Promise((resolve, reject) => {
            if (this.db) return resolve(this.db);
            const request = indexedDB.open('StockDataDB', 4);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('stockItems')) {
                    db.createObjectStore('stockItems', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'id' });
                }
            };
            request.onsuccess = (event) => { this.db = (event.target as IDBOpenDBRequest).result; resolve(this.db); };
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    clearAndAddStock: async function(items) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['stockItems'], 'readwrite');
            const store = transaction.objectStore('stockItems');
            store.clear();
            items.forEach(item => store.add(item));
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    getAllStock: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['stockItems'], 'readonly');
            const store = transaction.objectStore('stockItems');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    getMetadata: async function() {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get('syncInfo');
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    },
    setMetadata: async function(metadata) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            store.put({ id: 'syncInfo', ...metadata });
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (event) => reject((event.target as IDBRequest).error);
        });
    }
};

// --- HELPER FUNCTION FOR ROBUST KEY MATCHING ---
const normalizeKeyPart = (part: any): string => {
    if (!part) return '';
    return String(part).toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
};

const QuantityControl: React.FC<{
    value: string | number;
    onChange: (value: string) => void;
    onStep: (step: number) => void;
    isDark?: boolean;
    size?: 'small' | 'default';
}> = ({ value, onChange, onStep, isDark = false, size = 'default' }) => {
    
    const themedStyles = {
        quantityInput: isDark ? { ...styles.quantityInput, backgroundColor: '#2D3748', color: '#FFFFFF', borderTop: '1px solid #4A5568', borderBottom: '1px solid #4A5568' } : styles.quantityInput,
        quantityButton: isDark ? { ...styles.quantityButton, backgroundColor: '#4A5568', color: '#FFFFFF', border: '1px solid #4A5568' } : styles.quantityButton,
    };

    const s = useMemo(() => {
        const base = {
            button: themedStyles.quantityButton,
            input: themedStyles.quantityInput,
            container: styles.quantityControl,
        };
        if (size === 'small') {
            base.button = { ...base.button, width: '26px', height: '28px', fontSize: '1rem' };
            base.input = { ...base.input, width: '34px', height: '28px', fontSize: '0.9rem', padding: '4px 2px' };
        } else {
             base.button = { ...base.button, width: '30px', height: '32px', fontSize: '1.2rem' };
             base.input = { ...base.input, width: '40px', height: '32px', fontSize: '1rem', padding: '6px 2px' };
        }
        return base;
    }, [size, isDark]);

    return (
        <div style={s.container}>
            <button
                style={{ ...s.button, borderRadius: '6px 0 0 6px' }}
                onClick={() => onStep(-1)}
                aria-label="Decrease quantity"
            >-</button>
            <input
                type="number"
                min="0"
                style={s.input}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="0"
            />
            <button
                style={{ ...s.button, borderRadius: '0 6px 6px 0' }}
                onClick={() => onStep(1)}
                aria-label="Increase quantity"
            >+</button>
        </div>
    );
};

const StockIndicator: React.FC<{ stockLevel: number }> = ({ stockLevel }) => {
    const isUnavailable = typeof stockLevel !== 'number' || stockLevel < 0;
    let color = null;
    let title = `Stock: ${stockLevel}`;
    if (isUnavailable || stockLevel === 0) {
        color = '#e74c3c';
        if (isUnavailable) title = 'Stock: Unavailable';
    } else if (stockLevel >= 1 && stockLevel <= 3) {
        color = '#f1c40f';
    } else if (stockLevel >= 4) {
        color = '#2ecc71';
    }
    if (!color) return <div style={styles.stockIndicatorPlaceholder}></div>;
    return <span style={{ ...styles.stockIndicator, backgroundColor: color }} title={title} />;
};

const CollapsibleColorCard: React.FC<{ color: any, itemsInColor: any, allSizesForStyle: any, itemsByBarcode: any, onQuantityChange: any, isMobile: any, stockData: any }> = ({ color, itemsInColor, allSizesForStyle, itemsByBarcode, onQuantityChange, isMobile, stockData }) => {
    const [isCollapsed, setIsCollapsed] = useState(isMobile);

    const itemsBySize = useMemo(() => itemsInColor.reduce((acc, item) => {
        acc[item.Size] = item;
        return acc;
    }, {}), [itemsInColor]);

    const formatMRP = (mrp) => {
        if (!mrp) return null;
        const num = parseInt(String(mrp).replace(/[^0-9.]+/g, ''));
        return !isNaN(num) ? `${num}/-` : null;
    };

    const handleQuantityStep = (item, currentQuantity, step) => {
        const newValue = Math.max(0, (Number(currentQuantity) || 0) + step);
        onQuantityChange(item, String(newValue));
    };

    const upperColor = color.toUpperCase();
    const isDark = upperColor.includes('BLK') || upperColor.includes('BLACK') || upperColor.includes('NAVY');
    const getColorCardStyle = () => {
        const baseStyle: React.CSSProperties = { ...styles.colorCard, flex: isMobile ? '1 1 140px' : undefined, minWidth: isMobile ? '140px' : undefined, padding: isMobile ? '0.5rem' : '1rem', gap: isMobile ? '0.5rem' : '0.75rem', width: isMobile ? undefined : '190px', flexShrink: isMobile ? undefined : 0 };
        if (isDark) {
            baseStyle.backgroundColor = upperColor.includes('NAVY') ? '#2d3748' : '#1A202C';
            baseStyle.color = '#FFFFFF';
        } else {
            baseStyle.backgroundColor = '#FFFFFF';
            baseStyle.color = '#1A202C';
            baseStyle.border = '1px solid var(--skeleton-bg)';
        }
        return baseStyle;
    };
    
    const computedStyles = useMemo(() => ({
        sizeRow: isMobile ? { ...styles.sizeRow, gridTemplateColumns: '1fr auto', gap: '0.5rem' } : styles.sizeRow,
        sizeLabel: isMobile ? { ...styles.sizeLabel, fontSize: '0.85rem' } : styles.sizeLabel,
    }), [isMobile]);

    return (
        <div style={getColorCardStyle()}>
            <div style={isMobile ? {...styles.colorHeader, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'} : styles.colorHeader} onClick={() => isMobile && setIsCollapsed(!isCollapsed)}>
                <span>{color}</span>
                {isMobile && <ChevronIcon collapsed={isCollapsed} />}
            </div>
            {(!isMobile || !isCollapsed) && (
                <div style={styles.sizeList}>
                    {allSizesForStyle.map(size => {
                        const itemData = itemsBySize[size];
                        if (itemData) {
                            const quantity = itemsByBarcode[itemData.Barcode] || '';
                            const stockKey = `${normalizeKeyPart(itemData.Style)}-${normalizeKeyPart(itemData.Color)}-${normalizeKeyPart(itemData.Size)}`;
                            const stockLevel = stockData[stockKey];
                            return (
                                <div key={size} style={computedStyles.sizeRow}>
                                    <div style={styles.sizeInfoWrapper}>
                                        <div style={styles.sizeLabelWrapper}>
                                            <label style={computedStyles.sizeLabel}>{size}</label>
                                            {formatMRP(itemData.MRP) && <div style={isDark ? { ...styles.mrpText, color: '#A0AEC0' } : styles.mrpText}>{formatMRP(itemData.MRP)}</div>}
                                        </div>
                                        <StockIndicator stockLevel={stockLevel} />
                                    </div>
                                    <QuantityControl value={quantity} onChange={(value) => onQuantityChange(itemData, value)} onStep={(step) => handleQuantityStep(itemData, quantity, step)} isDark={isDark} size={isMobile ? 'small' : 'default'} />
                                </div>
                            );
                        }
                        return <div key={size} style={{...styles.sizeRow, visibility: 'hidden'}}>...</div>;
                    })}
                </div>
            )}
        </div>
    );
};

const StyleMatrix = ({ style, catalogData, orderItems, onQuantityChange, isMobile, stockData }) => {
    const styleData = catalogData[style] || {};
    const colors = Object.keys(styleData).sort();

    const allSizesForStyle = useMemo(() => {
        const sizeSet = new Set<string>();
        colors.forEach(color => styleData[color].forEach(item => sizeSet.add(item.Size)));
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
        const braSizeRegex = /(\d+)([A-Z]+)/;
        return Array.from(sizeSet).sort((a, b) => {
            const aMatch = a.match(braSizeRegex); const bMatch = b.match(braSizeRegex);
            if (aMatch && bMatch) { const [, aBand, aCup] = aMatch; const [, bBand, bCup] = bMatch; if (aBand !== bBand) return parseInt(aBand) - parseInt(bBand); return aCup.localeCompare(bCup); }
            const aIndex = sizeOrder.indexOf(a); const bIndex = sizeOrder.indexOf(b);
            if (aIndex === -1 && bIndex === -1) return a.localeCompare(b); if (aIndex === -1) return 1; if (bIndex === -1) return -1; return aIndex - bIndex;
        });
    }, [style, catalogData]);

    const itemsByBarcode = useMemo(() => orderItems.reduce((acc, item) => { acc[item.fullItemData.Barcode] = item.quantity; return acc; }, {}), [orderItems]);
    
    return (
        <div style={styles.matrixContainer}>
            <h3 style={isMobile ? { ...styles.matrixStyleTitle, marginBottom: '0.25rem' } : styles.matrixStyleTitle}>{style}</h3>
            <div style={isMobile ? { ...styles.matrixGrid, gap: '0.5rem' } : { ...styles.matrixGrid, justifyContent: 'flex-start' }}>
                {colors.map(color => ( <CollapsibleColorCard key={color} color={color} itemsInColor={styleData[color]} allSizesForStyle={allSizesForStyle} itemsByBarcode={itemsByBarcode} onQuantityChange={onQuantityChange} isMobile={isMobile} stockData={stockData} /> ))}
            </div>
        </div>
    );
};

const CartDetailModal = ({ group, items, onClose, onQuantityChange }) => {
    const handleQuantityStep = (item, currentQuantity, step) => onQuantityChange(item.fullItemData, String(Math.max(0, (Number(currentQuantity) || 0) + step)));
    const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, height: 'auto', maxHeight: '80vh'}} onClick={(e) => e.stopPropagation()}>
                <div style={styles.cartHeader}> <div> <h2 style={styles.cardTitleBare}>Edit Item</h2> <p style={styles.cartItemSubDetails}>{`${group.style} - ${group.color}`}</p> </div> <button style={styles.modalCloseButton} onClick={onClose} aria-label="Close edit view">&times;</button> </div>
                <div style={styles.cartItemsList}>
                     {items.sort((a,b) => a.fullItemData.Size.localeCompare(b.fullItemData.Size, undefined, {numeric: true})).map(item => (
                        <div key={item.id} style={styles.cartItem}>
                            <div style={styles.cartItemInfo}> <div style={styles.cartItemDetails}>{`Size: ${item.fullItemData.Size}`}</div> <div style={styles.cartItemSubDetails}>{formatCurrency(item.price)}</div> </div>
                            <div style={styles.cartItemActions}> <QuantityControl value={item.quantity} onChange={(value) => onQuantityChange(item.fullItemData, value)} onStep={(step) => handleQuantityStep(item, item.quantity, step)} size="small" /> <button onClick={() => onQuantityChange(item.fullItemData, '0')} style={styles.cartItemRemoveBtn} aria-label="Remove item"> <TrashIcon /> </button> </div>
                        </div>
                    ))}
                </div>
                <div style={{...styles.cartFooter, borderTop: 'none', padding: '1rem 1.25rem'}}> <button onClick={onClose} style={{...styles.button, width: '100%'}}>Done</button> </div>
            </div>
        </div>
    );
};

const Cart = ({ items, onQuantityChange, onClearCart, onEditGroup, isModal, onClose, draftButton, isMobile, onSubmit }) => {
    const { totalQuantity, totalValue, groupedItems } = useMemo(() => {
        const summary = { totalQuantity: 0, totalValue: 0 };
        if (!items || items.length === 0) return { ...summary, groupedItems: [] };
        const groups = items.reduce((acc, item) => {
            summary.totalQuantity += item.quantity; summary.totalValue += item.quantity * item.price;
            const key = `${item.fullItemData.Style}-${item.fullItemData.Color}`;
            if (!acc[key]) acc[key] = { style: item.fullItemData.Style, color: item.fullItemData.Color, totalQuantity: 0 };
            acc[key].totalQuantity += item.quantity; return acc;
        }, {} as Record<string, { style: string; color: string; totalQuantity: number; }>);
        // FIX: Explicitly cast the result of `Object.values` to ensure correct type inference for the sort function's parameters, resolving errors with property access on `unknown` types.
        const sortedGroups = (Object.values(groups) as { style: string; color: string; totalQuantity: number; }[]).sort((a, b) => a.style.localeCompare(b.style) || a.color.localeCompare(b.color));
        return { ...summary, groupedItems: sortedGroups };
    }, [items]);

    const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);

    return (
        <div style={styles.cartContainer}>
            <div style={styles.cartHeader}> <h2 style={styles.cardTitleBare}>Order Summary</h2> <div style={styles.cartHeaderActions}> {items.length > 0 && (<button onClick={onClearCart} style={styles.clearCartButton}>Clear All</button>)} {isModal && <button onClick={onClose} style={styles.cartModalCloseButton}>&times;</button>} </div> </div>
            {items.length === 0 ? (<p style={styles.cartEmptyText}>Your cart is empty. Add items from the style matrix.</p>) : (
                <div style={styles.cartItemsList}>
                    {groupedItems.map(group => ( <button key={`${group.style}-${group.color}`} style={styles.cartGroupItem} onClick={() => onEditGroup(group)}> <div style={styles.cartItemInfo}> <div style={styles.cartItemDetails}>{`${group.style} - ${group.color}`}</div> <div style={styles.cartItemSubDetails}>{`Total Qty: ${group.totalQuantity}`}</div> </div> <ChevronRightIcon /> </button> ))}
                </div>
            )}
            <div style={styles.cartFooter}>
                <div style={styles.cartSummary}> <div> <div style={styles.summaryLabel}>Total Quantity</div> <div style={styles.summaryValue}>{totalQuantity} Items</div> </div> <div> <div style={styles.summaryLabel}>Total Value</div> <div style={styles.summaryValue}>{formatCurrency(totalValue)}</div> </div> </div>
                {isMobile && draftButton && ( <div style={styles.stickyActionButtons}> {draftButton} <button onClick={onSubmit} style={{ ...styles.button, ...styles.stickyButton, flex: 1 }} disabled={items.length === 0}>Submit Order</button> </div> )}
            </div>
        </div>
    );
};

interface DraftsModalProps { isOpen: boolean; onClose: () => void; drafts: Record<string, Draft>; onRestore: (partyName: string) => void; onDelete: (partyName: string) => void; }
const DraftsModal: React.FC<DraftsModalProps> = ({ isOpen, onClose, drafts, onRestore, onDelete }) => {
    const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
    if (!isOpen) return null;
    // FIX: Explicitly cast the result of `Object.entries` to correctly type the `draft` objects, preventing errors when accessing properties like `timestamp` and `items`.
    const sortedDrafts = (Object.entries(drafts) as [string, Draft][]).sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const formatTimestamp = (isoString: string) => !isoString ? 'Unknown time' : new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    const totalQuantity = (items: OrderItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, height: 'auto', maxHeight: '85vh', maxWidth: '600px'}} onClick={(e) => e.stopPropagation()}>
                <div style={styles.cartHeader}> <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}> <FolderIcon /> <h2 style={styles.cardTitleBare}>Saved Drafts</h2> </div> <button style={styles.modalCloseButton} onClick={onClose} aria-label="Close drafts view">&times;</button> </div>
                <div style={styles.draftsList}>
                    {sortedDrafts.length === 0 ? (<p style={styles.cartEmptyText}>You have no saved drafts.</p>) : (
                        sortedDrafts.map(([partyName, draft]) => (
                            <div key={partyName} style={styles.draftItem}>
                                <div style={styles.draftHeader} onClick={() => setExpandedDraft(expandedDraft === partyName ? null : partyName)}>
                                    <div style={styles.draftInfo}> <p style={styles.draftPartyName}>{partyName}</p> <div style={styles.draftMeta}> <span style={styles.draftTimestamp}><ClockIcon /> {formatTimestamp(draft.timestamp)}</span> <span>|</span> <span>{totalQuantity(draft.items)} items</span> </div> </div>
                                    <div style={styles.draftActions}> <button onClick={(e) => { e.stopPropagation(); onDelete(partyName); }} style={styles.draftActionButton} aria-label={`Delete draft for ${partyName}`}> <TrashIcon /> </button> <button onClick={(e) => { e.stopPropagation(); onRestore(partyName); }} style={{...styles.draftActionButton, ...styles.draftRestoreButton}} aria-label={`Restore draft for ${partyName}`}> <HistoryIcon /> </button> <ChevronIcon collapsed={expandedDraft !== partyName} /> </div>
                                </div>
                                {expandedDraft === partyName && (
                                    <div style={styles.draftItemsDetails}>
                                        <div style={styles.draftItemsHeader}> <span>Style</span> <span>Color</span> <span>Size</span> <span>Qty</span> </div>
                                        <ul> {draft.items.map(item => ( <li key={item.id} style={styles.draftItemRow}> <span>{item.fullItemData.Style}</span> <span>{item.fullItemData.Color}</span> <span>{item.fullItemData.Size}</span> <span>{item.quantity}</span> </li> ))} </ul>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const OrderConfirmationModal = ({ isOpen, onClose, onPlaceOrder, partyName, items, note, onNoteChange, isLoading }) => {
    if (!isOpen) return null;
    const { totalQuantity, totalValue } = useMemo(() => {
        return items.reduce((acc, item) => {
            acc.totalQuantity += item.quantity;
            acc.totalValue += item.quantity * item.price;
            return acc;
        }, { totalQuantity: 0, totalValue: 0 });
    }, [items]);
    const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);
    const predefinedNotes = ['Urgent Delivery', 'Call before dispatch', 'Fragile, handle with care', 'Hold until further notice'];
    const handlePredefinedNoteClick = (predefinedNote) => onNoteChange(currentNote => (currentNote ? currentNote + ', ' : '') + predefinedNote);

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '600px', height: 'auto', maxHeight: '90vh'}} onClick={(e) => e.stopPropagation()}>
                <div style={styles.cartHeader}> <h2 style={styles.cardTitleBare}>Confirm & Place Order</h2> <button style={styles.modalCloseButton} onClick={onClose}>&times;</button> </div>
                <div style={styles.confirmationBody}>
                    <div style={styles.confirmationSection}> <h3 style={styles.confirmationSectionTitle}>Party Name</h3> <p>{partyName}</p> </div>
                    <div style={styles.confirmationSection}> <h3 style={styles.confirmationSectionTitle}>Order Summary</h3> <div style={styles.cartSummary}> <div> <div style={styles.summaryLabel}>Total Quantity</div> <div style={styles.summaryValue}>{totalQuantity} Items</div> </div> <div> <div style={styles.summaryLabel}>Total Value</div> <div style={styles.summaryValue}>{formatCurrency(totalValue)}</div> </div> </div> </div>
                    <div style={styles.confirmationSection}>
                        <h3 style={styles.confirmationSectionTitle}>Order Note (Optional)</h3>
                        <div style={styles.predefinedNotesContainer}> {predefinedNotes.map(pn => <button key={pn} onClick={() => handlePredefinedNoteClick(pn)} style={styles.predefinedNoteButton}>{pn}</button>)} </div>
                        <textarea style={styles.notesTextarea} value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Type any special instructions here..." />
                    </div>
                </div>
                <div style={{...styles.cartFooter, borderTop: '1px solid var(--skeleton-bg)', marginTop: 'auto'}}>
                    <button onClick={onPlaceOrder} style={{...styles.button, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'}} disabled={isLoading}> {isLoading ? <Spinner /> : <><SendIcon /> Place Order</>} </button>
                </div>
            </div>
        </div>
    );
};

const SuccessModal = ({ isOpen, onClose, orderData }) => {
    if (!isOpen || !orderData) return null;
    const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);
    const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

    const handleDownloadPdf = async () => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
    
        // 1. Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Kambeshwar Agencies', 105, 20, { align: 'center' });
    
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('123 Business Road, Commerce City, 12345', 105, 27, { align: 'center' });
        doc.text('Email: contact@kambeshwar.com | Phone: +91 98765 43210', 105, 32, { align: 'center' });
    
        // 2. Document Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Order Confirmation", 105, 45, { align: 'center' });
    
        // 3. Order Info
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        doc.text(`Party Name: ${orderData.partyName}`, 14, 60);
        doc.text(`Order No: ${orderData.orderNumber}`, 14, 67);
        doc.text(`Date: ${formatDate(orderData.timestamp)}`, 150, 67);
    
        // 4. Table
        const tableColumn = ["#", "Style", "Color", "Size", "Quantity"];
        const tableRows = [];
    
        orderData.items.forEach((item, index) => {
            const itemData = [
                index + 1,
                item.fullItemData.Style,
                item.fullItemData.Color,
                item.fullItemData.Size,
                item.quantity
            ];
            tableRows.push(itemData);
        });
    
        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            headStyles: { fillColor: [71, 84, 104] },
            styles: { font: 'helvetica', fontSize: 10 },
        });
    
        let finalY = (doc as any).lastAutoTable.finalY || 100;
    
        // 5. Totals
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Quantity: ${orderData.totalQuantity}`, 14, finalY + 15);
    
        // 6. Footer
        finalY = doc.internal.pageSize.height - 30;
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
    
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Receiver\'s Signature', 40, finalY + 8, { align: 'center' });
        doc.text('For Kambeshwar Agencies', 165, finalY + 8, { align: 'center' });
    
        doc.save(`Order_Confirmation_${orderData.orderNumber}.pdf`);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '450px', height: 'auto', textAlign: 'center', padding: '2rem'}} onClick={(e) => e.stopPropagation()}>
                <div style={styles.successIconContainer}> <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52"><circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/><path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg> </div>
                <h2 style={{...styles.cardTitleBare, fontSize: '1.5rem', color: '#2ecc71', marginTop: '1.5rem'}}>Order Placed Successfully!</h2>
                <p style={{color: 'var(--text-color)', margin: '0.5rem 0 1.5rem'}}>Your order has been submitted for processing.</p>
                <div style={styles.successDetails}>
                    <div style={styles.successDetailItem}> <span>Order Number</span> <strong>{orderData.orderNumber}</strong> </div>
                    <div style={styles.successDetailItem}> <span>Party Name</span> <strong>{orderData.partyName}</strong> </div>
                    <div style={styles.successDetailItem}> <span>Total Quantity</span> <strong>{orderData.totalQuantity} Items</strong> </div>
                    <div style={styles.successDetailItem}> <span>Total Value</span> <strong>{formatCurrency(orderData.totalValue)}</strong> </div>
                </div>
                <div style={styles.successModalButtons}>
                    <button onClick={handleDownloadPdf} style={{ ...styles.button, ...styles.secondaryButton, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <DownloadIcon /> Download PDF
                    </button>
                    <button onClick={onClose} style={{...styles.button}}>Create New Order</button>
                </div>
            </div>
        </div>
    );
};

export const NewOrderEntry = () => {
    const [partyName, setPartyName] = useState('');
    const [items, setItems] = useState<OrderItem[]>([]);
    const [allParties, setAllParties] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    const suggestionBoxRef = useRef(null);
    const [isSyncing, setIsSyncing] = useState(true);
    const [catalog, setCatalog] = useState({ styles: [], groupedData: {} });
    const [selectedStyle, setSelectedStyle] = useState('');
    const [styleSearchTerm, setStyleSearchTerm] = useState('');
    const [isStyleSearchFocused, setIsStyleSearchFocused] = useState(false);
    const styleSearchRef = useRef(null);
    const [stockData, setStockData] = useState({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);
    const [isOrderDetailsCollapsed, setIsOrderDetailsCollapsed] = useState(false);
    const [editingCartGroup, setEditingCartGroup] = useState(null);
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [finalizedOrder, setFinalizedOrder] = useState(null);
    const [orderNote, setOrderNote] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const partyHasExistingDraft = useMemo(() => partyName && drafts[partyName], [partyName, drafts]);

    useEffect(() => { const partyRef = database.ref('PartyData'); const listener = partyRef.on('value', (snapshot) => { const data = snapshot.val(); if (data) { const partyList = Object.values(data).map((p: any) => p.name).filter(Boolean); setAllParties([...new Set(partyList)]); } else { setAllParties([]); } }); return () => partyRef.off('value', listener); }, []);
    useEffect(() => { const metadataRef = database.ref('itemData/metadata'); const syncCheck = (snapshot) => { const remoteMeta = snapshot.val() as { uploadDate: string; manualSync: string; }; if (!remoteMeta) { setIsSyncing(false); loadItemsFromDb(); return; } itemDb.getMetadata().then(localMeta => { const needsSync = !localMeta || remoteMeta.uploadDate !== (localMeta as any).uploadDate || remoteMeta.manualSync === 'Y'; if (needsSync) { setIsSyncing(true); database.ref('itemData/items').once('value').then(itemSnapshot => { const itemsData = itemSnapshot.val(); if (itemsData && Array.isArray(itemsData)) { itemDb.clearAndAddItems(itemsData).then(() => { itemDb.setMetadata({ uploadDate: remoteMeta.uploadDate }).then(() => { loadItemsFromDb(); if (remoteMeta.manualSync === 'Y') metadataRef.update({ manualSync: 'N' }); }); }); } }).finally(() => setIsSyncing(false)); } else { loadItemsFromDb(); setIsSyncing(false); } }); }; metadataRef.on('value', syncCheck); 
    const loadStockData = async () => {
        let localDataLoaded = false;
        try {
            const localStock = await stockDb.getAllStock() as any[];
            if (localStock && localStock.length > 0) {
                const stockMap = localStock.reduce((acc, item) => {
                    if (item.style && item.color && item.size) {
                        const key = `${normalizeKeyPart(item.style)}-${normalizeKeyPart(item.color)}-${normalizeKeyPart(item.size)}`;
                        acc[key] = item.stock;
                    }
                    return acc;
                }, {});
                setStockData(stockMap);
                localDataLoaded = true;
            }

            const response = await fetch(STOCK_SCRIPT_URL);
            if (!response.ok) {
                if (!localDataLoaded) throw new Error(`Network error: ${response.statusText}`);
                return; 
            }
            const result = await response.json();

            if (result.success) {
                const localMeta = await stockDb.getMetadata();
                const localTimestamp = localMeta ? (localMeta as any).timestamp : '';
                
                if (!localTimestamp || result.timestamp > localTimestamp) {
                    await stockDb.clearAndAddStock(result.data);
                    await stockDb.setMetadata({ timestamp: result.timestamp });
                    
                    const stockMap = result.data.reduce((acc, item) => {
                        if (item.style && item.color && item.size) {
                            const key = `${normalizeKeyPart(item.style)}-${normalizeKeyPart(item.color)}-${normalizeKeyPart(item.size)}`;
                            acc[key] = item.stock;
                        }
                        return acc;
                    }, {});
                    setStockData(stockMap);
                }
            } else {
                 if (!localDataLoaded) throw new Error(result.message || 'API returned an error.');
            }
        } catch (err) {
            console.error("Failed to load or sync stock data in NewOrderEntry:", err);
            if (!localDataLoaded) {
                 showToast('Could not load stock data.', 'error');
            }
        }
    };
    loadStockData(); return () => metadataRef.off('value', syncCheck); }, []);
    useEffect(() => { const draftsRef = database.ref(DRAFTS_REF); const listener = draftsRef.on('value', (snapshot) => { setDrafts(snapshot.val() || {}); }); return () => draftsRef.off('value', listener); }, []);

    const resetOrderState = () => {
        setPartyName('');
        setItems([]);
        setOrderNote('');
        setSelectedStyle('');
        setStyleSearchTerm('');
    };

    const handlePlaceOrder = async () => {
        setIsPlacingOrder(true);
        try {
            const counterRef = database.ref(ORDER_COUNTER_REF);
            const result = await counterRef.transaction(currentValue => (currentValue || 0) + 1);
            if (!result.committed) throw new Error("Failed to generate order number.");
            
            const orderNumber = `${ORDER_NUMBER_PREFIX}${result.snapshot.val()}`;
            const { totalQuantity, totalValue } = items.reduce((acc, item) => {
                acc.totalQuantity += item.quantity;
                acc.totalValue += item.quantity * item.price;
                return acc;
            }, { totalQuantity: 0, totalValue: 0 });

            const orderPayload = {
                orderNumber, partyName, items, orderNote,
                totalQuantity, totalValue, timestamp: new Date().toISOString(), status: 'Pending',
            };
            
            const gsheetPayload = {
                action: 'appendOrder',
                orderData: items.map(item => ({
                    orderNumber, partyName, timestamp: orderPayload.timestamp, orderNote,
                    style: item.fullItemData.Style, color: item.fullItemData.Color,
                    size: item.fullItemData.Size, barcode: item.fullItemData.Barcode,
                    quantity: item.quantity, mrp: item.price,
                    itemTotal: item.quantity * item.price,
                }))
            };

            await database.ref(PENDING_ORDERS_REF).child(orderNumber).set(orderPayload);
            
            // Backup to Google Sheet (non-critical, fire-and-forget)
            try {
                // We use 'no-cors' mode because Apps Script web apps have strict CORS policies.
                // This means we send the request but cannot read the response. The backup will
                // proceed, but the app won't get a success/fail confirmation, preventing a false error UI.
                fetch(GSHEET_BACKUP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify(gsheetPayload),
                });
            } catch (backupError) {
                // This will only catch immediate network errors (e.g., user is offline),
                // not server-side issues from the script itself.
                console.error('Error dispatching to Google Sheet backup:', backupError);
                showToast('Order saved, but could not send to backup sheet.', 'error');
            }

            if (partyHasExistingDraft) await database.ref(`${DRAFTS_REF}/${partyName}`).remove();
            
            playSuccessSound();
            setFinalizedOrder(orderPayload);
            setIsConfirmationModalOpen(false);
            setIsSuccessModalOpen(true);
            resetOrderState();

        } catch (error) {
            console.error("Failed to place order:", error);
            showToast('Error placing order. Please try again.', 'error');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handleSaveDraft = () => {
        if (!partyName) { showToast('Please enter a party name to save a draft.', 'error'); return; }
        if (items.length === 0) { showToast('Cannot save an empty order as a draft.', 'error'); return; }
        const performSave = () => {
            const newDraft = { items, timestamp: new Date().toISOString() };
            database.ref(`${DRAFTS_REF}/${partyName}`).set(newDraft).then(() => showToast('Draft saved successfully!', 'success')).catch((e) => { console.error(e); showToast('Failed to save draft.', 'error'); });
        };
        if (partyHasExistingDraft) { if (window.confirm(`A draft for "${partyName}" already exists. Do you want to replace it?`)) performSave(); } else { performSave(); }
    };
    
    const handleRestoreDraft = (partyNameToRestore) => {
        const draft = drafts[partyNameToRestore];
        if (draft) { setPartyName(partyNameToRestore); setItems(draft.items); setIsDraftModalOpen(false); showToast(`Draft for ${partyNameToRestore} restored!`, 'success'); }
    };

    const handleDeleteDraft = (partyNameToDelete) => {
        if (window.confirm(`Are you sure you want to delete the draft for "${partyNameToDelete}"? This cannot be undone.`)) {
            database.ref(`${DRAFTS_REF}/${partyNameToDelete}`).remove().then(() => showToast('Draft deleted.', 'success')).catch((e) => { console.error(e); showToast('Failed to delete draft.', 'error'); });
        }
    };

    const loadItemsFromDb = async () => {
        const dbItems = await itemDb.getAllItems() as any[];
        if (dbItems && dbItems.length > 0) {
            const grouped = dbItems.reduce((acc, item) => {
                const { Style, Color } = item; if (!Style || !Color) return acc;
                if (!acc[Style]) acc[Style] = {}; if (!acc[Style][Color]) acc[Style][Color] = [];
                acc[Style][Color].push(item); return acc;
            }, {});
            setCatalog({ styles: Object.keys(grouped).sort(), groupedData: grouped });
        }
    };
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        const handleClickOutside = (event) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target)) setIsSuggestionsVisible(false);
            if (styleSearchRef.current && !styleSearchRef.current.contains(event.target)) setIsStyleSearchFocused(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => { window.removeEventListener('resize', handleResize); document.removeEventListener('mousedown', handleClickOutside); }
    }, []);

    const handlePartyNameChange = (e) => {
        const value = e.target.value; setPartyName(value);
        if (value.trim()) {
            const filtered = allParties.filter(p => p.toLowerCase().includes(value.toLowerCase()));
            if (!allParties.some(p => p.toLowerCase() === value.toLowerCase())) filtered.push(`Add: ${value}`);
            setSuggestions(filtered); setIsSuggestionsVisible(true);
        } else { setIsSuggestionsVisible(false); }
    };

    const handleSuggestionClick = (suggestion) => {
        let finalPartyName = '';
        if (suggestion.startsWith('Add: ')) {
            const newParty = suggestion.substring(5).trim();
            if (!allParties.some(p => p.toLowerCase() === newParty.toLowerCase())) database.ref('PartyData').push().set({ name: newParty });
            finalPartyName = newParty;
        } else { finalPartyName = suggestion; }
        setPartyName(finalPartyName); setIsSuggestionsVisible(false);
        if (isMobile) setIsOrderDetailsCollapsed(true);
    };

    const handleQuantityChange = (fullItemData, quantityStr) => {
        const quantity = parseInt(quantityStr, 10); const barcode = fullItemData.Barcode;
        if (isNaN(quantity)) { setItems(currentItems => currentItems.filter(item => item.fullItemData.Barcode !== barcode)); return; }
        setItems(currentItems => {
            const existingItemIndex = currentItems.findIndex(item => item.fullItemData.Barcode === barcode);
            if (quantity > 0) {
                if(existingItemIndex === -1) triggerHapticFeedback();
                if (existingItemIndex > -1) { const newItems = [...currentItems]; newItems[existingItemIndex] = { ...newItems[existingItemIndex], quantity: quantity }; return newItems; } 
                else { const price = parseFloat(String(fullItemData.MRP).replace(/[^0-9.-]+/g, "")) || 0; const newItem: OrderItem = { id: barcode, quantity: quantity, price: price, fullItemData: fullItemData, }; return [...currentItems, newItem]; }
            } else { if (existingItemIndex > -1) return currentItems.filter(item => item.fullItemData.Barcode !== barcode); }
            return currentItems;
        });
    };

    const handleClearCart = () => setItems([]);
    const handleSubmitOrder = () => { if (!partyName || items.length === 0) { showToast('Party name and items are required.', 'error'); return; } setIsConfirmationModalOpen(true); };
    const filteredStyles = useMemo(() => !styleSearchTerm ? catalog.styles : catalog.styles.filter(style => style.toLowerCase().includes(styleSearchTerm.toLowerCase())), [styleSearchTerm, catalog.styles]);
    const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    const renderDraftButton = (isMobileButton = false) => {
        const buttonStyle = isMobileButton ? { ...styles.button, ...styles.stickyButton, flex: 1 } : { ...styles.button };
        if (partyName && partyHasExistingDraft) { return <button onClick={() => setIsDraftModalOpen(true)} style={{ ...buttonStyle, backgroundColor: '#c0392b', color: '#fff', border: 'none' }}>Draft Exists</button>; }
        if (!partyName) { return <button onClick={() => setIsDraftModalOpen(true)} style={{ ...buttonStyle, ...styles.secondaryButton }} disabled={Object.keys(drafts).length === 0}>Open Drafts</button>; }
        return <button onClick={handleSaveDraft} style={{ ...buttonStyle, ...styles.secondaryButton }} disabled={items.length === 0}>Save Draft</button>;
    };

    return (
        <div style={isMobile ? { ...styles.container, padding: '0', paddingBottom: '80px' } : styles.container}>
            <DraftsModal isOpen={isDraftModalOpen} onClose={() => setIsDraftModalOpen(false)} drafts={drafts} onRestore={handleRestoreDraft} onDelete={handleDeleteDraft} />
            <OrderConfirmationModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onPlaceOrder={handlePlaceOrder} partyName={partyName} items={items} note={orderNote} onNoteChange={setOrderNote} isLoading={isPlacingOrder} />
            <SuccessModal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} orderData={finalizedOrder} />
            
            <div style={isMobile ? { ...styles.header, marginBottom: '0.5rem' } : styles.header}>
                {!isMobile && ( <div style={styles.actions}> {renderDraftButton()} <button onClick={handleSubmitOrder} style={styles.button} disabled={items.length === 0 || !partyName}>Submit Order</button> </div> )}
            </div>
            
            <div style={isMobile ? { ...styles.mainLayout, gridTemplateColumns: '1fr' } : styles.mainLayout}>
                <div style={isMobile ? { ...styles.mainPanel, gap: '1rem' } : styles.mainPanel}>
                    {!isMobile && (
                        <div style={{ ...styles.card, gap: 0 }}>
                            <div style={styles.cardHeader}> <h2 style={styles.cardTitleBare}>Order Details</h2> </div>
                             <div style={styles.collapsibleContent}>
                                <div style={{...styles.inputGroup, position: 'relative'}} ref={suggestionBoxRef}>
                                    <label htmlFor="partyName" style={styles.label}>Party Name</label>
                                    <input type="text" id="partyName" style={styles.input} value={partyName} onChange={handlePartyNameChange} onFocus={() => partyName && suggestions.length > 0 && setIsSuggestionsVisible(true)} placeholder="Enter or select a customer" autoComplete="off" />
                                     {isSuggestionsVisible && suggestions.length > 0 && (
                                        <ul style={styles.suggestionsList}>
                                            {suggestions.map((s, i) => ( <li key={i} style={{...styles.suggestionItem, ...(s.startsWith('Add: ') ? styles.addSuggestionItem : {})}} onClick={() => handleSuggestionClick(s)} onMouseDown={(e) => e.preventDefault()}> {s.startsWith('Add: ') ? `+ Add "${s.substring(5)}"` : s} </li> ))}
                                        </ul>
                                     )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={isMobile ? { ...styles.card, flex: 1, padding: '0.5rem', gap: '1rem' } : { ...styles.card, flex: 1 }}>
                         {isMobile && (
                            <>
                                <div style={styles.cardHeader}> <h2 style={styles.cardTitleBare}>{partyName ? `Party: ${partyName}` : 'Order Details'}</h2> {partyName && (<button style={styles.collapseButton} onClick={() => setIsOrderDetailsCollapsed(!isOrderDetailsCollapsed)}> <ChevronIcon collapsed={isOrderDetailsCollapsed} /> </button>)} </div>
                                 <div style={{...styles.collapsibleContent, ...(isOrderDetailsCollapsed ? styles.collapsibleContentCollapsed : {})}}>
                                    <div style={{...styles.inputGroup, position: 'relative'}} ref={suggestionBoxRef}>
                                        <label htmlFor="partyName" style={styles.label}>Party Name</label>
                                        <input type="text" id="partyName" style={styles.input} value={partyName} onChange={handlePartyNameChange} onFocus={() => partyName && suggestions.length > 0 && setIsSuggestionsVisible(true)} placeholder="Enter or select a customer" autoComplete="off" />
                                         {isSuggestionsVisible && suggestions.length > 0 && (
                                            <ul style={styles.suggestionsList}>
                                                {suggestions.map((s, i) => ( <li key={i} style={{...styles.suggestionItem, ...(s.startsWith('Add: ') ? styles.addSuggestionItem : {})}} onClick={() => handleSuggestionClick(s)} onMouseDown={(e) => e.preventDefault()}> {s.startsWith('Add: ') ? `+ Add "${s.substring(5)}"` : s} </li> ))}
                                            </ul>
                                         )}
                                    </div>
                                </div>
                            </>
                         )}

                        {!isMobile && ( <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}> <h2 style={{...styles.cardTitle, marginBottom: '0', paddingBottom: '0', borderBottom: 'none'}}>Search Item</h2> {isSyncing && <div style={styles.syncingText}>Syncing item catalog...</div>} </div> )}
                        
                        <div style={styles.styleSelectorContainer} ref={styleSearchRef}>
                             <input type="text" id="styleSearch" className="global-search-input" style={styles.input} placeholder="Type to search for a style..." value={styleSearchTerm} onChange={e => setStyleSearchTerm(e.target.value)} onFocus={() => setIsStyleSearchFocused(true)} disabled={isSyncing} autoComplete="off" />
                             {isStyleSearchFocused && filteredStyles.length > 0 && (
                                 <div style={styles.styleResultsContainer}>
                                     {filteredStyles.slice(0, 100).map(style => ( <button key={style} style={selectedStyle === style ? {...styles.styleResultItem, ...styles.styleResultItemActive} : styles.styleResultItem} onClick={() => { setSelectedStyle(style); setStyleSearchTerm(style); setIsStyleSearchFocused(false); }}> {style} </button> ))}
                                 </div>
                             )}
                        </div>

                        {selectedStyle && ( <StyleMatrix style={selectedStyle} catalogData={catalog.groupedData} orderItems={items} onQuantityChange={handleQuantityChange} isMobile={isMobile} stockData={stockData} /> )}
                    </div>
                </div>

                {!isMobile && ( <div style={styles.sidePanel}> <Cart items={items} onQuantityChange={handleQuantityChange} onClearCart={handleClearCart} onEditGroup={(group) => setEditingCartGroup(group)} isMobile={isMobile} isModal={false} onClose={()=>{}} draftButton={null} onSubmit={()=>{}}/> </div> )}
            </div>

            {isMobile && (
                <div style={styles.stickyActionBar}>
                    <button style={styles.stickyCartButton} onClick={() => setIsCartModalOpen(true)}> <CartIcon /> {totalQuantity > 0 && <span style={styles.cartCountBadge}>{totalQuantity}</span>} </button>
                    <div style={styles.stickyActionButtons}> {renderDraftButton(true)} <button onClick={handleSubmitOrder} style={{ ...styles.button, ...styles.stickyButton }} disabled={items.length === 0 || !partyName}>Submit Order</button> </div>
                </div>
            )}
            
            {isMobile && isCartModalOpen && (
                <div style={styles.modalOverlay} onClick={() => setIsCartModalOpen(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <Cart items={items} onQuantityChange={handleQuantityChange} onClearCart={() => { handleClearCart(); setIsCartModalOpen(false); }} onEditGroup={(group) => setEditingCartGroup(group)} isMobile={isMobile} isModal={true} onClose={() => setIsCartModalOpen(false)} draftButton={renderDraftButton(true)} onSubmit={() => {handleSubmitOrder(); setIsCartModalOpen(false);}} />
                    </div>
                </div>
            )}
            
            {editingCartGroup && ( <CartDetailModal group={editingCartGroup} items={items.filter(item => item.fullItemData.Style === editingCartGroup.style && item.fullItemData.Color === editingCartGroup.color)} onClose={() => setEditingCartGroup(null)} onQuantityChange={handleQuantityChange} /> )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', flex: 1 },
    header: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0, marginBottom: '1rem' },
    actions: { display: 'flex', gap: '0.75rem' },
    button: { padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.3s ease' },
    secondaryButton: { backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', border: '1px solid var(--skeleton-bg)' },
    mainLayout: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', flex: 1, minHeight: 0 },
    mainPanel: { display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 },
    sidePanel: { minHeight: 0 },
    card: { backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '1rem' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--skeleton-bg)', paddingBottom: '0.75rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '0.5rem', borderBottom: '1px solid var(--skeleton-bg)', paddingBottom: '0.75rem', flexGrow: 1 },
    cardTitleBare: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    collapseButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-color)' },
    collapsibleContent: { maxHeight: '500px', overflow: 'visible', transition: 'max-height 0.4s ease-out, padding-top 0.4s ease-out, opacity 0.3s ease-out', paddingTop: '1rem', opacity: 1 },
    collapsibleContentCollapsed: { maxHeight: 0, paddingTop: 0, opacity: 0, overflow: 'hidden' },
    inputGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' },
    label: { fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-color)' },
    input: { width: '100%', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', backgroundColor: '#fff', color: 'var(--dark-grey)', transition: 'border-color 0.3s ease' },
    suggestionsList: { listStyle: 'none', margin: '0.25rem 0 0', padding: '0.5rem 0', position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: '200px', overflowY: 'auto', zIndex: 10, },
    suggestionItem: { padding: '0.75rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-color)', },
    addSuggestionItem: { color: 'var(--brand-color)', fontWeight: 500, },
    syncingText: { fontSize: '0.85rem', color: 'var(--brand-color)', fontWeight: 500 },
    styleSelectorContainer: { position: 'relative' },
    styleResultsContainer: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '160px', overflowY: 'auto', padding: '0.5rem' },
    styleResultItem: { padding: '0.5rem 1rem', backgroundColor: 'var(--light-grey)', color: 'var(--text-color)', border: '1px solid var(--skeleton-bg)', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '0.85rem', fontWeight: 500, },
    styleResultItemActive: { backgroundColor: 'var(--brand-color)', color: '#fff', borderColor: 'var(--brand-color)' },
    matrixContainer: { marginTop: '1rem' },
    matrixStyleTitle: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--dark-grey)', textAlign: 'center', marginBottom: '1.5rem' },
    matrixGrid: { display: 'flex', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem' },
    colorCard: { borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'all 0.3s' },
    colorHeader: { fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(100, 100, 100, 0.2)' },
    sizeList: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    sizeRow: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '0.75rem' },
    sizeInfoWrapper: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    sizeLabelWrapper: {},
    sizeLabel: { fontSize: '0.9rem', fontWeight: 500 },
    stockIndicator: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
    stockIndicatorPlaceholder: { width: '8px', height: '8px' },
    quantityInput: { width: '45px', height: '32px', padding: '6px 2px', fontSize: '1rem', border: '1px solid var(--skeleton-bg)', borderLeft: 'none', borderRight: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', textAlign: 'center', outline: 'none', borderRadius: 0, boxSizing: 'border-box', appearance: 'textfield', MozAppearance: 'textfield' },
    mrpText: { fontSize: '0.75rem', color: 'var(--text-color)', textAlign: 'left', padding: '2px 0 0', lineHeight: '1' },
    quantityControl: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', },
    quantityButton: { backgroundColor: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', width: '32px', height: '32px', fontSize: '1.2rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', lineHeight: 1, },
    cartContainer: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', height: '100%' },
    cartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--skeleton-bg)', flexShrink: 0 },
    cartHeaderActions: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    clearCartButton: { background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' },
    cartEmptyText: { textAlign: 'center', color: 'var(--text-color)', padding: '3rem 1.25rem', flex: 1 },
    cartItemsList: { flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem' },
    cartItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--skeleton-bg)' },
    cartGroupItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--skeleton-bg)', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    cartItemInfo: { flex: 1 },
    cartItemDetails: { fontWeight: 600, color: 'var(--dark-grey)', fontSize: '0.9rem' },
    cartItemSubDetails: { color: 'var(--text-color)', fontSize: '0.8rem' },
    cartItemActions: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    cartItemRemoveBtn: { background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: '0.5rem', lineHeight: 1 },
    cartFooter: { borderTop: '1px solid var(--skeleton-bg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 },
    cartSummary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: '0.85rem', color: 'var(--text-color)', marginBottom: '0.25rem' },
    summaryValue: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '500px', borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'slideUp 0.3s ease-out', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
    modalCloseButton: { position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', fontSize: '2rem', color: 'var(--text-color)', cursor: 'pointer', zIndex: 1, padding: '0.5rem' },
    cartModalCloseButton: { background: 'none', border: 'none', fontSize: '2.5rem', color: 'var(--text-color)', cursor: 'pointer', padding: 0, lineHeight: '1' },
    stickyActionBar: { position: 'fixed', bottom: '0', left: 0, right: 0, backgroundColor: 'var(--card-bg)', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--skeleton-bg)', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', zIndex: 90 },
    stickyCartButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-grey)', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative', padding: '0.5rem' },
    cartCountBadge: { position: 'absolute', top: '-2px', right: '-5px', backgroundColor: '#e74c3c', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, border: '2px solid var(--card-bg)' },
    stickyActionButtons: { display: 'flex', gap: '0.75rem', flex: 1, justifyContent: 'flex-end' },
    stickyButton: { padding: '0.75rem 1rem', fontSize: '0.9rem' },
    draftsList: { flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem' },
    draftItem: { borderBottom: '1px solid var(--skeleton-bg)', padding: '0.75rem 0' },
    draftHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0' },
    draftInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    draftPartyName: { fontWeight: 600, color: 'var(--dark-grey)' },
    draftMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', fontSize: '0.8rem' },
    draftTimestamp: { display: 'flex', alignItems: 'center', gap: '0.25rem' },
    draftActions: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    draftActionButton: { background: 'none', border: '1px solid var(--skeleton-bg)', color: 'var(--text-color)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    draftRestoreButton: { borderColor: 'var(--brand-color)', color: 'var(--brand-color)' },
    draftItemsDetails: { padding: '0.75rem', backgroundColor: 'var(--light-grey)', borderRadius: '8px', marginTop: '0.5rem' },
    draftItemsHeader: { display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--skeleton-bg)', fontWeight: '600', fontSize: '0.8rem', color: 'var(--dark-grey)' },
    draftItemRow: { display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '0.5rem', padding: '0.5rem 0', fontSize: '0.85rem' },
    confirmationBody: { padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' },
    confirmationSection: { color: 'var(--dark-grey)' },
    confirmationSectionTitle: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-grey)', marginBottom: '0.75rem', borderBottom: '1px solid var(--skeleton-bg)', paddingBottom: '0.5rem' },
    notesTextarea: { width: '100%', minHeight: '80px', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', resize: 'vertical' },
    predefinedNotesContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' },
    predefinedNoteButton: { background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', borderRadius: '20px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' },
    successIconContainer: { margin: '0 auto', },
    successDetails: { border: '1px solid var(--skeleton-bg)', borderRadius: '8px', marginTop: '1.5rem', textAlign: 'left' },
    successDetailItem: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)' },
    spinner: { border: '3px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTop: '3px solid #fff', width: '20px', height: '20px', animation: 'spin 1s linear infinite' },
    successModalButtons: { display: 'flex', gap: '1rem', width: '100%', marginTop: '2rem' },
};

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .checkmark-circle { stroke-dasharray: 166; stroke-dashoffset: 166; stroke-width: 2; stroke-miterlimit: 10; stroke: #2ecc71; fill: none; animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards; }
    .checkmark { width: 80px; height: 80px; border-radius: 50%; display: block; stroke-width: 3; stroke: #fff; stroke-miterlimit: 10; margin: auto; box-shadow: inset 0px 0px 0px #2ecc71; animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both; }
    .checkmark-check { transform-origin: 50% 50%; stroke-dasharray: 48; stroke-dashoffset: 48; animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards; }
    @keyframes stroke { 100% { stroke-dashoffset: 0; } }
    @keyframes scale { 0%, 100% { transform: none; } 50% { transform: scale3d(1.1, 1.1, 1); } }
    @keyframes fill { 100% { box-shadow: inset 0px 0px 0px 40px #2ecc71; } }

    @media (max-width: 768px) { .modalContentOnMobile { animation: slideUp 0.3s ease-out; border-radius: var(--border-radius) var(--border-radius) 0 0; height: 85vh; } .modalOverlayOnMobile { align-items: flex-end; } }
    input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
`;
document.head.appendChild(styleSheet);