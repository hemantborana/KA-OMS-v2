
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid white', borderRight: '3px solid transparent' }}></div>;
const SummarizedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const DetailedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const ProcessIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const NoteIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"></path><polyline points="14 3 14 9 20 9"></polyline></svg>;
const BoxIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>;
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const CheckSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const SquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const AlertCircleIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;

// --- TYPE & FIREBASE ---
interface HistoryEvent { timestamp: string; event: string; details: string; }
interface Order { orderNumber: string; partyName: string; timestamp: string; totalQuantity: number; totalValue: number; orderNote?: string; items: any[]; history?: HistoryEvent[]; tags?: string[]; }
const PENDING_ORDERS_REF = 'Pending_Order_V2';
const BILLING_ORDERS_REF = 'Ready_For_Billing_V2';
const DELETED_ORDERS_REF = 'Deleted_Orders_V2';
const EXPIRED_ORDERS_REF = 'Expired_Orders_V2';
const STOCK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyY4ys2VzcsmslZj-vYieV1l-RRTp90eDMwcdANFZ3qecf8VRPgz-dNo46jqIqencqF/exec';


// --- HELPERS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};

const timeSince = (dateString) => {
    if (!dateString) return 'N/A';
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "now";
};

const normalizeKeyPart = (part: any): string => {
    if (!part) return '';
    return String(part).toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
};

// Generates a soft pastel color based on the string
const getPastelColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    // High lightness and lower saturation for soft pastel look
    return `hsl(${h}, 70%, 93%)`; 
};

