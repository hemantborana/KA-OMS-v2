
import React, { useState, useMemo, useEffect, useRef } from 'react';
// FIX: Switched to Firebase v8 compat imports to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- Firebase Drafts Configuration ---
const DRAFTS_REF = 'KA-OMS-v2-Draft';

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
const RestoreIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

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
            const request = indexedDB.open('StockDataDB', 1);
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
};

// --- HELPER FUNCTION FOR ROBUST KEY MATCHING ---
const normalizeKeyPart = (part: any): string => {
    if (!part) return '';
    // Converts to string, uppercases, trims, and removes all non-alphanumeric characters
    // This ensures 'EVE BLU' matches 'EVEBLU', and 'A-039' matches 'A039'
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
        } else { // default size
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
        color = '#e74c3c'; // Red for out of stock or unavailable
        if (isUnavailable) {
            title = 'Stock: Unavailable';
        }
    } else if (stockLevel >= 1 && stockLevel <= 3) {
        color = '#f1c40f'; // Yellow for low stock
    } else if (stockLevel >= 4) {
        color = '#2ecc71'; // Green for healthy stock
    }

    if (!color) {
        return <div style={styles.stockIndicatorPlaceholder}></div>;
    }

    const style = {
        ...styles.stockIndicator,
        backgroundColor: color,
    };

    return <span style={style} title={title} />;
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
        if (!isNaN(num)) {
            return `${num}/-`;
        }
        return null;
    };

    const handleQuantityStep = (item, currentQuantity, step) => {
        const currentVal = Number(currentQuantity) || 0;
        const newValue = Math.max(0, currentVal + step);
        onQuantityChange(item, String(newValue));
    };

    const upperColor = color.toUpperCase();
    const isDark = upperColor.includes('BLK') || upperColor.includes('BLACK') || upperColor.includes('NAVY');

    const getColorCardStyle = () => {
        const baseStyle: React.CSSProperties = { ...styles.colorCard };
        if (isMobile) {
            baseStyle.flex = '1 1 140px';
            baseStyle.minWidth = '140px';
            baseStyle.padding = '0.5rem';
            baseStyle.gap = '0.5rem';
        } else {
             baseStyle.width = '190px';
             baseStyle.flexShrink = 0;
        }
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
    
    const themedStyles = {
        mrpText: isDark ? { ...styles.mrpText, color: '#A0AEC0' } : styles.mrpText,
    };
    
    const computedStyles = useMemo(() => {
        const s = {
            sizeRow: styles.sizeRow,
            sizeLabel: styles.sizeLabel,
        };
        if (isMobile) {
            s.sizeRow = { ...s.sizeRow, gridTemplateColumns: '1fr auto', gap: '0.5rem' };
            s.sizeLabel = { ...s.sizeLabel, fontSize: '0.85rem' };
        }
        return s;
    }, [isMobile]);

    const colorHeaderStyle: React.CSSProperties = isMobile 
        ? {...styles.colorHeader, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'} 
        : styles.colorHeader;

    return (
        <div style={getColorCardStyle()}>
            <div style={colorHeaderStyle} onClick={() => isMobile && setIsCollapsed(!isCollapsed)}>
                <span>{color}</span>
                {isMobile && <ChevronIcon collapsed={isCollapsed} />}
            </div>
            {(!isMobile || !isCollapsed) && (
                <div style={styles.sizeList}>
                    {allSizesForStyle.map(size => {
                        const itemData = itemsBySize[size];
                        if (itemData) {
                            const quantity = itemsByBarcode[itemData.Barcode] || '';
                            const formattedMrp = formatMRP(itemData.MRP);
                            const stockKey = `${normalizeKeyPart(itemData.Style)}-${normalizeKeyPart(itemData.Color)}-${normalizeKeyPart(itemData.Size)}`;
                            const stockLevel = stockData[stockKey];

                            return (
                                <div key={size} style={computedStyles.sizeRow}>
                                    <div style={styles.sizeInfoWrapper}>
                                        <div style={styles.sizeLabelWrapper}>
                                            <label style={computedStyles.sizeLabel}>{size}</label>
                                            {formattedMrp && <div style={themedStyles.mrpText}>{formattedMrp}</div>}
                                        </div>
                                        <StockIndicator stockLevel={stockLevel} />
                                    </div>
                                    <QuantityControl 
                                        value={quantity}
                                        onChange={(value) => onQuantityChange(itemData, value)}
                                        onStep={(step) => handleQuantityStep(itemData, quantity, step)}
                                        isDark={isDark}
                                        size={isMobile ? 'small' : 'default'}
                                    />
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
        colors.forEach(color => {
            styleData[color].forEach(item => sizeSet.add(item.Size));
        });
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
        const braSizeRegex = /(\d+)([A-Z]+)/;

        return Array.from(sizeSet).sort((a, b) => {
            const aMatch = a.match(braSizeRegex);
            const bMatch = b.match(braSizeRegex);
            
            if (aMatch && bMatch) {
                const [, aBand, aCup] = aMatch;
                const [, bBand, bCup] = bMatch;
                if (aBand !== bBand) {
                    return parseInt(aBand) - parseInt(bBand);
                }
                return aCup.localeCompare(bCup);
            }

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
    
    const matrixStyleTitleStyle = isMobile ? { ...styles.matrixStyleTitle, marginBottom: '0.25rem' } : styles.matrixStyleTitle;
    const matrixGridStyle = isMobile
        ? { ...styles.matrixGrid, gap: '0.5rem' }
        : { ...styles.matrixGrid, justifyContent: 'flex-start' };

    return (
        <div style={styles.matrixContainer}>
            <h3 style={matrixStyleTitleStyle}>{style}</h3>
            <div style={matrixGridStyle}>
                {colors.map(color => (
                    <CollapsibleColorCard
                        key={color}
                        color={color}
                        itemsInColor={styleData[color]}
                        allSizesForStyle={allSizesForStyle}
                        itemsByBarcode={itemsByBarcode}
                        onQuantityChange={onQuantityChange}
                        isMobile={isMobile}
                        stockData={stockData}
                    />
                ))}
            </div>
        </div>
    );
};

const CartDetailModal = ({ group, items, onClose, onQuantityChange }) => {
    const handleQuantityStep = (item, currentQuantity, step) => {
        const currentVal = Number(currentQuantity) || 0;
        const newValue = Math.max(0, currentVal + step);
        onQuantityChange(item.fullItemData, String(newValue));
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, height: 'auto', maxHeight: '80vh'}} onClick={(e) => e.stopPropagation()}>
                <div style={styles.cartHeader}>
                    <div>
                        <h2 style={styles.cardTitleBare}>Edit Item</h2>
                        <p style={styles.cartItemSubDetails}>{`${group.style} - ${group.color}`}</p>
                    </div>
                    <button style={styles.modalCloseButton} onClick={onClose} aria-label="Close edit view">&times;</button>
                </div>
                <div style={styles.cartItemsList}>
                     {items.sort((a,b) => a.fullItemData.Size.localeCompare(b.fullItemData.Size, undefined, {numeric: true})).map(item => (
                        <div key={item.id} style={styles.cartItem}>
                            <div style={styles.cartItemInfo}>
                                <div style={styles.cartItemDetails}>{`Size: ${item.fullItemData.Size}`}</div>
                                <div style={styles.cartItemSubDetails}>{formatCurrency(item.price)}</div>
                            </div>
                            <div style={styles.cartItemActions}>
                                <QuantityControl
                                    value={item.quantity}
                                    onChange={(value) => onQuantityChange(item.fullItemData, value)}
                                    onStep={(step) => handleQuantityStep(item, item.quantity, step)}
                                    size="small"
                                />
                                <button onClick={() => onQuantityChange(item.fullItemData, '0')} style={styles.cartItemRemoveBtn} aria-label="Remove item">
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{...styles.cartFooter, borderTop: 'none', padding: '1rem 1.25rem'}}>
                    <button onClick={onClose} style={{...styles.button, width: '100%'}}>Done</button>
                </div>
            </div>
        </div>
    );
};


const Cart = ({ items, onQuantityChange, onClearCart, onSubmit, onSaveDraft, onEditGroup, isMobile, isModal, onClose, draftButton }) => {
    const { totalQuantity, totalValue, groupedItems } = useMemo(() => {
        const summary = { totalQuantity: 0, totalValue: 0 };
        if (!items || items.length === 0) return { ...summary, groupedItems: [] };
        
        const groups = items.reduce((acc, item) => {
            summary.totalQuantity += item.quantity;
            summary.totalValue += item.quantity * item.price;
            const key = `${item.fullItemData.Style}-${item.fullItemData.Color}`;
            if (!acc[key]) {
                acc[key] = { style: item.fullItemData.Style, color: item.fullItemData.Color, totalQuantity: 0 };
            }
            acc[key].totalQuantity += item.quantity;
            return acc;
        }, {} as Record<string, { style: string; color: string; totalQuantity: number; }>);
        
        // FIX: Explicitly typing sort parameters resolves an issue where TypeScript infers them as 'unknown' from Object.values.
        const sortedGroups = Object.values(groups).sort((a: { style: string; color: string; }, b: { style: string; color: string; }) => a.style.localeCompare(b.style) || a.color.localeCompare(b.color));
        return { ...summary, groupedItems: sortedGroups };
    }, [items]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);
    };

    return (
        <div style={styles.cartContainer}>
            <div style={styles.cartHeader}>
                <h2 style={styles.cardTitleBare}>Order Summary</h2>
                 <div style={styles.cartHeaderActions}>
                    {items.length > 0 && (
                        <button onClick={onClearCart} style={styles.clearCartButton}>Clear All</button>
                    )}
                    {isModal && <button onClick={onClose} style={styles.cartModalCloseButton}>&times;</button>}
                </div>
            </div>
            
            {items.length === 0 ? (
                <p style={styles.cartEmptyText}>Your cart is empty. Add items from the style matrix.</p>
            ) : (
                <div style={styles.cartItemsList}>
                    {groupedItems.map(group => (
                        <button key={`${group.style}-${group.color}`} style={styles.cartGroupItem} onClick={() => onEditGroup(group)}>
                            <div style={styles.cartItemInfo}>
                                <div style={styles.cartItemDetails}>{`${group.style} - ${group.color}`}</div>
                                <div style={styles.cartItemSubDetails}>{`Total Qty: ${group.totalQuantity}`}</div>
                            </div>
                            <ChevronRightIcon />
                        </button>
                    ))}
                </div>
            )}

            <div style={styles.cartFooter}>
                <div style={styles.cartSummary}>
                    <div>
                        <div style={styles.summaryLabel}>Total Quantity</div>
                        <div style={styles.summaryValue}>{totalQuantity} Items</div>
                    </div>
                    <div>
                        <div style={styles.summaryLabel}>Total Value</div>
                        <div style={styles.summaryValue}>{formatCurrency(totalValue)}</div>
                    </div>
                </div>
                {isMobile && (
                     <div style={styles.stickyActionButtons}>
                        {draftButton}
                        <button onClick={onSubmit} style={{ ...styles.button, ...styles.stickyButton, flex: 1 }}>Submit Order</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// FIX: Added strong typing to component props and internal state/functions to resolve multiple TypeScript errors.
interface DraftsModalProps {
    isOpen: boolean;
    onClose: () => void;
    drafts: Record<string, Draft>;
    onRestore: (partyName: string) => void;
    onDelete: (partyName: string) => void;
}

const DraftsModal: React.FC<DraftsModalProps> = ({ isOpen, onClose, drafts, onRestore, onDelete }) => {
    const [expandedDraft, setExpandedDraft] = useState<string | null>(null);

    if (!isOpen) return null;

    const sortedDrafts = Object.entries(drafts).sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const formatTimestamp = (isoString: string) => {
        if (!isoString) return 'Unknown time';
        return new Date(isoString).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };
    
    const totalQuantity = (items: OrderItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, height: 'auto', maxHeight: '85vh', maxWidth: '600px'}} onClick={(e) => e.stopPropagation()}>
                <div style={styles.cartHeader}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <FolderIcon />
                        <h2 style={styles.cardTitleBare}>Saved Drafts</h2>
                    </div>
                    <button style={styles.modalCloseButton} onClick={onClose} aria-label="Close drafts view">&times;</button>
                </div>
                <div style={styles.draftsList}>
                    {sortedDrafts.length === 0 ? (
                        <p style={styles.cartEmptyText}>You have no saved drafts.</p>
                    ) : (
                        sortedDrafts.map(([partyName, draft]) => (
                            <div key={partyName} style={styles.draftItem}>
                                <div style={styles.draftHeader} onClick={() => setExpandedDraft(expandedDraft === partyName ? null : partyName)}>
                                    <div style={styles.draftInfo}>
                                        <p style={styles.draftPartyName}>{partyName}</p>
                                        <div style={styles.draftMeta}>
                                            <span style={styles.draftTimestamp}><ClockIcon /> {formatTimestamp(draft.timestamp)}</span>
                                            <span>|</span>
                                            <span>{totalQuantity(draft.items)} items</span>
                                        </div>
                                    </div>
                                    <div style={styles.draftActions}>
                                         <button onClick={(e) => { e.stopPropagation(); onDelete(partyName); }} style={styles.draftActionButton} aria-label={`Delete draft for ${partyName}`}>
                                            <TrashIcon />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onRestore(partyName); }} style={{...styles.draftActionButton, ...styles.draftRestoreButton}} aria-label={`Restore draft for ${partyName}`}>
                                            <RestoreIcon />
                                        </button>
                                        <ChevronIcon collapsed={expandedDraft !== partyName} />
                                    </div>
                                </div>
                                {expandedDraft === partyName && (
                                    <div style={styles.draftItemsDetails}>
                                        <div style={styles.draftItemsHeader}>
                                            <span>Style</span>
                                            <span>Color</span>
                                            <span>Size</span>
                                            <span>Qty</span>
                                        </div>
                                        <ul>
                                            {draft.items.map(item => (
                                                <li key={item.id} style={styles.draftItemRow}>
                                                    <span>{item.fullItemData.Style}</span>
                                                    <span>{item.fullItemData.Color}</span>
                                                    <span>{item.fullItemData.Size}</span>
                                                    <span>{item.quantity}</span>
                                                </li>
                                            ))}
                                        </ul>
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


export const NewOrderEntry = () => {
    // --- STATE MANAGEMENT ---
    const [partyName, setPartyName] = useState('');
// FIX: Strongly type the items state using the OrderItem interface.
    const [items, setItems] = useState<OrderItem[]>([]);
    
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
    const [stockData, setStockData] = useState({});
    
    // UI State
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isCartModalOpen, setIsCartModalOpen] = useState(false);
    const [isOrderDetailsCollapsed, setIsOrderDetailsCollapsed] = useState(false);
    const [editingCartGroup, setEditingCartGroup] = useState(null);
// FIX: Strongly type the drafts state using the Draft interface. This resolves multiple TypeScript errors.
    const [drafts, setDrafts] = useState<Record<string, Draft>>({});
    const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

    const partyHasExistingDraft = useMemo(() => partyName && drafts[partyName], [partyName, drafts]);


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
        
        const loadStockData = async () => {
            const stockItems = await stockDb.getAllStock() as any[];
            if (stockItems && stockItems.length > 0) {
                const stockMap = stockItems.reduce((acc, item) => {
                    if (item.style && item.color && item.size) {
                       const key = `${normalizeKeyPart(item.style)}-${normalizeKeyPart(item.color)}-${normalizeKeyPart(item.size)}`;
                       acc[key] = item.stock;
                    }
                    return acc;
                }, {});
                setStockData(stockMap);
            }
        };
        loadStockData();
        return () => metadataRef.off('value', syncCheck);
    }, []);

    // --- DRAFT MANAGEMENT ---
    useEffect(() => {
        const draftsRef = database.ref(DRAFTS_REF);
        const listener = draftsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            setDrafts(data || {});
        });

        // Cleanup listener on unmount
        return () => draftsRef.off('value', listener);
    }, []);

    const handleSaveDraft = () => {
        if (!partyName) {
            showToast('Please enter a party name to save a draft.', 'error');
            return;
        }
        if (items.length === 0) {
            showToast('Cannot save an empty order as a draft.', 'error');
            return;
        }

        const performSave = () => {
            const newDraft = { items, timestamp: new Date().toISOString() };
            database.ref(`${DRAFTS_REF}/${partyName}`).set(newDraft)
                .then(() => {
                    showToast('Draft saved successfully!', 'success');
                })
                .catch((error) => {
                    console.error("Error saving draft:", error);
                    showToast('Failed to save draft.', 'error');
                });
        };

        if (partyHasExistingDraft) {
            if (window.confirm(`A draft for "${partyName}" already exists. Do you want to replace it?`)) {
                performSave();
            }
        } else {
            performSave();
        }
    };
    
    const handleRestoreDraft = (partyNameToRestore) => {
        const draft = drafts[partyNameToRestore];
        if (draft) {
            setPartyName(partyNameToRestore);
            setItems(draft.items);
            setIsDraftModalOpen(false);
            showToast(`Draft for ${partyNameToRestore} restored!`, 'success');
        }
    };

    const handleDeleteDraft = (partyNameToDelete) => {
        if (window.confirm(`Are you sure you want to delete the draft for "${partyNameToDelete}"? This cannot be undone.`)) {
            database.ref(`${DRAFTS_REF}/${partyNameToDelete}`).remove()
                .then(() => {
                    showToast('Draft deleted.', 'success');
                })
                .catch((error) => {
                    console.error("Error deleting draft:", error);
                    showToast('Failed to delete draft.', 'error');
                });
        }
    };


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
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
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
        let finalPartyName = '';
        if (suggestion.startsWith('Add: ')) {
            const newParty = suggestion.substring(5).trim();
            if (!allParties.some(p => p.toLowerCase() === newParty.toLowerCase())) {
                database.ref('PartyData').push().set({ name: newParty });
            }
            finalPartyName = newParty;
        } else { 
            finalPartyName = suggestion;
        }
        setPartyName(finalPartyName);
        setIsSuggestionsVisible(false);
        if (isMobile) {
            setIsOrderDetailsCollapsed(true);
        }
    };

    const handleQuantityChange = (fullItemData, quantityStr) => {
        const quantity = parseInt(quantityStr, 10);
        const barcode = fullItemData.Barcode;
        
        if (isNaN(quantity)) { // Handles empty input
             setItems(currentItems => currentItems.filter(item => item.fullItemData.Barcode !== barcode));
             return;
        }

        setItems(currentItems => {
            const existingItemIndex = currentItems.findIndex(item => item.fullItemData.Barcode === barcode);
    
            if (quantity > 0) {
                if(existingItemIndex === -1) triggerHapticFeedback(); // Vibrate only on adding a new item
                
                if (existingItemIndex > -1) {
                    const newItems = [...currentItems];
                    newItems[existingItemIndex] = { ...newItems[existingItemIndex], quantity: quantity };
                    return newItems;
                } else {
                    const price = parseFloat(String(fullItemData.MRP).replace(/[^0-9.-]+/g, "")) || 0;
                    const newItem: OrderItem = {
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

    const handleClearCart = () => {
        setItems([]);
    };
    
    const handleSubmitOrder = () => {
        if (!partyName || items.length === 0) {
            showToast('Party name and items are required to submit an order.', 'error');
            return;
        }

        showToast('Order submitted!', 'success');
        // If a draft existed for this party, clear it upon submission
        if (partyHasExistingDraft) {
            database.ref(`${DRAFTS_REF}/${partyName}`).remove();
        }
        setItems([]);
        setPartyName('');
    };

    const filteredStyles = useMemo(() => {
        if (!styleSearchTerm) return catalog.styles;
        return catalog.styles.filter(style =>
            style.toLowerCase().includes(styleSearchTerm.toLowerCase())
        );
    }, [styleSearchTerm, catalog.styles]);
    
    const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    const renderDraftButton = (isMobileButton = false) => {
        const buttonStyle = isMobileButton 
            ? { ...styles.button, ...styles.stickyButton, flex: 1 } 
            : { ...styles.button };
            
        if (partyName && partyHasExistingDraft) {
            return (
                <button
                    onClick={() => setIsDraftModalOpen(true)}
                    style={{ ...buttonStyle, backgroundColor: '#c0392b', color: '#fff', border: 'none' }}
                >
                    Draft Exists
                </button>
            );
        }
    
        if (!partyName) {
            return (
                <button
                    onClick={() => setIsDraftModalOpen(true)}
                    style={{ ...buttonStyle, ...styles.secondaryButton }}
                    disabled={Object.keys(drafts).length === 0}
                >
                    Open Drafts
                </button>
            );
        }
    
        // Party name selected, but no draft exists
        return (
            <button
                onClick={handleSaveDraft}
                style={{ ...buttonStyle, ...styles.secondaryButton }}
                disabled={items.length === 0}
            >
                Save Draft
            </button>
        );
    };

    // --- RENDER ---
    const mainLayoutStyle = isMobile ? { ...styles.mainLayout, gridTemplateColumns: '1fr' } : styles.mainLayout;
    
    const containerStyle = isMobile 
        ? { ...styles.container, padding: '0', paddingBottom: '80px' } 
        : { ...styles.container };
        
    const headerStyle = isMobile ? { ...styles.header, marginBottom: '0.5rem' } : styles.header;
// FIX: Corrected a typo from 'mainPanel' to 'styles.mainPanel' to fix a reference error.
    const mainPanelStyle = isMobile ? { ...styles.mainPanel, gap: '1rem' } : styles.mainPanel;

    const orderDetailsCardStyle = { ...styles.card, gap: 0 };

    const searchItemCardStyle = isMobile
        ? { ...styles.card, flex: 1, padding: '0.5rem', gap: '1rem' }
        : { ...styles.card, flex: 1 };
        
    return (
        <div style={containerStyle}>
            <DraftsModal
                isOpen={isDraftModalOpen}
                onClose={() => setIsDraftModalOpen(false)}
                drafts={drafts}
                onRestore={handleRestoreDraft}
                onDelete={handleDeleteDraft}
            />

            <div style={headerStyle}>
                {!isMobile && (
                    <div style={styles.actions}>
                        {renderDraftButton()}
                        <button onClick={handleSubmitOrder} style={styles.button} disabled={items.length === 0 || !partyName}>Submit Order</button>
                    </div>
                )}
            </div>
            
            <div style={mainLayoutStyle}>
                <div style={mainPanelStyle}>
                    {!isMobile && (
                        <div style={orderDetailsCardStyle}>
                            <div style={styles.cardHeader}>
                               <h2 style={styles.cardTitleBare}>Order Details</h2>
                            </div>
                             <div style={styles.collapsibleContent}>
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
                        </div>
                    )}

                    <div style={searchItemCardStyle}>
                         {isMobile && (
                            <>
                                <div style={styles.cardHeader}>
                                   <h2 style={styles.cardTitleBare}>{partyName ? `Party: ${partyName}` : 'Order Details'}</h2>
                                    {partyName && (
                                        <button style={styles.collapseButton} onClick={() => setIsOrderDetailsCollapsed(!isOrderDetailsCollapsed)}>
                                            <ChevronIcon collapsed={isOrderDetailsCollapsed} />
                                        </button>
                                    )}
                                </div>
                                 <div style={{...styles.collapsibleContent, ...(isOrderDetailsCollapsed ? styles.collapsibleContentCollapsed : {})}}>
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
                            </>
                         )}

                        {!isMobile && (
                             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                               <h2 style={{...styles.cardTitle, marginBottom: '0', paddingBottom: '0', borderBottom: 'none'}}>Search Item</h2>
                               {isSyncing && <div style={styles.syncingText}>Syncing item catalog...</div>}
                             </div>
                        )}
                        
                        <div style={styles.styleSelectorContainer} ref={styleSearchRef}>
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
                                isMobile={isMobile}
                                stockData={stockData}
                            />
                        )}
                    </div>
                </div>

                {!isMobile && (
                    <div style={styles.sidePanel}>
{/* FIX: Added missing 'isModal', 'onClose', and 'draftButton' props to the Cart component. */}
                        <Cart 
                           items={items} 
                           onQuantityChange={handleQuantityChange} 
                           onClearCart={handleClearCart} 
                           onSubmit={handleSubmitOrder}
                           onSaveDraft={handleSaveDraft}
                           onEditGroup={(group) => setEditingCartGroup(group)}
                           isMobile={isMobile}
                           isModal={false}
                           onClose={() => {}}
                           draftButton={null}
                        />
                    </div>
                )}
            </div>

            {isMobile && (
                <div style={styles.stickyActionBar}>
                    <button style={styles.stickyCartButton} onClick={() => setIsCartModalOpen(true)}>
                        <CartIcon />
                        {totalQuantity > 0 && <span style={styles.cartCountBadge}>{totalQuantity}</span>}
                    </button>
                    <div style={styles.stickyActionButtons}>
                        {renderDraftButton(true)}
                        <button onClick={handleSubmitOrder} style={{ ...styles.button, ...styles.stickyButton }} disabled={items.length === 0 || !partyName}>Submit Order</button>
                    </div>
                </div>
            )}
            
            {isMobile && isCartModalOpen && (
                <div style={styles.modalOverlay} onClick={() => setIsCartModalOpen(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <Cart 
                           items={items} 
                           onQuantityChange={handleQuantityChange} 
                           onClearCart={() => { handleClearCart(); setIsCartModalOpen(false); }} 
                           onSubmit={() => { handleSubmitOrder(); setIsCartModalOpen(false); }}
                           onSaveDraft={handleSaveDraft}
                           onEditGroup={(group) => setEditingCartGroup(group)}
                           isMobile={isMobile}
                           isModal={true}
                           onClose={() => setIsCartModalOpen(false)}
                           draftButton={renderDraftButton(true)}
                        />
                    </div>
                </div>
            )}
            
            {editingCartGroup && (
                <CartDetailModal
                    group={editingCartGroup}
                    items={items.filter(item => 
                        item.fullItemData.Style === editingCartGroup.style && 
                        item.fullItemData.Color === editingCartGroup.color
                    )}
                    onClose={() => setEditingCartGroup(null)}
                    onQuantityChange={handleQuantityChange}
                />
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', flex: 1 },
    header: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', flexShrink: 0, marginBottom: '1rem' },
    title: { fontSize: '1.75rem', fontWeight: 600, color: 'var(--dark-grey)' },
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
    modalContent: { backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '500px', maxHeight: '700px', borderRadius: 'var(--border-radius)', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'slideUp 0.3s ease-out', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
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
};

// Add keyframes for modal animation
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @media (max-width: 768px) {
      .modalContentOnMobile {
        animation: slideUp 0.3s ease-out;
        border-radius: var(--border-radius) var(--border-radius) 0 0;
        height: 85vh;
      }
      .modalOverlayOnMobile {
        align-items: flex-end;
      }
    }
    input[type=number]::-webkit-outer-spin-button,
    input[type=number]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type=number] {
        -moz-appearance: textfield;
    }
`;
document.head.appendChild(styleSheet);