// Generates a darker shade of the pastel color for text
const getDarkerPastelColor = (str: string) => {
     let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 35%)`; 
};

const getTagStyle = (tag: string) => {
    const lower = tag.toLowerCase();
    let colors = { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' }; // Default Grey
    
    if (lower.includes('hold')) colors = { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }; // Red
    else if (lower.includes('stock') || lower.includes('wait')) colors = { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }; // Amber
    else if (lower.includes('confirm')) colors = { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' }; // Indigo
    else if (lower.includes('urgent')) colors = { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' }; // Pink
    else if (lower.includes('partial')) colors = { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' }; // Emerald

    return {
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        marginRight: '4px',
        marginBottom: '4px',
        whiteSpace: 'nowrap'
    } as React.CSSProperties;
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

const Swipeable: React.FC<{ onProcess: () => void; onDelete: () => void; onEdit: () => void; children: React.ReactNode; }> = ({ onProcess, onDelete, onEdit, children }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);
    const isScrolling = useRef(false);
    const animationFrameId = useRef(null);

    const resetOpenItems = useCallback(() => {
        document.querySelectorAll('.swipeable-content.swiped-open').forEach(node => {
            if (node !== contentRef.current) {
                (node as HTMLElement).style.transform = 'translateX(0px)';
                (node as HTMLElement).style.transition = 'transform 0.3s ease';
                node.classList.remove('swiped-open');
            }
        });
    }, []);
    
    const setTranslateX = (x: number) => {
        if (contentRef.current) {
            contentRef.current.style.transform = `translateX(${x}px)`;
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        resetOpenItems();
        startX.current = e.touches[0].clientX;
        currentX.current = startX.current;
        isDragging.current = true;
        isScrolling.current = false;
        if (contentRef.current) contentRef.current.style.transition = 'none';
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || !contentRef.current) return;

        currentX.current = e.touches[0].clientX;
        const diffX = currentX.current - startX.current;

        // Simple check to distinguish between scroll and swipe
        if (!isScrolling.current && Math.abs(e.touches[0].clientY - startX.current) > Math.abs(diffX) && Math.abs(diffX) < 10) {
             isDragging.current = false;
             return;
        }
        
        if (!isScrolling.current) {
             e.preventDefault();
        }
        isScrolling.current = true;
        
        animationFrameId.current = requestAnimationFrame(() => {
            const newTranslateX = Math.max(-80, Math.min(160, diffX));
            setTranslateX(newTranslateX);
        });
    };

    const handleTouchEnd = () => {
        if (!isDragging.current || !contentRef.current) return;
        isDragging.current = false;
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        
        contentRef.current.style.transition = 'transform 0.3s ease';
        const currentTransform = new WebKitCSSMatrix(window.getComputedStyle(contentRef.current).transform).m41;

        if (currentTransform > 80) { // Swiped right enough to open left actions
            setTranslateX(160);
            contentRef.current.classList.add('swiped-open');
        } else if (currentTransform < -40) { // Swiped left enough to open right action
            setTranslateX(-80);
            contentRef.current.classList.add('swiped-open');
        } else { // Not swiped enough, snap back
            setTranslateX(0);
            contentRef.current.classList.remove('swiped-open');
        }
    };
    
    return (
        <div style={styles.swipeableContainer}>
            <div style={styles.swipeableLeftActions}>
                <button onClick={onEdit} style={{...styles.swipeAction, backgroundColor: '#3498db'}}><EditIcon /></button>
                <button onClick={onDelete} style={{...styles.swipeAction, backgroundColor: '#e74c3c'}}><TrashIcon /></button>
            </div>
            <div style={styles.swipeableRightActions}>
                <button onClick={onProcess} style={{...styles.swipeAction, backgroundColor: '#2ecc71'}}><ProcessIcon /></button>
            </div>
            <div ref={contentRef} className="swipeable-content" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={styles.swipeableContent}>
                {children}
            </div>
        </div>
    );
};


// --- COMPONENTS ---
const ExpandedPendingView = ({ order, onProcess, onDelete, isProcessing, processingQty, onQtyChange, stockData, isMobile, onPrint, onAddNote, onAddTag, onRemoveTag }) => {
    const [note, setNote] = useState('');
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);

    const handleProcessClick = () => {
        const totalToProcess = Object.values(processingQty).reduce((sum: number, qty: number) => sum + qty, 0);
        if (totalToProcess === 0) {
            showToast("Cannot process with zero quantity.", 'error');
            return;
        }
        onProcess(order, processingQty);
    };

    const handleAddNoteClick = () => {
        if (!note.trim()) return;
        onAddNote(order, note);
        setNote('');
    };

    const renderDesktopTable = () => (
         <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead><tr>
                    <th style={{...styles.th, textAlign: 'left'}}>Style</th>
                    <th style={{...styles.th, textAlign: 'left'}}>Color</th>
                    <th style={{...styles.th, textAlign: 'left'}}>Size</th>
                    <th style={{...styles.th, textAlign: 'center'}}>Stock</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Ordered</th>
                    <th style={{...styles.th, textAlign: 'right'}}>To Process</th>
                </tr></thead>
                <tbody>
                    {order.items.map((item, index) => {
                        const stockKey = `${normalizeKeyPart(item.fullItemData.Style)}-${normalizeKeyPart(item.fullItemData.Color)}-${normalizeKeyPart(item.fullItemData.Size)}`;
                        const qtyToProcess = processingQty[item.id] || 0;
                        const isPartial = qtyToProcess > 0 && qtyToProcess < item.quantity;
                        const stockLevel = stockData[stockKey] ?? 0;
                        
                        let rowStyle = {...styles.tr};
                        if (index % 2 !== 0) rowStyle.backgroundColor = '#f8f9fa';
                        if (isPartial) rowStyle.backgroundColor = '#fffbe6';

                        return (
                            <tr key={item.id} style={rowStyle}>
                                <td style={{...styles.td, textAlign: 'left'}}>{item.fullItemData.Style}</td>
                                <td style={{...styles.td, textAlign: 'left'}}>{item.fullItemData.Color}</td>
                                <td style={{...styles.td, textAlign: 'left'}}>{item.fullItemData.Size}</td>
                                <td style={{...styles.td, textAlign: 'center'}}>
                                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'}}>
                                        <StockIndicator stockLevel={stockLevel} />
                                        <span style={{fontSize: '0.8rem', color: 'var(--text-color)'}}>{stockLevel}</span>
                                    </div>
                                </td>
                                <td style={{...styles.td, textAlign: 'right'}}>{item.quantity}</td>
                                <td style={{...styles.td, ...styles.tdInput}}>
                                    <input type="number" style={{...styles.qtyInput, textAlign: 'right'}} value={processingQty[item.id] || ''} onChange={(e) => onQtyChange(item.id, e.target.value, item.quantity)} placeholder="0" max={item.quantity} min="0" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderMobileCards = () => (
        <div style={styles.mobileItemContainer}>
            {order.items.map(item => {
                const stockKey = `${normalizeKeyPart(item.fullItemData.Style)}-${normalizeKeyPart(item.fullItemData.Color)}-${normalizeKeyPart(item.fullItemData.Size)}`;
                return (
                    <div key={item.id} style={styles.mobileItemCard}>
                        <div style={styles.mobileItemInfo}>
                            <div style={styles.mobileItemName}>{item.fullItemData.Style} - {item.fullItemData.Color} - <strong>{item.fullItemData.Size}</strong></div>
                            <div style={styles.mobileItemStock}>
                                <StockIndicator stockLevel={stockData[stockKey]} />
                                <span style={{fontSize: '0.8rem', color: 'var(--dark-grey)'}}>Stock: {stockData[stockKey] ?? 0}</span>
                            </div>
                        </div>
                        <div style={styles.mobileItemQty}>
                            <div style={styles.mobileQtyLabel}>Ordered: {item.quantity}</div>
                             <input type="number" style={{...styles.qtyInput, width: '80px'}} value={processingQty[item.id] || ''} onChange={(e) => onQtyChange(item.id, e.target.value, item.quantity)} placeholder="0" max={item.quantity} min="0" />
                        </div>
                    </div>
                )
            })}
        </div>
    );
    
    return (
        <div style={styles.expandedViewContainer}>
            {isMobile ? renderMobileCards() : renderDesktopTable()}
            
            {/* Tags Section */}
            <div style={styles.tagsSection}>
                <div style={styles.tagsHeader}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-grey)'}}>
                        <TagIcon /> <span>Tags</span>
                    </div>
                </div>
                <div style={styles.tagsList}>
                    {order.tags?.map(tag => (
                        <span key={tag} style={getTagStyle(tag)}>
                            {tag}
                            <button onClick={() => onRemoveTag(order, tag)} style={styles.removeTagButton}><XIcon/></button>
                        </span>
                    ))}
                     <div style={styles.addTagContainer}>
                         <select 
                            style={styles.tagSelect} 
                            onChange={(e) => { 
                                if(e.target.value === 'custom') {
                                    const custom = prompt("Enter custom tag:");
                                    if (custom) { onAddTag(order, custom); e.target.value=''; }
                                } else if(e.target.value) { 
                                    onAddTag(order, e.target.value); 
                                    e.target.value=''; 
                                } 
                            }}
                         >
                            <option value="">+ Add Tag</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Awaiting Stock">Awaiting Stock</option>
                            <option value="Customer Confirmation Needed">Customer Confirmation Needed</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Partial Shipment">Partial Shipment</option>
                            <option value="custom">Create Custom...</option>
                         </select>
                    </div>
                </div>
            </div>

            {order.orderNote && <div style={styles.noteBox}><strong>Note:</strong> {order.orderNote}</div>}
            
            <div style={styles.historySection}>
                <button style={styles.historyHeader} onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <HistoryIcon />
                        <span>Notes & History</span>
                    </div>
                    <ChevronIcon collapsed={isHistoryCollapsed} />
                </button>
                {!isHistoryCollapsed && (
                    <div style={styles.historyContent}>
                        <div style={styles.historyList}>
                            {(order.history || []).map((event, index) => (
                                <div key={index} style={styles.historyItem}>
                                    <div style={styles.historyMeta}>
                                        <span style={{...styles.historyEventType, backgroundColor: event.event === 'System' ? '#eef2f7' : '#fffbe6', color: event.event === 'System' ? 'var(--brand-color)' : '#d48806'}}>{event.event}</span>
                                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p style={styles.historyDetails}>{event.details}</p>
                                </div>
                            ))}
                        </div>
                        <div style={styles.addNoteContainer}>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                style={styles.noteTextarea}
                                placeholder="Add a new note..."
                            />
                            <button onClick={handleAddNoteClick} style={styles.addNoteButton}>Add Note</button>
                        </div>
                    </div>
                )}
            </div>

            <div style={styles.modalFooter}>
                 <button onClick={() => onPrint([order])} style={styles.secondaryButton} disabled={isProcessing}>
                    <PrintIcon /> Print Picking List
                </button>
                <div style={styles.footerActions}>
                    <button onClick={() => onDelete(order)} style={styles.deleteButton} disabled={isProcessing}>
                       <TrashIcon />
                    </button>
                    <button onClick={handleProcessClick} style={styles.modalActionButton} disabled={isProcessing}>
                        {isProcessing ? <SmallSpinner /> : 'Process for Billing'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DetailedOrderCard: React.FC<{
    order: Order;
    isExpanded: boolean;
    isMobile: boolean;
    isSelected: boolean;
    onToggleExpand: (order: Order) => void;
    onSelectOrder: (orderNumber: string) => void;
    onProcessOrder: (order: Order) => void;
    onDeleteOrder: (order: Order) => void;
    onEditOrder: (order: Order) => void;
}> = ({
    order,
    isExpanded,
    isMobile,
    isSelected,
    onToggleExpand,
    onSelectOrder,
    onProcessOrder,
    onDeleteOrder,
    onEditOrder
}) => {
    const isOverdue = new Date().getTime() - new Date(order.timestamp).getTime() > 25 * 24 * 60 * 60 * 1000;

    const uniqueStyles = useMemo(() => {
        if (!order.items) return [];
        return [...new Set(order.items.map(item => item.fullItemData.Style))];
    }, [order.items]);
    const stylePreview = uniqueStyles.slice(0, 3).join(' / ');

    const cardStyle = {
        ...(isExpanded ? styles.detailedOrderCardActive : styles.detailedOrderCard),
        ...(isMobile && { margin: '0 0 0.75rem' })
    };

    const orderContent = (
        <div style={cardStyle} onClick={() => onToggleExpand(order)}>
            {/* Top Row: Party Name & Checkbox */}
            <div style={styles.cardTopRow}>
                <h3 style={styles.cardPartyName}>{order.partyName}</h3>
                <button style={styles.checkboxButton} onClick={(e) => { e.stopPropagation(); onSelectOrder(order.orderNumber); }}>
                    {isSelected ? <CheckSquareIcon /> : <SquareIcon />}
                </button>
            </div>

            {/* Second Row: Order Number & Time */}
            <div style={styles.cardMetaRow}>
                 <span style={styles.cardOrderNumber}>#{order.orderNumber}</span>
                 <span style={styles.cardSeparator}>•</span>
                 <span style={styles.cardTime}>{timeSince(order.timestamp)} ago</span>
            </div>
            
            {/* Third Row: Preview */}
            {stylePreview && <p style={styles.stylePreview}>{stylePreview}{uniqueStyles.length > 3 ? '...' : ''}</p>}

            {/* Tags */}
             {order.tags && order.tags.length > 0 && (
                <div style={styles.tagsContainer}>
                    {order.tags.map(tag => <span key={tag} style={getTagStyle(tag)}>{tag}</span>)}
                </div>
            )}

            {/* Footer: Icons/Metrics */}
            <div style={styles.cardFooterRow}>
                <div style={styles.metricGroup}>
                    <div style={styles.iconMetric} title="Total Quantity">
                        <BoxIcon /> <span>{order.totalQuantity}</span>
                    </div>
                    <div style={styles.iconMetric} title="Total Value">
                         <span style={{fontSize: '1.1em', fontWeight: 'bold', lineHeight: 1}}>₹</span> <span>{order.totalValue?.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                {/* Status Icons Grouped at the end */}
                <div style={styles.statusIconGroup}>
                    {order.orderNote && <NoteIcon style={{color: '#f39c12', fill: 'rgba(243, 156, 18, 0.2)'}} title="Has Note" />}
                    {order.totalQuantity > 50 && <BoxIcon style={{color: '#3498db', fill: 'rgba(52, 152, 219, 0.2)'}} title="High Volume" />}
                    {isOverdue && <AlertCircleIcon style={{color: '#e74c3c', fill: 'rgba(231, 76, 60, 0.2)'}} title="Overdue" />}
                </div>
            </div>
        </div>
    );

    return isMobile ? (
        <Swipeable onProcess={() => onProcessOrder(order)} onDelete={() => onDeleteOrder(order)} onEdit={() => onEditOrder(order)}>
            {orderContent}
        </Swipeable>
    ) : (
        orderContent
    );
};

const DetailedList: React.FC<{ orders: Order[]; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; children: React.ReactNode; onProcessOrder: (order: Order) => void; onDeleteOrder: (order: Order) => void; onEditOrder: (order: Order) => void; isMobile: boolean; selectedOrders: string[]; onSelectOrder: (orderNumber: string) => void; }> = ({ orders, onToggleExpand, expandedOrderNumber, children, onProcessOrder, onDeleteOrder, onEditOrder, isMobile, selectedOrders, onSelectOrder }) => {
    return (
        <div style={isMobile ? {...styles.card, padding: 0, backgroundColor: 'transparent', border: 'none', overflow: 'visible'} : {...styles.card, padding: 0}}>
            {orders.map(order => (
                 <React.Fragment key={order.orderNumber}>
                    <DetailedOrderCard
                        order={order}
                        isExpanded={expandedOrderNumber === order.orderNumber}
                        isMobile={isMobile}
                        isSelected={selectedOrders.includes(order.orderNumber)}
                        onToggleExpand={onToggleExpand}
                        onSelectOrder={onSelectOrder}
                        onProcessOrder={onProcessOrder}
                        onDeleteOrder={onDeleteOrder}
                        onEditOrder={onEditOrder}
                    />
                    {expandedOrderNumber === order.orderNumber && children}
                </React.Fragment>
            ))}
        </div>
    );
}

const PartyGroup: React.FC<{ partyName: string; data: any; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; children: React.ReactNode; onProcessOrder: (order: Order) => void; onDeleteOrder: (order: Order) => void; onEditOrder: (order: Order) => void; isMobile: boolean; selectedOrders: string[]; onSelectOrder: (orderNumber: string) => void; index?: number; totalCount?: number; }> = ({ partyName, data, onToggleExpand, expandedOrderNumber, children, onProcessOrder, onDeleteOrder, onEditOrder, isMobile, selectedOrders, onSelectOrder, index, totalCount }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const totalQty = data.orders.reduce((sum, order) => sum + order.totalQuantity, 0);
    const firstLetter = partyName.charAt(0).toUpperCase();

    // Calculate pastel colors
    const pastelBg = useMemo(() => getPastelColor(partyName), [partyName]);
    const pastelText = useMemo(() => getDarkerPastelColor(partyName), [partyName]);

    const mobileCardStyle = useMemo(() => {
        if (!isMobile) return styles.card;
        
        const baseStyle: React.CSSProperties = {
            ...styles.card,
            borderRadius: '0',
            margin: '0',
            border: 'none', 
            boxShadow: 'none',
            backgroundColor: '#FAFAFA' // Soft white
        };

        const isFirst = index === 0;
        const isLast = index === (totalCount || 0) - 1;
        const radius = '12px';
        
        if (isFirst) {
            baseStyle.borderRadius = `${radius} ${radius} 0 0`;
        }
        if (isLast) {
            baseStyle.borderRadius = baseStyle.borderRadius === `${radius} ${radius} 0 0` ? radius : `0 0 ${radius} ${radius}`;
        }

        return baseStyle;
    }, [isMobile, index, totalCount]);

    const renderHeader = () => {
        if (isMobile) {
            return (
                <div style={styles.mobilePartyHeaderContent}>
                    <div style={{...styles.partyAvatar, backgroundColor: pastelBg, color: pastelText}}>{firstLetter}</div>
                    <div style={styles.mobilePartyInfo}>
                        <div style={styles.mobilePartyName}>{partyName}</div>
                        <div style={styles.mobilePartyMeta}>
                            {data.orderCount} Orders • {totalQty} Qty
                        </div>
                    </div>
                    <div style={styles.mobileChevron}>
                         <ChevronIcon collapsed={isCollapsed} />
                    </div>
                </div>
            );
        }
        return (
            <div style={styles.cardInfo}>
                <span style={styles.cardTitle}>{partyName}</span>
                <span style={styles.cardSubTitle}>{data.orderCount} Orders | Total Qty: {totalQty}</span>
                <ChevronIcon collapsed={isCollapsed} />
            </div>
        );
    };

    return (
        <div style={isMobile ? mobileCardStyle : styles.card}>
            <button style={isMobile ? styles.mobileCardHeader : styles.cardHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
               {renderHeader()}
            </button>
             {/* Custom Divider for Mobile (not last item) */}
             {isMobile && index !== (totalCount || 0) - 1 && (
                <div style={{height: '1px', backgroundColor: '#e0e0e0', margin: '0 16px'}}></div>
            )}
            {/* Smooth expansion container */}
            <div style={isCollapsed ? styles.groupContentCollapsed : styles.groupContentExpanded}>
                 <div style={styles.cardDetails}>
                    <DetailedList 
                        orders={data.orders} 
                        onToggleExpand={onToggleExpand}
                        expandedOrderNumber={expandedOrderNumber}
                        children={children}
                        onProcessOrder={onProcessOrder}
                        onDeleteOrder={onDeleteOrder}
                        onEditOrder={onEditOrder}
                        isMobile={isMobile}
                        selectedOrders={selectedOrders}
                        onSelectOrder={onSelectOrder}
                    />
                </div>
            </div>
        </div>
    );
};

export const PendingOrders = ({ onNavigate }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stockData, setStockData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('summarized');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'ascending' });
    const [expandedOrderNumber, setExpandedOrderNumber] = useState<string | null>(null);
    const [processingOrder, setProcessingOrder] = useState<string | null>(null);
    const [processingQty, setProcessingQty] = useState<Record<string, number>>({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

    // State for Command Center Layout
    const [selectedParty, setSelectedParty] = useState<string | null>(null);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    
    // --- Data Fetching and Management ---
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        const ordersRef = firebase.database().ref(PENDING_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            setOrders(data ? Object.values(data) as Order[] : []);
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch orders.');
            setIsLoading(false);
        });

        const loadStockData = async () => {
            let localDataLoaded = false;
            try {
                const localStock = await stockDb.getAllStock() as any[];
                if (localStock && localStock.length > 0) {
                    const stockMap = localStock.reduce((acc, item) => {
                        const key = `${normalizeKeyPart(item.style)}-${normalizeKeyPart(item.color)}-${normalizeKeyPart(item.size)}`;
                        acc[key] = item.stock;
                        return acc;
                    }, {});
                    setStockData(stockMap);
                    localDataLoaded = true;
                }
    
                const response = await fetch(STOCK_SCRIPT_URL);
                if (!response.ok) {
                     if (!localDataLoaded) setError("Could not load stock data. The app may not function correctly.");
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
                            const key = `${normalizeKeyPart(item.style)}-${normalizeKeyPart(item.color)}-${normalizeKeyPart(item.size)}`;
                            acc[key] = item.stock;
                            return acc;
                        }, {});
                        setStockData(stockMap);
                    }
                } else {
                     if (!localDataLoaded) setError("Could not load stock data. The app may not function correctly.");
                }
            } catch (dbError) {
                console.error("Failed to load stock from IndexedDB:", dbError);
                if (!localDataLoaded) {
                    setError("Could not load stock data. The app may not function correctly.");
                }
            }
        };

        loadStockData();
        return () => {
            window.removeEventListener('resize', handleResize);
            ordersRef.off('value', listener);
        }
    }, []);

    // --- Order Expiration Logic ---
    useEffect(() => {
        const manageExpiredOrders = async () => {
            const pendingSnapshot = await firebase.database().ref(PENDING_ORDERS_REF).once('value');
            const pendingOrders = pendingSnapshot.val();
            const expiredSnapshot = await firebase.database().ref(EXPIRED_ORDERS_REF).once('value');
            const expiredOrders = expiredSnapshot.val() || {};
            
            const now = new Date().getTime();
            const fortyDaysAgo = now - (40 * 24 * 60 * 60 * 1000);
            const seventyDaysAgo = now - (70 * 24 * 60 * 60 * 1000);
            const updates = {};
            let updated = false;

            if (pendingOrders) {
                for (const orderNumber in pendingOrders) {
                    const order = pendingOrders[orderNumber];
                    if (new Date(order.timestamp).getTime() < fortyDaysAgo) {
                        updates[`${PENDING_ORDERS_REF}/${orderNumber}`] = null;
                        updates[`${EXPIRED_ORDERS_REF}/${orderNumber}`] = { ...order, expiredTimestamp: new Date().toISOString(), expirationReason: 'Expired after 40 days in pending.'};
                        updated = true;
                    }
                }
            }
            
            for (const orderNumber in expiredOrders) {
                const order = expiredOrders[orderNumber];
                if (new Date(order.timestamp).getTime() < seventyDaysAgo) {
                    updates[`${EXPIRED_ORDERS_REF}/${orderNumber}`] = null;
                    updated = true;
                }
            }

            if (updated) {
                await firebase.database().ref().update(updates);
                showToast('Automatically managed expired orders.', 'info');
            }
        };

        const timer = setTimeout(manageExpiredOrders, 5000); // Run 5s after component mount
        return () => clearTimeout(timer);
    }, []);

    // --- Tag Logic ---
    const availableTags = useMemo(() => {
        const tags = new Set<string>();
        orders.forEach(o => o.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [orders]);

    const handleAddTag = async (order: Order, tag: string) => {
        const currentTags = order.tags || [];
        if (currentTags.includes(tag)) return;
        const newTags = [...currentTags, tag];
        const newEvent = { timestamp: new Date().toISOString(), event: 'Tag Added', details: `Added tag: ${tag}` };
        const updatedHistory = [...(order.history || []), newEvent];
        try {
            await firebase.database().ref(`${PENDING_ORDERS_REF}/${order.orderNumber}`).update({ tags: newTags, history: updatedHistory });
            showToast(`Tag "${tag}" added.`, 'success');
        } catch(e) { console.error(e); showToast('Failed to add tag.', 'error'); }
    };

    const handleRemoveTag = async (order: Order, tag: string) => {
        const newTags = (order.tags || []).filter(t => t !== tag);
        const newEvent = { timestamp: new Date().toISOString(), event: 'Tag Removed', details: `Removed tag: ${tag}` };
        const updatedHistory = [...(order.history || []), newEvent];
        try {
             await firebase.database().ref(`${PENDING_ORDERS_REF}/${order.orderNumber}`).update({ tags: newTags, history: updatedHistory });
             showToast(`Tag "${tag}" removed.`, 'success');
        } catch(e) { console.error(e); showToast('Failed to remove tag.', 'error'); }
    };


    const handleProcessOrder = useCallback(async (order: Order, quantitiesToProcess: Record<string, number>) => {
        setProcessingOrder(order.orderNumber);
        try {
            const updates = {};
            const itemsToProcess = [];
            const itemsRemainingInPending = [];

            order.items.forEach(item => {
                const processQty = quantitiesToProcess[item.id] || 0;
                if (processQty > 0) itemsToProcess.push({ ...item, quantity: processQty });
                if (item.quantity > processQty) itemsRemainingInPending.push({ ...item, quantity: item.quantity - processQty });
            });

            if (itemsToProcess.length === 0) { showToast("Cannot process with zero quantity.", 'error'); return; }
            
            const totalProcessedQty = itemsToProcess.reduce((sum, i) => sum + i.quantity, 0);
            const newHistoryEvent = {
                timestamp: new Date().toISOString(),
                event: 'System',
                details: `Processed ${itemsToProcess.length} item types. Total Qty: ${totalProcessedQty}.`
            };
            const updatedHistory = [...(order.history || []), newHistoryEvent];

            const billingOrderRefPath = `${BILLING_ORDERS_REF}/${order.orderNumber}`;
            const pendingOrderRefPath = `${PENDING_ORDERS_REF}/${order.orderNumber}`;
            const existingBillingSnap = await firebase.database().ref(billingOrderRefPath).once('value');
            const existingBillingOrder = existingBillingSnap.val() as Order | null;
            const finalBillingItemsMap = new Map(existingBillingOrder?.items.map(i => [i.id, i]) || []);
            
            itemsToProcess.forEach(newItem => {
                const existingItem = finalBillingItemsMap.get(newItem.id);
                if (existingItem) { existingItem.quantity += newItem.quantity; } 
                else { finalBillingItemsMap.set(newItem.id, newItem); }
            });
            
            const finalBillingItems = Array.from(finalBillingItemsMap.values());
            updates[billingOrderRefPath] = { ...order, items: finalBillingItems, totalQuantity: finalBillingItems.reduce((sum, i) => sum + i.quantity, 0), totalValue: finalBillingItems.reduce((sum, i) => sum + (i.quantity * i.price), 0), history: updatedHistory };
            updates[pendingOrderRefPath] = itemsRemainingInPending.length > 0 ? { ...order, items: itemsRemainingInPending, totalQuantity: itemsRemainingInPending.reduce((sum, i) => sum + i.quantity, 0), totalValue: itemsRemainingInPending.reduce((sum, i) => sum + (i.quantity * i.price), 0), history: updatedHistory } : null;
            
            await firebase.database().ref().update(updates);
            showToast(`Processed items for ${order.orderNumber}.`, 'success');
            setExpandedOrderNumber(null);
            setActiveOrder(null);
        } catch(e) {
            console.error(e);
            showToast('Failed to process order.', 'error');
        } finally {
            setProcessingOrder(null);
        }
    }, []);

    const handleDeleteOrder = useCallback(async (order: Order) => {
        if (!window.confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) return;
        setProcessingOrder(order.orderNumber);
        const reason = prompt("Optional: Provide a reason for deleting this order:", "");
        const newHistoryEvent = {
            timestamp: new Date().toISOString(),
            event: 'System',
            details: `Order deleted. Reason: ${reason || 'Not specified'}`
        };
        const updatedHistory = [...(order.history || []), newHistoryEvent];
        const deletedOrderData = { ...order, deletionReason: reason, deletedTimestamp: new Date().toISOString(), history: updatedHistory };

        try {
            const updates = { [`${DELETED_ORDERS_REF}/${order.orderNumber}`]: deletedOrderData, [`${PENDING_ORDERS_REF}/${order.orderNumber}`]: null };
            await firebase.database().ref().update(updates);
            showToast('Order moved to Deleted archive.', 'success');
            setExpandedOrderNumber(null);
            setActiveOrder(null);
        } catch(e) {
            console.error(e);
            showToast('Failed to delete order.', 'error');
        } finally {
            setProcessingOrder(null);
        }
    }, []);
    
    const handleBatchDelete = () => {
        if (selectedOrders.length === 0) { showToast('No orders selected.', 'error'); return; }
        if (window.confirm(`Are you sure you want to delete all ${selectedOrders.length} selected orders?`)) {
            const reason = prompt("Optional: Provide a reason for deleting these orders:", "Batch deletion.");
            selectedOrders.forEach(orderNum => {
                const order = orders.find(o => o.orderNumber === orderNum);
                if (order) {
                    const newHistoryEvent = { timestamp: new Date().toISOString(), event: 'System', details: `Order deleted. Reason: ${reason || 'Not specified'}`};
                    const updatedHistory = [...(order.history || []), newHistoryEvent];
                    const deletedOrderData = { ...order, deletionReason: reason, deletedTimestamp: new Date().toISOString(), history: updatedHistory };
                    const updates = { [`${DELETED_ORDERS_REF}/${order.orderNumber}`]: deletedOrderData, [`${PENDING_ORDERS_REF}/${order.orderNumber}`]: null };
                    firebase.database().ref().update(updates);
                }
            });
            showToast(`${selectedOrders.length} orders deleted.`, 'success');
            setSelectedOrders([]);
        }
    };

    const handleAddNote = async (order: Order, noteText: string) => {
        if (!noteText.trim()) return;
        const newNoteEvent = {
            timestamp: new Date().toISOString(),
            event: 'Note',
            details: noteText.trim()
        };
        const updatedHistory = [...(order.history || []), newNoteEvent];
        try {
            await firebase.database().ref(`${PENDING_ORDERS_REF}/${order.orderNumber}/history`).set(updatedHistory);
            showToast('Note added successfully!', 'success');
        } catch (e) {
            console.error('Failed to add note:', e);
            showToast('Failed to add note.', 'error');
        }
    };

    const handleEditOrder = useCallback((order: Order) => {
        sessionStorage.setItem('orderToEdit', JSON.stringify(order));
        onNavigate('Entry');
    }, [onNavigate]);
    
    const handleProcessFullOrder = useCallback((order: Order) => {
        if (window.confirm(`Process all items for order ${order.orderNumber}?`)) {
            const fullQuantities = order.items.reduce((acc, item) => {
                acc[item.id] = item.quantity;
                return acc;
            }, {});
            handleProcessOrder(order, fullQuantities);
        }
    }, [handleProcessOrder]);

    const handleToggleExpand = (order: Order) => {
        const orderNumber = order.orderNumber;
        if (expandedOrderNumber === orderNumber) {
            setExpandedOrderNumber(null);
        } else {
            setProcessingQty(order.items.reduce((acc, item) => ({...acc, [item.id]: 0}), {}));
            setExpandedOrderNumber(orderNumber);
        }
    };
    
    const handleProcessingQtyChange = (itemId, value, maxQty) => {
        const numValue = Math.max(0, Math.min(maxQty, Number(value) || 0));
        setProcessingQty(prev => ({ ...prev, [itemId]: numValue }));
    };

    const handleSelectOrderCheckbox = (orderNumber: string) => {
        setSelectedOrders(prev => prev.includes(orderNumber) ? prev.filter(o => o !== orderNumber) : [...prev, orderNumber]);
    };
    
    const handleBatchProcess = () => {
        if (selectedOrders.length === 0) { showToast('No orders selected.', 'error'); return; }
        if (window.confirm(`Are you sure you want to process all ${selectedOrders.length} selected orders?`)) {
            selectedOrders.forEach(orderNum => {
                const order = orders.find(o => o.orderNumber === orderNum);
                if (order) {
                    const fullQuantities = order.items.reduce((acc, item) => ({...acc, [item.id]: item.quantity}), {});
                    handleProcessOrder(order, fullQuantities);
                }
            });
            setSelectedOrders([]);
        }
    };

    const handlePrintPickingList = async (ordersToPrint: Order[]) => {
        if (ordersToPrint.length === 0) { showToast('No orders to print.', 'error'); return; }
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Consolidated Picking List", 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 22, { align: 'center' });

        const allItems = ordersToPrint.flatMap(order => order.items.map(item => ({ ...item, orderNumber: order.orderNumber, partyName: order.partyName })));
        const groupedByStyle = allItems.reduce((acc, item) => {
            const style = item.fullItemData.Style;
            if (!acc[style]) acc[style] = [];
            acc[style].push(item);
            return acc;
        }, {});

        const tableRows = [];
        for (const style of Object.keys(groupedByStyle).sort()) {
            const itemsInStyle = groupedByStyle[style];
            const groupedByColor = itemsInStyle.reduce((acc, item) => {
                const color = item.fullItemData.Color;
                if (!acc[color]) acc[color] = [];
                acc[color].push(item);
                return acc;
            }, {});

            for (const color of Object.keys(groupedByColor).sort()) {
                const itemsInColor = groupedByColor[color];
                 itemsInColor.sort((a,b) => a.fullItemData.Size.localeCompare(b.fullItemData.Size, undefined, {numeric: true}))
                 .forEach(item => {
                    const stockKey = `${normalizeKeyPart(item.fullItemData.Style)}-${normalizeKeyPart(item.fullItemData.Color)}-${normalizeKeyPart(item.fullItemData.Size)}`;
                    tableRows.push([
                        item.fullItemData.Style,
                        item.fullItemData.Color,
                        item.fullItemData.Size,
                        item.quantity,
                        stockData[stockKey] ?? 0,
                        `${item.partyName} (${item.orderNumber})`
                    ]);
                 });
            }
        }
        
        (doc as any).autoTable({
            head: [['Style', 'Color', 'Size', 'Qty to Pick', 'Stock', 'Customer (Order)']],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [71, 84, 104] },
        });

        doc.save(`Picking_List_${Date.now()}.pdf`);
    };

    const filteredAndSortedOrders = useMemo(() => {
        let items = [...orders];
        
        if (activeTagFilter) {
            items = items.filter(order => order.tags?.includes(activeTagFilter));
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            items = items.filter(order => order.partyName.toLowerCase().includes(lowercasedTerm) || order.orderNumber.toLowerCase().includes(lowercasedTerm));
        }

        items.sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            let comparison = 0;
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
            return sortConfig.direction === 'ascending' ? comparison : comparison * -1;
        });
        return items;
    }, [orders, searchTerm, sortConfig, activeTagFilter]);

    const summarizedData = useMemo(() => {
        return filteredAndSortedOrders.reduce((acc, order) => {
            if (!acc[order.partyName]) { acc[order.partyName] = { orderCount: 0, orders: [] }; }
            acc[order.partyName].orderCount += 1;
            acc[order.partyName].orders.push(order);
            return acc;
        }, {});
    }, [filteredAndSortedOrders]);

    const partyNamesInOrder = useMemo(() => {
        if (view !== 'summarized') return [];
        return [...new Set(filteredAndSortedOrders.map(o => o.partyName))];
    }, [filteredAndSortedOrders, view]);

    const expandedOrder = useMemo(() => expandedOrderNumber ? orders.find(o => o.orderNumber === expandedOrderNumber) : null, [expandedOrderNumber, orders]);

    // --- Command Center Logic ---
    const parties = useMemo(() => {
        return filteredAndSortedOrders.reduce((acc, order) => {
            if (!acc[order.partyName]) {
                acc[order.partyName] = 0;
            }
            acc[order.partyName]++;
            return acc;
        }, {});
    }, [filteredAndSortedOrders]);

    const ordersForMiddlePanel = useMemo(() => {
        if (!selectedParty) return filteredAndSortedOrders;
        return filteredAndSortedOrders.filter(o => o.partyName === selectedParty);
    }, [filteredAndSortedOrders, selectedParty]);

    const handleSelectParty = (partyName: string) => {
        setSelectedParty(prev => (prev === partyName ? null : partyName));
        setActiveOrder(null);
    };

    const handleSelectOrder = (order: Order) => {
        setActiveOrder(order);
        setProcessingQty(order.items.reduce((acc, item) => ({...acc, [item.id]: 0}), {}));
    };
    
    const renderMobileLayout = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No pending orders.</div>;
        if (filteredAndSortedOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search.</div>;

        const expandedView = expandedOrder ? (
            <ExpandedPendingView
                order={expandedOrder}
                onProcess={handleProcessOrder}
                onDelete={handleDeleteOrder}
                isProcessing={processingOrder === expandedOrder.orderNumber}
                processingQty={processingQty}
                onQtyChange={handleProcessingQtyChange}
                stockData={stockData}
                isMobile={isMobile}
                onPrint={handlePrintPickingList}
                onAddNote={handleAddNote}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
            />
        ) : null;
        
        const commonProps = {
            onToggleExpand: handleToggleExpand,
            expandedOrderNumber: expandedOrderNumber,
            onProcessOrder: handleProcessFullOrder,
            onDeleteOrder: handleDeleteOrder,
            onEditOrder: handleEditOrder,
            isMobile: isMobile,
            selectedOrders: selectedOrders,
            onSelectOrder: handleSelectOrderCheckbox,
        };

        if (view === 'summarized') {
            return (
                <div style={styles.listContainer}>
                    {partyNamesInOrder.map((partyName, index) => (
                        <PartyGroup 
                            key={partyName} 
                            partyName={partyName} 
                            data={summarizedData[partyName]} 
                            {...commonProps}
                            index={index}
                            totalCount={partyNamesInOrder.length}
                        >
                            {expandedView}
                        </PartyGroup>
                    ))}
                </div>
            );
        }

        return (
            <div style={styles.listContainer}>
                <DetailedList orders={filteredAndSortedOrders} {...commonProps}>
                    {expandedView}
                </DetailedList>
            </div>
        );
    };
    
    const renderDesktopLayout = () => {
         if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;

        return (
            <div style={styles.commandCenterLayout}>
                {/* Left Panel: Party List */}
                <div style={styles.leftPanel}>
                    <div style={styles.panelHeader}>Parties ({Object.keys(parties).length})</div>
                    <div style={styles.panelContent}>
                        {Object.entries(parties).map(([partyName, count]) => (
                            <button
                                key={partyName}
                                style={selectedParty === partyName ? styles.partyListItemActive : styles.partyListItem}
                                onClick={() => handleSelectParty(partyName)}
                            >
                                <span style={styles.partyNameText}>{partyName}</span>
                                <span style={styles.partyCountBadge}>{count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Middle Panel: Order List */}
                <div style={styles.middlePanel}>
                    <div style={styles.panelHeader}>
                        Orders ({ordersForMiddlePanel.length})
                    </div>
                    <div style={styles.panelContent}>
                        {ordersForMiddlePanel.map(order => (
                             <div key={order.orderNumber} onClick={() => handleSelectOrder(order)}>
                                <DetailedOrderCard
                                    order={order}
                                    isExpanded={activeOrder?.orderNumber === order.orderNumber}
                                    isMobile={false}
                                    isSelected={selectedOrders.includes(order.orderNumber)}
                                    onToggleExpand={handleSelectOrder}
                                    onSelectOrder={handleSelectOrderCheckbox}
                                    onProcessOrder={handleProcessFullOrder}
                                    onDeleteOrder={handleDeleteOrder}
                                    onEditOrder={handleEditOrder}
                                />
                             </div>
                        ))}
                    </div>
                </div>
                
                {/* Right Panel: Processing View */}
                <div style={styles.rightPanel}>
                    {activeOrder ? (
                        <ExpandedPendingView
                            order={activeOrder}
                            onProcess={handleProcessOrder}
                            onDelete={handleDeleteOrder}
                            isProcessing={processingOrder === activeOrder.orderNumber}
                            processingQty={processingQty}
                            onQtyChange={handleProcessingQtyChange}
                            stockData={stockData}
                            isMobile={false}
                            onPrint={handlePrintPickingList}
                            onAddNote={handleAddNote}
                            onAddTag={handleAddTag}
                            onRemoveTag={handleRemoveTag}
                        />
                    ) : (
                        <div style={styles.rightPanelPlaceholder}>
                            Select an order to view details and process.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const sortOptions = [
        { key: 'timestamp', direction: 'ascending', label: 'Oldest' },
        { key: 'timestamp', direction: 'descending', label: 'Newest' },
        { key: 'partyName', direction: 'ascending', label: 'Party Name' },
    ];
    
    return (
        <div style={isMobile ? {...styles.container, backgroundColor: '#ffffff'} : styles.container}>
            <div style={isMobile ? styles.headerCardMobile : styles.headerCard}>
                <div style={{...styles.headerTop, ...(isMobile && {justifyContent: 'flex-end', padding: 0})}}>
                     {!isMobile && <h2 style={styles.pageTitle}>Pending Orders</h2>}
                    <div style={styles.headerControls}>
                        <button onClick={() => setIsFilterVisible(v => !v)} style={isFilterVisible ? {...styles.toggleButton, ...styles.toggleButtonActive} : (isMobile ? styles.mobileFilterButton : styles.toggleButton)}>
                            <FilterIcon />
                        </button>
                        <div style={isMobile ? styles.mobileViewToggle : styles.viewToggle}>
                            <button 
                                onClick={() => setView('summarized')} 
                                style={view === 'summarized' ? styles.mobileSegmentActive : styles.mobileSegmentInactive}
                                aria-label="Summarized View"
                            >
                                <SummarizedViewIcon />
                            </button>
                            <button 
                                onClick={() => setView('detailed')} 
                                style={view === 'detailed' ? styles.mobileSegmentActive : styles.mobileSegmentInactive}
                                aria-label="Detailed View"
                            >
                                <DetailedViewIcon />
                            </button>
                        </div>
                    </div>
                </div>
                <div style={isFilterVisible ? styles.filtersVisible : styles.filtersCollapsed}>
                    <div style={styles.searchContainer}>
                        <SearchIcon />
                        <input type="text" style={styles.searchInput} className="global-search-input" placeholder="Search by party or order number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    
                    {/* Tag Filters */}
                    {availableTags.length > 0 && (
                         <div style={styles.tagFilterContainer}>
                            <span style={{fontWeight: 500, color: 'var(--text-color)', fontSize: '0.9rem'}}>Filter by Tag:</span>
                            <div style={styles.tagScrollContainer}>
                                <button 
                                    onClick={() => setActiveTagFilter(null)} 
                                    style={!activeTagFilter ? {...styles.tagFilterButton, backgroundColor: 'var(--dark-grey)', color: 'white', borderColor: 'var(--dark-grey)'} : styles.tagFilterButton}
                                >All</button>
                                {availableTags.map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)} 
                                        style={{
                                            ...styles.tagFilterButton, 
                                            ...(tag === activeTagFilter ? { backgroundColor: getTagStyle(tag).backgroundColor, borderColor: getTagStyle(tag).borderColor, fontWeight: 700 } : {})
                                        }}
                                    >{tag}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={styles.filterContainer}>
                        <span style={{fontWeight: 500, color: 'var(--text-color)', fontSize: '0.9rem'}}>Sort by:</span>
                        {sortOptions.map(opt => (
                            <button 
                              key={opt.label} 
                              onClick={() => setSortConfig({key: opt.key, direction: opt.direction})} 
                              style={sortConfig.key === opt.key && sortConfig.direction === opt.direction ? styles.filterButtonActive : (isMobile ? {...styles.filterButton, background: 'transparent', border: '1px solid var(--skeleton-bg)'} : styles.filterButton)}
                            >{opt.label}</button>
                        ))}
                    </div>
                </div>
            </div>
            {selectedOrders.length > 0 && (
                <div style={styles.batchActionToolbar}>
                     <span>{selectedOrders.length} orders selected</span>
                     <div style={styles.footerActions}>
                        <button onClick={() => handleBatchDelete()} style={{...styles.secondaryButton, color: '#e74c3c', borderColor: '#e74c3c'}}><TrashIcon/> Delete</button>
                        <button onClick={() => handlePrintPickingList(orders.filter(o => selectedOrders.includes(o.orderNumber)))} style={styles.secondaryButton}><PrintIcon/> Print List</button>
                        <button onClick={handleBatchProcess} style={styles.modalActionButton}>Process Selected</button>
                     </div>
                </div>
            )}
            {isMobile ? renderMobileLayout() : renderDesktopLayout()}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, position: 'relative', backgroundColor: '#ffffff' },
    headerCard: { backgroundColor: '#f8f9fa', padding: '1rem 1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 10 },
    headerCardMobile: { backgroundColor: '#ffffff', padding: '0 1rem 0.25rem', gap: '0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, zIndex: 10, borderBottom: 'none' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pageTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    headerControls: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
    viewToggle: { display: 'flex', backgroundColor: 'var(--light-grey)', borderRadius: '8px', padding: '4px' },
    toggleButton: { background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '6px' },
    toggleButtonActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--brand-color)', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    
    // Mobile Toggle Styles
    mobileFilterButton: { background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-color)' },
    mobileViewToggle: { display: 'flex', backgroundColor: '#f0f3f5', borderRadius: '20px', padding: '3px', marginLeft: '0.5rem', gap: '2px' },
    mobileSegmentInactive: { background: 'transparent', border: 'none', padding: '6px 16px', cursor: 'pointer', color: '#94a3b8', borderRadius: '18px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    mobileSegmentActive: { background: '#ffffff', border: 'none', padding: '6px 16px', cursor: 'pointer', color: '#1e293b', borderRadius: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    filtersCollapsed: { maxHeight: 0, opacity: 0, overflow: 'hidden', transition: 'max-height 0.4s ease-out, opacity 0.4s ease-out, margin-top 0.4s ease-out', marginTop: 0 },
    filtersVisible: { maxHeight: '300px', opacity: 1, overflow: 'visible', transition: 'max-height 0.4s ease-in, opacity 0.4s ease-in, margin-top 0.4s ease-in', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    searchContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--light-grey)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    filterContainer: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
    filterButton: { background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--text-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem' },
    filterButtonActive: { background: 'var(--active-bg)', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    tagFilterContainer: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    tagScrollContainer: { display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' },
    tagFilterButton: { background: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', padding: '0.3rem 0.8rem', borderRadius: '14px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0rem', padding: '0 0 1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    card: { backgroundColor: '#f8f9fa', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', overflow: 'hidden' },
    cardHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    mobileCardHeader: { width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    mobilePartyHeaderContent: { display: 'flex', alignItems: 'center', width: '100%', gap: '1rem' },
    partyAvatar: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1.1rem', flexShrink: 0 },
    mobilePartyInfo: { display: 'flex', flexDirection: 'column', flex: 1, gap: '2px' },
    mobilePartyName: { fontWeight: '600', fontSize: '1rem', color: 'var(--dark-grey)' },
    mobilePartyMeta: { fontSize: '0.8rem', color: 'var(--text-color)' },
    mobileChevron: { color: 'var(--text-color)' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    cardDetails: { padding: '0 0 1rem', display: 'flex', flexDirection: 'column' },
    
    // Animation Wrappers
    groupContentCollapsed: { maxHeight: 0, opacity: 0, overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' },
    groupContentExpanded: { maxHeight: '2000px', opacity: 1, overflow: 'visible', transition: 'all 0.6s ease-in-out' },

    orderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderTop: '1px solid var(--skeleton-bg)' },
    orderItemActive: { backgroundColor: 'var(--active-bg)'},
    orderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--dark-grey)', flex: 1, minWidth: 0 },
    orderMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', fontSize: '0.85rem' },
    detailsButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eef2f7', border: '1px solid var(--skeleton-bg)', color: 'var(--brand-color)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
    badge: { backgroundColor: '#eef2f7', color: 'var(--brand-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
    checkboxButton: { background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: 'var(--text-color)' },
    expandedViewContainer: { padding: '0.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--brand-color)', backgroundColor: '#ffffff' },
    tableContainer: { overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f8f9fa', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid var(--skeleton-bg)' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'center' },
    qtyInput: { width: '70px', padding: '8px', textAlign: 'center', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', fontSize: '0.9rem' },
    tdInput: { padding: '4px' },
    noteBox: { backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.9rem', marginTop: '1rem' },
    modalFooter: { padding: '1.5rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
    footerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
    deleteButton: { padding: '0.75rem', background: '#fbe2e2', border: '1px solid #e74c3c', color: '#c0392b', borderRadius: '8px', cursor: 'pointer' },
    secondaryButton: { padding: '0.7rem 1.2rem', background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 },
    modalActionButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '180px' },
    batchActionToolbar: { backgroundColor: 'var(--dark-grey)', color: 'white', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0, zIndex: 10, borderRadius: 'var(--border-radius) var(--border-radius) 0 0' },
    stockIndicator: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
    stockIndicatorPlaceholder: { width: '10px', height: '10px' },
    mobileItemContainer: { display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem' },
    mobileItemCard: { backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid var(--skeleton-bg)', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
    mobileItemInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    mobileItemName: { fontWeight: 500, color: 'var(--dark-grey)' },
    mobileItemStock: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dark-grey)' },
    mobileItemQty: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' },
    mobileQtyLabel: { fontSize: '0.8rem', color: 'var(--text-color)' },
    // --- Swipeable styles ---
    swipeableContainer: { position: 'relative', overflow: 'hidden', width: '100%', borderRadius: '10px' },
    swipeableLeftActions: { position: 'absolute', top: 0, left: 0, height: '100%', display: 'flex', alignItems: 'stretch' },
    swipeableRightActions: { position: 'absolute', top: 0, right: 0, height: '100%', display: 'flex', alignItems: 'stretch' },
    swipeAction: { width: '80px', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '0.25rem', fontSize: '0.7rem', transition: 'background-color 0.2s ease' },
    swipeableContent: { position: 'relative', backgroundColor: '#f8f9fa', zIndex: 1 },
    // --- New Detailed Card Styles ---
    detailedOrderCard: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '1rem', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' },
    detailedOrderCardActive: { backgroundColor: '#ffffff', borderRadius: '10px', padding: '1rem', border: '1px solid var(--brand-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: '0 4px 12px rgba(71, 84, 104, 0.1)' },
    
    // Refined Hierarchy Styles
    cardTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' },
    cardPartyName: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark-grey)', margin: 0, lineHeight: 1.2 },
    cardMetaRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-color)', marginBottom: '0.5rem' },
    cardOrderNumber: { fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-color)', backgroundColor: '#edf2f7', padding: '1px 4px', borderRadius: '4px' },
    cardSeparator: { color: '#cbd5e0' },
    cardTime: {},
    cardFooterRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--skeleton-bg)' },
    metricGroup: { display: 'flex', gap: '1rem' },
    iconMetric: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-grey)' },
    statusIconGroup: { display: 'flex', gap: '0.75rem' },

    stylePreview: { fontSize: '0.85rem', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', },
    
    // --- History Section ---
    historySection: { marginTop: '1.5rem', borderTop: '1px solid var(--skeleton-bg)', paddingTop: '1rem' },
    historyHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    historyContent: { padding: '1rem 0 0', display: 'flex', flexDirection: 'column', gap: '1rem' },
    historyList: { maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', padding: '0.75rem', backgroundColor: '#ffffff' },
    historyItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    historyMeta: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-color)' },
    historyEventType: { fontWeight: 600, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' },
    historyDetails: { fontSize: '0.9rem', color: 'var(--dark-grey)', paddingLeft: '0.25rem' },
    addNoteContainer: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    noteTextarea: { width: '100%', minHeight: '60px', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', resize: 'vertical' },
    addNoteButton: { alignSelf: 'flex-end', padding: '0.5rem 1rem', background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 },
    // --- Command Center Styles ---
    commandCenterLayout: { display: 'grid', gridTemplateColumns: '280px 1fr 1.5fr', gap: '1rem', flex: 1, minHeight: 0 },
    leftPanel: { display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', minHeight: 0 },
    middlePanel: { display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', minHeight: 0 },
    rightPanel: { display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', minHeight: 0, overflowY: 'auto' },
    panelHeader: { padding: '1rem', borderBottom: '1px solid var(--skeleton-bg)', fontWeight: 600, color: 'var(--dark-grey)', flexShrink: 0 },
    panelContent: { padding: '0.5rem', overflowY: 'auto', flex: 1 },
    partyListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' },
    partyListItemActive: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'var(--active-bg)', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--brand-color)' },
    partyNameText: { fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    partyCountBadge: { backgroundColor: 'var(--light-grey)', color: 'var(--text-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
    rightPanelPlaceholder: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-color)', textAlign: 'center', padding: '2rem' },
    // --- Tag Styles ---
    tagsSection: { marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#fff', border: '1px solid var(--skeleton-bg)', borderRadius: '8px' },
    tagsHeader: { marginBottom: '0.5rem' },
    tagsList: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' },
    tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' },
    removeTagButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0', marginLeft: '4px', display: 'flex', alignItems: 'center' },
    addTagContainer: { display: 'flex', alignItems: 'center' },
    tagSelect: { padding: '2px 6px', borderRadius: '12px', border: '1px solid var(--skeleton-bg)', fontSize: '0.75rem', color: 'var(--text-color)', backgroundColor: 'var(--light-grey)', outline: 'none', cursor: 'pointer' },
    miniTagDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
};
