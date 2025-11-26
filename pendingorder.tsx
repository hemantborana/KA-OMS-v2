import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { ExportMatching } from './exportmatching';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ChevronIcon = ({ collapsed, style }: { collapsed?: boolean, style?: React.CSSProperties }) => <svg style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s ease', ...style }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid white', borderRight: '3px solid transparent' }}></div>;
const SummarizedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const DetailedViewIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const ProcessIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const NoteIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"></path><polyline points="14 3 14 9 20 9"></polyline></svg>;
const BoxIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const CheckSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const SquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const AlertCircleIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const ShareIcon = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;


// --- TYPE & FIREBASE ---
interface HistoryEvent { timestamp: string; event: string; details: string; }
interface OrderItem { id: string; quantity: number; price: number; fullItemData: Record<string, any>; }
interface Order { orderNumber: string; partyName: string; timestamp: string; totalQuantity: number; totalValue: number; orderNote?: string; items: OrderItem[]; history?: HistoryEvent[]; tags?: string[]; lastExported?: string; }
interface SummarizedData { [partyName: string]: { orderCount: number; orders: Order[]; } }
interface Parties { [partyName: string]: number; }
interface StockItem { id: number; style: string; color: string; size: string; stock: number; }

const PENDING_ORDERS_REF = 'Pending_Order_V2';
const BILLING_ORDERS_REF = 'Ready_For_Billing_V2';
const DELETED_ORDERS_REF = 'Deleted_Orders_V2';
const EXPIRED_ORDERS_REF = 'Expired_Orders_V2';
const CUSTOM_TAGS_REF = 'Custom_Tags_V2';
const STOCK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyY4ys2VzcsmslZj-vYieV1l-RRTp90eDMwcdANFZ3qecf8VRPgz-dNo46jqIqencqF/exec';


// --- HELPERS ---
const colorPalette = [
    { bg: 'rgba(255, 56, 60, 0.1)', text: 'var(--red)' }, // red
    { bg: 'rgba(255, 149, 0, 0.1)', text: 'var(--orange)' }, // orange
    { bg: 'rgba(52, 199, 89, 0.1)', text: 'var(--green)' }, // green
    { bg: 'rgba(0, 195, 208, 0.1)', text: 'var(--teal)' }, // teal
    { bg: 'rgba(0, 122, 255, 0.1)', text: 'var(--blue)' }, // blue
    { bg: 'rgba(88, 86, 214, 0.1)', text: 'var(--indigo)' }, // indigo
    { bg: 'rgba(175, 82, 222, 0.1)', text: 'var(--purple)' }, // purple
];

const getColorForString = (str: string) => {
    if (!str) return colorPalette[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colorPalette.length);
    return colorPalette[index];
};

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

const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'N/A';


const normalizeKeyPart = (part: any): string => {
    if (!part) return '';
    return String(part).toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
};

const getTagStyle = (tag: string) => {
    const lower = tag.toLowerCase();
    let colors = { bg: 'var(--gray-6)', text: 'var(--dark-grey)', border: 'var(--gray-4)' };
    
    if (lower.includes('hold')) colors = { bg: 'rgba(255, 56, 60, 0.1)', text: 'var(--red)', border: 'rgba(255, 56, 60, 0.3)' };
    else if (lower.includes('stock') || lower.includes('wait')) colors = { bg: 'rgba(255, 204, 0, 0.1)', text: 'var(--orange)', border: 'rgba(255, 204, 0, 0.3)' };
    else if (lower.includes('confirm')) colors = { bg: 'rgba(97, 85, 245, 0.1)', text: 'var(--indigo)', border: 'rgba(97, 85, 245, 0.3)' };
    else if (lower.includes('urgent')) colors = { bg: 'rgba(255, 45, 85, 0.1)', text: 'var(--pink)', border: 'rgba(255, 45, 85, 0.3)' };
    else if (lower.includes('partial')) colors = { bg: 'rgba(52, 199, 89, 0.1)', text: 'var(--green)', border: 'rgba(52, 199, 89, 0.3)' };

    return {
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
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
    clearAndAddStock: async function(items: StockItem[]) {
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
    getAllStock: async function(): Promise<StockItem[]> {
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
    setMetadata: async function(metadata: any) {
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
        color = 'var(--red)';
        if (isUnavailable) title = 'Stock: Unavailable';
    } else if (stockLevel >= 1 && stockLevel <= 3) {
        color = 'var(--yellow)';
    } else if (stockLevel >= 4) {
        color = 'var(--green)';
    }
    if (!color) return <div style={styles.stockIndicatorPlaceholder}></div>;
    return <span style={{ ...styles.stockIndicator, backgroundColor: color }} title={title} />;
};

const Swipeable: React.FC<{ 
    onProcess: () => void; 
    onDelete: () => void; 
    onEdit: () => void; 
    onTap?: () => void;
    disabled?: boolean;
    children: React.ReactNode; 
}> = ({ onProcess, onDelete, onEdit, onTap, disabled, children }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);
    const animationFrameId = useRef(null);
    const openState = useRef<'closed' | 'left' | 'right'>('closed');
    const currentTranslate = useRef(0);

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
            if (x !== 0) contentRef.current.classList.add('swiped-open');
            else contentRef.current.classList.remove('swiped-open');
        }
    };
    
    const animateTo = (target: number, state: 'closed' | 'left' | 'right') => {
        if (contentRef.current) {
            contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
            setTranslateX(target);
        }
        openState.current = state;
        currentTranslate.current = target;
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        resetOpenItems();
        startX.current = e.touches[0].clientX;
        currentX.current = startX.current;
        isDragging.current = true;
        
        if (contentRef.current) contentRef.current.style.transition = 'none';
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

        if (openState.current === 'left') currentTranslate.current = 160;
        else if (openState.current === 'right') currentTranslate.current = -80;
        else currentTranslate.current = 0;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || !contentRef.current || disabled) return;
        
        currentX.current = e.touches[0].clientX;
        const diffX = currentX.current - startX.current;
        
        if (Math.abs(diffX) > 10) {
            if (e.cancelable) e.preventDefault();
        }
        
        animationFrameId.current = requestAnimationFrame(() => {
            let newTranslate = 0;
            if (openState.current === 'closed') {
                newTranslate = Math.max(-80, Math.min(160, diffX));
            } else if (openState.current === 'left') {
                newTranslate = Math.max(0, Math.min(170, 160 + diffX));
            } else if (openState.current === 'right') {
                newTranslate = Math.max(-90, Math.min(0, -80 + diffX));
            }
            currentTranslate.current = newTranslate;
            setTranslateX(newTranslate);
        });
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        
        if (Math.abs(currentX.current - startX.current) < 10 && onTap) {
            onTap();
            return;
        }

        if (disabled || !contentRef.current) {
             animateTo(0, 'closed');
             return;
        }

        const x = currentTranslate.current;
        if (openState.current === 'closed') {
            if (x > 60) animateTo(160, 'left');
            else if (x < -40) animateTo(-80, 'right');
            else animateTo(0, 'closed');
        } else if (openState.current === 'left') {
            if (x < 120) animateTo(0, 'closed');
            else animateTo(160, 'left');
        } else if (openState.current === 'right') {
            if (x > -40) animateTo(0, 'closed');
            else animateTo(-80, 'right');
        }
    };

    return (
        <div style={styles.swipeableContainer}>
            {!disabled && (
                <>
                    <div style={styles.swipeableLeftActions}>
                        <button onClick={onEdit} style={{...styles.swipeAction, backgroundColor: 'var(--blue)'}}><EditIcon /></button>
                        <button onClick={onDelete} style={{...styles.swipeAction, backgroundColor: 'var(--red)'}}><TrashIcon /></button>
                    </div>
                    <div style={styles.swipeableRightActions}>
                        <button onClick={onProcess} style={{...styles.swipeAction, backgroundColor: 'var(--green)'}}><ProcessIcon /></button>
                    </div>
                </>
            )}
            <div 
                ref={contentRef} 
                className="swipeable-content" 
                onTouchStart={handleTouchStart} 
                onTouchMove={handleTouchMove} 
                onTouchEnd={handleTouchEnd} 
                onTouchCancel={handleTouchEnd} 
                style={{
                    ...styles.swipeableContent, 
                    touchAction: 'pan-y', 
                    userSelect: 'none', 
                    WebkitUserSelect: 'none', 
                    WebkitTapHighlightColor: 'transparent'
                }}
            >
                {children}
            </div>
        </div>
    );
};

const CustomTagDropdown: React.FC<{
    onAddTag: (order: Order, tag: string) => void;
    onOpenCustomTagModal: (order: Order) => void;
    order: Order;
    globalTags: string[];
}> = ({ onAddTag, onOpenCustomTagModal, order, globalTags }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const predefinedOptions = [
        "On Hold", "Awaiting Stock", "Customer Confirmation Needed",
        "Urgent", "Partial Shipment"
    ];

    const options = useMemo(() => {
        const combined = new Set([...predefinedOptions, ...globalTags]);
        return [...Array.from(combined).sort(), "Create Custom..."];
    }, [globalTags]);

    useLayoutEffect(() => {
        if (isOpen && buttonRef.current && menuRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const menuRect = menuRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            
            let top;
            let transformOrigin = 'top center';

            // Check if there's enough space below, otherwise position above
            if (spaceBelow < menuRect.height && buttonRect.top > menuRect.height) {
                top = buttonRect.top - menuRect.height - 4; // Position above button with a small gap
                transformOrigin = 'bottom center';
            } else {
                top = buttonRect.bottom + 4; // Position below button with a small gap
            }
            
            setMenuStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${buttonRect.left}px`,
                minWidth: `${buttonRect.width}px`,
                transformOrigin: transformOrigin,
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
                menuRef.current && !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleSelect = (option: string) => {
        if (option === 'Create Custom...') {
            onOpenCustomTagModal(order);
        } else if (option) {
            onAddTag(order, option);
        }
        setIsOpen(false);
    };

    const renderMenu = () => {
        return createPortal(
            <div
                ref={menuRef}
                style={{
                    ...styles.customDropdownMenu,
                    ...menuStyle,
                    zIndex: 9000,
                    // Hide until position is calculated to prevent flicker
                    visibility: Object.keys(menuStyle).length === 0 ? 'hidden' : 'visible',
                }}
            >
                {options.map(option => (
                    <button key={option} className="custom-dropdown-item" style={styles.customDropdownItem} onClick={() => handleSelect(option)}>
                        {option}
                    </button>
                ))}
            </div>,
            document.body
        );
    };

    return (
        <div style={styles.customDropdownContainer}>
            <button ref={buttonRef} style={styles.customDropdownButton} onClick={() => setIsOpen(prev => !prev)}>
                + Add Tag
                <ChevronIcon collapsed={!isOpen} style={{width: 12, height: 12, marginLeft: 4}} />
            </button>
            {isOpen && renderMenu()}
        </div>
    );
};


// --- COMPONENTS ---
const ProcessQuantityControl: React.FC<{
    value: string | number;
    max: number;
    onUpdate: (value: string) => void;
    size?: 'small' | 'default';
}> = ({ value, max, onUpdate, size = 'default' }) => {
    const currentValue = Number(value) || 0;

    const handleStep = (step: number) => {
        const newValue = Math.max(0, Math.min(max, currentValue + step));
        onUpdate(String(newValue));
    };
    
    const s = useMemo(() => {
        const base = {
            button: styles.processQtyButton,
            input: styles.processQtyInput,
            container: styles.processQtyContainer,
        };
        if (size === 'small') {
            base.button = { ...base.button, width: '30px', height: '30px', fontSize: '1rem' };
            base.input = { ...base.input, width: '40px', height: '30px', fontSize: '0.9rem' };
        } else {
            base.button = { ...base.button, width: '32px', height: '32px', fontSize: '1.2rem' };
            base.input = { ...base.input, width: '50px', height: '32px' };
        }
        return base;
    }, [size]);

    return (
        <div style={s.container}>
            <button onClick={() => handleStep(-1)} style={{ ...s.button, borderRadius: '6px 0 0 6px' }} aria-label="Decrease quantity">-</button>
            <input 
                type="number" 
                value={value} 
                onChange={(e) => onUpdate(e.target.value)} 
                style={s.input} 
                max={max}
                min="0"
                placeholder="0"
            />
            <button onClick={() => handleStep(1)} style={{ ...s.button, borderRadius: '0 6px 6px 0' }} aria-label="Increase quantity">+</button>
        </div>
    );
};

const ExpandedPendingView: React.FC<{ order: Order, onProcess, onDelete, isProcessing, processingQty, onQtyChange, stockData: Record<string, number>, isMobile, onAddTag, onRemoveTag, onOpenCustomTagModal, onOpenNoteModal, globalTags }> = ({ order, onProcess, onDelete, isProcessing, processingQty, onQtyChange, stockData, isMobile, onAddTag, onRemoveTag, onOpenCustomTagModal, onOpenNoteModal, globalTags }) => {
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
    const isProcessable = useMemo(() => Object.values(processingQty).some(qty => Number(qty) > 0), [processingQty]);

    const handleProcessClick = () => {
        const totalToProcess = Object.values(processingQty).reduce((sum: number, qty: number) => sum + qty, 0);
        if (totalToProcess === 0) {
            showToast("Cannot process with zero quantity.", 'error');
            return;
        }
        onProcess(order, processingQty);
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
                    <th style={{...styles.th, textAlign: 'center'}}>To Process</th>
                </tr></thead>
                <tbody>
                    {order.items.map((item, index) => {
                        const stockKey = `${normalizeKeyPart(item.fullItemData.Style)}-${normalizeKeyPart(item.fullItemData.Color)}-${normalizeKeyPart(item.fullItemData.Size)}`;
                        const qtyToProcess = processingQty[item.id] || 0;
                        const isPartial = qtyToProcess > 0 && qtyToProcess < item.quantity;
                        const stockLevel = stockData[stockKey] ?? 0;
                        
                        let rowStyle = {...styles.tr};
                        if (index % 2 !== 0) rowStyle.backgroundColor = 'var(--light-grey)';
                        if (isPartial) {
                            rowStyle.backgroundColor = 'var(--active-bg)';
                        }

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
                                    <ProcessQuantityControl
                                        value={processingQty[item.id] || ''}
                                        max={item.quantity}
                                        onUpdate={(newValue) => onQtyChange(item.id, newValue, item.quantity)}
                                    />
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
                            <div style={styles.mobileQtyLabel}>Ord: {item.quantity}</div>
                             <ProcessQuantityControl
                                value={processingQty[item.id] || ''}
                                max={item.quantity}
                                onUpdate={(newValue) => onQtyChange(item.id, newValue, item.quantity)}
                                size="small"
                             />
                        </div>
                    </div>
                )
            })}
        </div>
    );

    const viewStyle = isMobile 
        ? { ...styles.expandedViewContainer, borderTop: 'none', padding: '0.5rem 0.5rem 1rem' }
        : styles.expandedViewContainer;
    
    return (
        <div style={viewStyle}>
            {isMobile ? renderMobileCards() : renderDesktopTable()}
            
            {/* Tags Section */}
            <div style={isMobile ? {...styles.tagsSection, backgroundColor: 'transparent', border: 'none', padding: '0.5rem 0'} : styles.tagsSection}>
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
                     <CustomTagDropdown onAddTag={onAddTag} onOpenCustomTagModal={onOpenCustomTagModal} order={order} globalTags={globalTags} />
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
                <div style={isHistoryCollapsed ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                     <div style={styles.collapsibleContentWrapper}>
                        <div style={styles.notesAndHistoryContainer}>
                            <div style={styles.historyList}>
                                {(order.history || []).map((event, index) => (
                                    <div key={index} style={styles.historyItem}>
                                        <div style={styles.historyMeta}>
                                            <span style={{...styles.historyEventType, backgroundColor: event.event === 'System' ? 'var(--light-grey)' : 'var(--active-bg)', color: event.event === 'System' ? 'var(--text-color)' : 'var(--orange)'}}>{event.event}</span>
                                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p style={styles.historyDetails}>{event.details}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={styles.addNoteContainer}>
                                <button onClick={() => onOpenNoteModal(order)} style={styles.addNoteButton}>
                                    <PlusIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.modalFooter}>
                <div style={styles.footerActions}>
                     <button style={{...styles.downloadButton, ...(isProcessing && {opacity: 0.6, cursor: 'not-allowed'})}} disabled={isProcessing} title="Download Picking List">
                        <DownloadIcon />
                    </button>
                    <button onClick={() => onDelete(order)} style={{...styles.deleteButton, ...(isProcessing && {opacity: 0.6, cursor: 'not-allowed'})}} disabled={isProcessing} title="Delete">
                       <TrashIcon />
                    </button>
                    <button onClick={handleProcessClick} style={{...styles.processButton, ...((isProcessing || !isProcessable) && styles.processButtonDisabled)}} disabled={isProcessing || !isProcessable}>
                        {isProcessing ? <SmallSpinner /> : <><ProcessIcon/> Process</>}
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
    isSelectionMode: boolean;
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
    isSelectionMode,
    onToggleExpand,
    onSelectOrder,
    onProcessOrder,
    onDeleteOrder,
    onEditOrder
}) => {
    const isOverdue = new Date().getTime() - new Date(order.timestamp).getTime() > 25 * 24 * 60 * 60 * 1000;

    const uniqueStyleColorPairs = useMemo(() => {
        if (!order.items) return [];
        const pairs = new Set<string>();
        order.items.forEach(item => {
            if (item.fullItemData) {
                const style = item.fullItemData.Style;
                const color = item.fullItemData.Color;
                if (style && color) {
                    pairs.add(`${style}-${color}`);
                }
            }
        });
        return Array.from(pairs).sort();
    }, [order.items]);

    const getCardStyle = () => {
        let baseStyle = isExpanded ? styles.detailedOrderCardActive : styles.detailedOrderCard;
        
        if (isSelected) {
            // Selection styling (mobile primarily)
            baseStyle = {
                ...baseStyle,
                backgroundColor: 'var(--active-bg)',
                borderColor: 'var(--brand-color)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            };
        }
        
        return baseStyle;
    };

    const handleCardClick = (e) => {
        onToggleExpand(order);
    };

    const orderContent = (
        <div style={getCardStyle()} onClick={handleCardClick} onContextMenu={(e) => e.preventDefault()}>
            {/* Top Row: Party Name & Chevron */}
            <div style={styles.cardTopRow}>
                <h3 style={styles.cardPartyName}>
                    <span style={styles.cardTotalQuantityBadge}>{order.totalQuantity}</span>
                    {order.partyName}
                </h3>
                <div style={styles.checkboxContainer}>
                    <button style={styles.checkboxButton} onClick={(e) => { e.stopPropagation(); onSelectOrder(order.orderNumber); }}>
                        {isSelected ? <CheckSquareIcon /> : <SquareIcon />}
                    </button>
                    <ChevronIcon collapsed={!isExpanded} style={{width: '16px', height: '16px', color: 'var(--text-color)'}} />
                </div>
            </div>

            {/* Second Row: Style Preview Left | Order No & Time Right */}
             <div style={styles.cardSecondRow}>
                 <div style={styles.stylePreviewInline}>
                    {uniqueStyleColorPairs.map((pair) => (
                        <span key={pair} className="style-chip">{pair}</span>
                    ))}
                 </div>
                 <div style={styles.cardMetaRight}>
                     <span style={styles.cardOrderNumber}>#{order.orderNumber}</span>
                     <span style={styles.cardTime}>{timeSince(order.timestamp)}</span>
                 </div>
            </div>
            
            {/* Tags */}
             {order.tags && order.tags.length > 0 && (
                <div style={styles.tagsContainer}>
                    {order.tags.map(tag => <span key={tag} style={getTagStyle(tag)}>{tag}</span>)}
                </div>
            )}

            {/* Footer: Icons/Metrics */}
            <div style={styles.cardFooterRow}>
                {/* Status Icons Grouped at the end */}
                <div style={styles.statusIconGroup}>
                    {order.lastExported && <ShareIcon style={{color: 'var(--green)'}} title={`Exported on ${formatDateTime(order.lastExported)}`} />}
                    {order.orderNote && <NoteIcon style={{color: 'var(--orange)', fill: 'var(--orange)', fillOpacity: 0.2}} title="Has Note" />}
                    {order.totalQuantity > 50 && <BoxIcon style={{color: 'var(--blue)', fill: 'var(--blue)', fillOpacity: 0.2}} title="High Volume" />}
                    {isOverdue && <AlertCircleIcon style={{color: 'var(--red)', fill: 'var(--red)', fillOpacity: 0.2}} title="Overdue" />}
                </div>
            </div>
        </div>
    );

    return isMobile ? (
        <Swipeable 
            onProcess={() => onProcessOrder(order)} 
            onDelete={() => onDeleteOrder(order)} 
            onEdit={() => onEditOrder(order)}
            disabled={isSelectionMode}
        >
            {orderContent}
        </Swipeable>
    ) : (
        orderContent
    );
};

const DetailedList: React.FC<{ orders: Order[]; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; children: React.ReactNode; onProcessOrder: (order: Order) => void; onDeleteOrder: (order: Order) => void; onEditOrder: (order: Order) => void; isMobile: boolean; selectedOrders: string[]; onSelectOrder: (orderNumber: string) => void; isSelectionMode: boolean; }> = ({ orders, onToggleExpand, expandedOrderNumber, children, onProcessOrder, onDeleteOrder, onEditOrder, isMobile, selectedOrders, onSelectOrder, isSelectionMode }) => {
    // FIX: Explicitly cast 'column' to satisfy the CSSProperties type for flexDirection.
    const listStyle = isMobile 
        ? {...styles.card, padding: 0, backgroundColor: 'transparent', border: 'none', overflow: 'visible', display: 'flex', flexDirection: 'column' as 'column', gap: '0.75rem'} 
        : {...styles.card, padding: 0};
        
    return (
        <div style={listStyle}>
            {orders.map(order => (
                 <React.Fragment key={order.orderNumber}>
                    <DetailedOrderCard
                        order={order}
                        isExpanded={expandedOrderNumber === order.orderNumber}
                        isMobile={isMobile}
                        isSelected={selectedOrders.includes(order.orderNumber)}
                        isSelectionMode={isSelectionMode}
                        onToggleExpand={onToggleExpand}
                        onSelectOrder={onSelectOrder}
                        onProcessOrder={onProcessOrder}
                        onDeleteOrder={onDeleteOrder}
                        onEditOrder={onEditOrder}
                    />
                     {/* Animated Expansion Wrapper */}
                    <div style={expandedOrderNumber === order.orderNumber ? {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded} : styles.collapsibleContainer}>
                        <div style={styles.collapsibleContentWrapper}>
                            {expandedOrderNumber === order.orderNumber && children}
                        </div>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}

const PartyGroup: React.FC<{ partyName: string; data: { orderCount: number; orders: Order[] }; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; children: React.ReactNode; onProcessOrder: (order: Order) => void; onDeleteOrder: (order: Order) => void; onEditOrder: (order: Order) => void; isMobile: boolean; selectedOrders: string[]; onSelectOrder: (orderNumber: string) => void; isSelectionMode: boolean; isCollapsed: boolean; onToggleCollapse: () => void; }> = ({ partyName, data, onToggleExpand, expandedOrderNumber, children, onProcessOrder, onDeleteOrder, onEditOrder, isMobile, selectedOrders, onSelectOrder, isSelectionMode, isCollapsed, onToggleCollapse }) => {
    const totalQty = data.orders.reduce((sum, order) => sum + order.totalQuantity, 0);
    const firstLetter = partyName.charAt(0).toUpperCase();

    const uniqueStyleColorPairs = useMemo(() => {
        if (!data || !data.orders) return [];
        const pairs = new Set<string>();
        data.orders.forEach(order => {
            order.items.forEach(item => {
                if (item.fullItemData) {
                    const style = item.fullItemData.Style;
                    const color = item.fullItemData.Color;
                    if (style && color) {
                        pairs.add(`${style}-${color}`);
                    }
                }
            });
        });
        return Array.from(pairs).sort();
    }, [data]);

    const headerButtonStyle: React.CSSProperties = {
        ...styles.cardHeader,
        borderBottom: isCollapsed ? 'none' : '1px solid var(--separator-color)',
    };
    
    const avatarColorStyle = useMemo(() => {
        const colors = getColorForString(partyName);
        return {
            backgroundColor: colors.bg,
            color: colors.text
        };
    }, [partyName]);

    const renderHeader = () => {
        if (isMobile) {
            return (
                <div style={styles.mobilePartyHeaderContent}>
                    <div style={{...styles.partyAvatar, ...avatarColorStyle}}>{firstLetter}</div>
                    <div style={styles.mobilePartyInfo}>
                        <div style={styles.mobilePartyName}>{partyName}</div>
                        <div style={styles.mobilePartyMeta}>
                            {data.orderCount} Orders • {totalQty} Qty
                        </div>
                        {isCollapsed && uniqueStyleColorPairs.length > 0 && (
                            <div style={styles.stylePreview}>
                                {uniqueStyleColorPairs.map((pair) => (
                                    <span key={pair} className="style-chip">{pair}</span>
                                ))}
                            </div>
                        )}
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
                 {isCollapsed && uniqueStyleColorPairs.length > 0 && (
                    <div style={styles.stylePreview}>
                        {uniqueStyleColorPairs.map((pair) => (
                            <span key={pair} className="style-chip">{pair}</span>
                        ))}
                    </div>
                )}
                <ChevronIcon collapsed={isCollapsed} />
            </div>
        );
    };

    return (
        <div style={styles.card} className={!isCollapsed ? 'party-group-expanded' : ''}>
            <button style={isMobile ? styles.mobileCardHeader : headerButtonStyle} onClick={onToggleCollapse}>
               {renderHeader()}
            </button>
            
            {/* Smooth expansion container */}
            <div style={isCollapsed ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                <div style={{...styles.collapsibleContentWrapper, opacity: isCollapsed ? 0 : 1 }}>
                     <div style={{...styles.cardDetails}}>
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
                            isSelectionMode={isSelectionMode}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// New Component: CustomTagModal
const CustomTagModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (tagName: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [tagName, setTagName] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setTagName('');
        }, 300);
    };

    const handleSave = () => {
        if (tagName.trim()) {
            onSave(tagName.trim());
            handleClose();
        } else {
            showToast('Tag name cannot be empty.', 'error');
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setTagName('');
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    return (
        <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={handleClose}>
            <div style={{...styles.modalContent, maxWidth: '360px', animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                <h3 style={{...styles.modalTitle, textAlign: 'center', marginBottom: '0.5rem'}}>Create Custom Tag</h3>
                <p style={styles.modalSubtitleText}>This tag will be saved and available for all future orders.</p>
                <input 
                    type="text" 
                    value={tagName} 
                    onChange={(e) => setTagName(e.target.value)}
                    style={styles.modalInput}
                    className="modal-input"
                    placeholder="e.g., Follow up"
                />
                <div style={styles.iosModalActions}>
                    <button onClick={handleClose} style={styles.iosModalButtonSecondary}>Cancel</button>
                    <button onClick={handleSave} style={styles.iosModalButtonPrimary}>Save Tag</button>
                </div>
            </div>
        </div>
    );
};

const AddNoteModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (noteText: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [noteText, setNoteText] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
            setNoteText('');
        }, 300);
    };

    const handleSave = () => {
        if (noteText.trim()) {
            onSave(noteText.trim());
            handleClose();
        } else {
            showToast('Note cannot be empty.', 'error');
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setNoteText('');
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    return (
        <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={handleClose}>
            <div style={{...styles.modalContent, maxWidth: '400px', animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                <h3 style={{...styles.modalTitle, textAlign: 'center', marginBottom: '0.5rem'}}>Add a New Note</h3>
                <p style={styles.modalSubtitleText}>This note will be permanently added to the order's history.</p>
                <textarea 
                    value={noteText} 
                    onChange={(e) => setNoteText(e.target.value)}
                    style={styles.modalTextarea}
                    placeholder="Type your note here..."
                />
                <div style={styles.iosModalActions}>
                    <button onClick={handleClose} style={styles.iosModalButtonSecondary}>Cancel</button>
                    <button onClick={handleSave} style={styles.iosModalButtonPrimary}>Save Note</button>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ state, setState, onConfirm }) => {
    const { isOpen, isClosing, orders, reason, isLoading } = state;

    const handleClose = () => {
        if (isLoading) return;
        setState(prev => ({ ...prev, isClosing: true }));
        setTimeout(() => {
            setState({ isOpen: false, isClosing: false, orders: [], reason: '' });
        }, 300);
    };

    const handleReasonChange = (e) => {
        setState(prev => ({ ...prev, reason: e.target.value }));
    };

    if (!isOpen) return null;

    const isBatch = orders.length > 1;
    const title = "Confirm Deletion";
    const message = isBatch
        ? `Are you sure you want to delete ${orders.length} selected orders? This action cannot be undone.`
        : `Are you sure you want to delete order #${orders[0]?.orderNumber}? This action cannot be undone.`;

    return (
        <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={handleClose}>
            <div style={{...styles.modalContent, maxWidth: '400px', animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                <h3 style={{...styles.modalTitle, textAlign: 'center', marginBottom: '0.5rem'}}>{title}</h3>
                <p style={styles.modalSubtitleText}>{message}</p>
                <textarea 
                    value={reason} 
                    onChange={handleReasonChange}
                    style={styles.modalTextarea}
                    placeholder="Optional: Provide a reason for deletion"
                />
                <div style={styles.iosModalActions}>
                    <button onClick={handleClose} style={styles.iosModalButtonSecondary} disabled={isLoading}>Cancel</button>
                    <button onClick={onConfirm} style={{...styles.iosModalButtonPrimary, color: 'var(--red)'}} disabled={isLoading}>
                        {isLoading ? <SmallSpinner /> : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PendingOrders = ({ onNavigate }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [stockData, setStockData] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('summarized');
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'descending' });
    const [expandedOrderNumber, setExpandedOrderNumber] = useState<string | null>(null);
    const [processingOrder, setProcessingOrder] = useState<string | null>(null);
    const [processingQty, setProcessingQty] = useState<Record<string, number>>({});
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
    
    const [collapsedSummarized, setCollapsedSummarized] = useState<Record<string, boolean>>({});
    const [expandedDetailed, setExpandedDetailed] = useState<string | null>(null);

    // State for Command Center Layout
    const [selectedParty, setSelectedParty] = useState<string | null>(null);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    
    const [isCustomTagModalOpen, setIsCustomTagModalOpen] = useState(false);
    const [orderForCustomTag, setOrderForCustomTag] = useState<Order | null>(null);
    
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [orderForNewNote, setOrderForNewNote] = useState<Order | null>(null);
    
    const [globalTags, setGlobalTags] = useState<string[]>([]);
    const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, isClosing: false, orders: [], reason: '', isLoading: false });

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [ordersToExport, setOrdersToExport] = useState<Order[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    
    const sortPillsRef = useRef(null);
    const pillRefs = useRef({});
    const [markerStyle, setMarkerStyle] = useState({});


    const isSelectionMode = selectedOrders.length > 0;

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

        const tagsRef = firebase.database().ref(CUSTOM_TAGS_REF);
        const tagsListener = tagsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            setGlobalTags(data ? Object.keys(data) : []);
        });

        const partyRef = firebase.database().ref('PartyData');
        const partyListener = partyRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const partyList = Object.values(data).map((p: any) => p.name).filter(Boolean);
            }
        });

        const loadStockData = async () => {
            let localDataLoaded = false;
            try {
                const localStock = await stockDb.getAllStock() as StockItem[];
                if (localStock && localStock.length > 0) {
                    const stockMap = localStock.reduce((acc: Record<string, number>, item: StockItem) => {
                        if (item && item.style && item.color && item.size) {
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
                        
                        const stockMap = result.data.reduce((acc, item: StockItem) => {
                            if (item && item.style && item.color && item.size) {
                                const key = `${normalizeKeyPart(item.style)}-${normalizeKeyPart(item.color)}-${normalizeKeyPart(item.size)}`;
                                acc[key] = item.stock;
                            }
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
            tagsRef.off('value', tagsListener);
            partyRef.off('value', partyListener);
        }
    }, []);

    const sortOptions = [
        { key: 'timestamp', direction: 'descending', label: 'Newest' },
        { key: 'timestamp', direction: 'ascending', label: 'Oldest' },
        { key: 'partyName', direction: 'ascending', label: 'Party Name' },
    ];
    
    useLayoutEffect(() => {
        const activePill = pillRefs.current[`${sortConfig.key}-${sortConfig.direction}`];
        const container = sortPillsRef.current;
    
        if (activePill && container) {
            const containerRect = container.getBoundingClientRect();
            const pillRect = activePill.getBoundingClientRect();
    
            setMarkerStyle({
                left: pillRect.left - containerRect.left,
                width: pillRect.width,
                height: pillRect.height,
                opacity: 1,
            });
        }
    }, [sortConfig, isMobile]);


    useEffect(() => {
        setExpandedDetailed(null);
        setCollapsedSummarized({});
    }, [view]);

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

    const handleOpenCustomTagModal = (order: Order) => {
        setOrderForCustomTag(order);
        setIsCustomTagModalOpen(true);
    };
    
    const handleSaveCustomTag = async (tagName: string) => {
        if (!orderForCustomTag) return;
        if (globalTags.includes(tagName) || ['On Hold', 'Urgent'].includes(tagName)) { // check predefined too
            await handleAddTag(orderForCustomTag, tagName);
        } else {
            try {
                await firebase.database().ref(`${CUSTOM_TAGS_REF}/${tagName}`).set(true);
                await handleAddTag(orderForCustomTag, tagName);
            } catch (e) {
                console.error(e);
                showToast('Failed to save new tag.', 'error');
            }
        }
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

    const handleOpenNoteModal = (order: Order) => {
        setOrderForNewNote(order);
        setIsNoteModalOpen(true);
    };

    const handleSaveNote = async (noteText: string) => {
        if (!orderForNewNote) return;
        
        const newNoteEvent = {
            timestamp: new Date().toISOString(),
            event: 'Note',
            details: noteText.trim()
        };
        const updatedHistory = [...(orderForNewNote.history || []), newNoteEvent];
        
        try {
            await firebase.database().ref(`${PENDING_ORDERS_REF}/${orderForNewNote.orderNumber}/history`).set(updatedHistory);
            showToast('Note added successfully!', 'success');
        } catch (e) {
            console.error('Failed to add note:', e);
            showToast('Failed to add note.', 'error');
        }
        
        setIsNoteModalOpen(false);
        setOrderForNewNote(null);
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
            setExpandedDetailed(null);
            setActiveOrder(null);
        } catch(e) {
            console.error(e);
            showToast('Failed to process order.', 'error');
        } finally {
            setProcessingOrder(null);
        }
    }, []);

    const openDeleteModalForOrder = useCallback((order: Order) => {
        setDeleteModalState({ isOpen: true, isClosing: false, orders: [order], reason: '', isLoading: false });
    }, []);
    
    const handleConfirmDeletion = async () => {
        const { orders: ordersToDelete, reason } = deleteModalState;
        if (ordersToDelete.length === 0) return;

        setDeleteModalState(prev => ({ ...prev, isLoading: true }));

        const updates = {};
        ordersToDelete.forEach(order => {
            const newHistoryEvent = { timestamp: new Date().toISOString(), event: 'System', details: `Order deleted. Reason: ${reason || 'Not specified'}` };
            const updatedHistory = [...(order.history || []), newHistoryEvent];
            const deletedOrderData = { ...order, deletionReason: reason, deletedTimestamp: new Date().toISOString(), history: updatedHistory };
            updates[`${DELETED_ORDERS_REF}/${order.orderNumber}`] = deletedOrderData;
            updates[`${PENDING_ORDERS_REF}/${order.orderNumber}`] = null;
        });

        try {
            await firebase.database().ref().update(updates);
            showToast(`${ordersToDelete.length} order(s) moved to Deleted archive.`, 'success');
            if (expandedDetailed && ordersToDelete.some(o => o.orderNumber === expandedDetailed)) {
                setExpandedDetailed(null);
            }
            if (activeOrder && ordersToDelete.some(o => o.orderNumber === activeOrder.orderNumber)) {
                setActiveOrder(null);
            }
            setSelectedOrders(prev => prev.filter(id => !ordersToDelete.some(o => o.orderNumber === id)));
        } catch (e) {
            console.error(e);
            showToast('Failed to delete order(s).', 'error');
        } finally {
            setDeleteModalState(prev => ({ ...prev, isClosing: true, isLoading: false }));
            setTimeout(() => {
                setDeleteModalState({ isOpen: false, isClosing: false, orders: [], reason: '', isLoading: false });
            }, 300);
        }
    };

    const handleBatchDelete = () => {
        if (selectedOrders.length === 0) { 
            showToast('No orders selected.', 'error'); 
            return; 
        }
        const ordersToDelete = orders.filter(o => selectedOrders.includes(o.orderNumber));
        setDeleteModalState({ isOpen: true, isClosing: false, orders: ordersToDelete, reason: 'Batch deletion.', isLoading: false });
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
        
        if (isMobile) {
            if (expandedDetailed === orderNumber) {
                setExpandedDetailed(null);
            } else {
                setProcessingQty(order.items.reduce((acc, item) => ({...acc, [item.id]: 0}), {}));
                setExpandedDetailed(orderNumber);
            }
        } else {
            // Desktop behavior (Command Center)
            handleSelectOrder(order);
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
            const updates = {};
            selectedOrders.forEach(orderNum => {
                const order = orders.find(o => o.orderNumber === orderNum);
                if (order) {
                    const newHistoryEvent = { timestamp: new Date().toISOString(), event: 'System', details: `Batch Processed.`};
                    const updatedHistory = [...(order.history || []), newHistoryEvent];
                    
                    const billingOrderRefPath = `${BILLING_ORDERS_REF}/${order.orderNumber}`;
                    const pendingOrderRefPath = `${PENDING_ORDERS_REF}/${order.orderNumber}`;
                    
                    updates[billingOrderRefPath] = { ...order, history: updatedHistory };
                    updates[pendingOrderRefPath] = null; 
                }
             });
             selectedOrders.forEach(orderNum => {
                const order = orders.find(o => o.orderNumber === orderNum);
                if(order) {
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
    
    const handleBatchPrint = () => {
        if (selectedOrders.length === 0) { showToast('No orders selected.', 'error'); return; }
        const selected = orders.filter(o => selectedOrders.includes(o.orderNumber));
        handlePrintPickingList(selected);
        setSelectedOrders([]);
    };

    const handleBatchExport = () => {
        if (selectedOrders.length === 0) { 
            showToast('No orders selected for export.', 'error'); 
            return; 
        }
        const selected = orders.filter(o => selectedOrders.includes(o.orderNumber));
        setOrdersToExport(selected);
        setIsExportModalOpen(true);
    };

    const handleExportSuccess = async (orderNumbers: string[]) => {
        const updates = {};
        const timestamp = new Date().toISOString();
        const eventMessage = `Order included in a batch export.`;
        const newHistoryEvent = { timestamp, event: 'System', details: eventMessage };

        orders.forEach(order => {
            if (orderNumbers.includes(order.orderNumber)) {
                const updatedHistory = [...(order.history || []), newHistoryEvent];
                updates[`${PENDING_ORDERS_REF}/${order.orderNumber}/lastExported`] = timestamp;
                updates[`${PENDING_ORDERS_REF}/${order.orderNumber}/history`] = updatedHistory;
            }
        });

        try {
            await firebase.database().ref().update(updates);
        } catch (error) {
            console.error("Failed to mark orders as exported:", error);
            showToast('Failed to update export status on orders.', 'error');
        }
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
        return filteredAndSortedOrders.reduce((acc: SummarizedData, order) => {
            if (!acc[order.partyName]) { acc[order.partyName] = { orderCount: 0, orders: [] }; }
            acc[order.partyName].orderCount += 1;
            acc[order.partyName].orders.push(order);
            return acc;
        }, {} as SummarizedData);
    }, [filteredAndSortedOrders]);

    const partyNamesInOrder = useMemo(() => {
        if (view !== 'summarized') return [];
        return [...new Set(filteredAndSortedOrders.map(o => o.partyName))];
    }, [filteredAndSortedOrders, view]);

    const expandedOrder = useMemo(() => expandedDetailed ? orders.find(o => o.orderNumber === expandedDetailed) : null, [expandedDetailed, orders]);
    
    const handleTogglePartyCollapse = (partyName: string) => {
        const isCurrentlyCollapsed = collapsedSummarized[partyName] ?? true;
        
        if (isCurrentlyCollapsed === false) { // it's open, and we are closing it
            const partyData = summarizedData[partyName];
            if (partyData && partyData.orders.some(o => o.orderNumber === expandedDetailed)) {
                setExpandedDetailed(null);
            }
        }

        setCollapsedSummarized(prev => ({ ...prev, [partyName]: !isCurrentlyCollapsed }));
    };

    // --- Command Center Logic ---
    const parties = useMemo(() => {
        return filteredAndSortedOrders.reduce((acc: Parties, order) => {
            if (!acc[order.partyName]) {
                acc[order.partyName] = 0;
            }
            acc[order.partyName]++;
            return acc;
        }, {} as Parties);
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
    
    const batchActionToolbarStyle = useMemo(() => {
        const style: React.CSSProperties = {
            ...styles.batchActionToolbar,
            bottom: isMobile ? '80px' : '30px',
            visibility: isSelectionMode ? 'visible' : 'hidden',
        };

        if (isMobile) {
            style.left = '25px';
            style.right = '25px';
            style.width = 'auto';
            style.transform = 'none';
        }

        return style;
    }, [isMobile, isSelectionMode]);
    
    const renderMobileLayout = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No pending orders.</div>;
        if (filteredAndSortedOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search.</div>;

        const expandedView = expandedOrder ? (
            <ExpandedPendingView
                order={expandedOrder}
                onProcess={handleProcessOrder}
                onDelete={openDeleteModalForOrder}
                isProcessing={processingOrder === expandedOrder.orderNumber}
                processingQty={processingQty}
                onQtyChange={handleProcessingQtyChange}
                stockData={stockData}
                isMobile={isMobile}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onOpenCustomTagModal={handleOpenCustomTagModal}
                onOpenNoteModal={handleOpenNoteModal}
                globalTags={globalTags}
            />
        ) : null;
        
        const commonProps = {
            onToggleExpand: handleToggleExpand,
            expandedOrderNumber: expandedDetailed,
            onProcessOrder: handleProcessFullOrder,
            onDeleteOrder: openDeleteModalForOrder,
            onEditOrder: handleEditOrder,
            isMobile: isMobile,
            selectedOrders: selectedOrders,
            onSelectOrder: handleSelectOrderCheckbox,
            isSelectionMode: isSelectionMode
        };

        const animationKey = `${view}-${sortConfig.key}-${sortConfig.direction}-${activeTagFilter}-${searchTerm}`;

        const content = view === 'summarized' ? (
             <div key={`summarized-${animationKey}`} style={styles.listContainer} className="fade-in-slide">
                {partyNamesInOrder.map((partyName) => (
                    <PartyGroup 
                        key={partyName} 
                        partyName={partyName} 
                        data={summarizedData[partyName]} 
                        {...commonProps}
                        isCollapsed={collapsedSummarized[partyName] ?? true}
                        onToggleCollapse={() => handleTogglePartyCollapse(partyName)}
                    >
                        {expandedView}
                    </PartyGroup>
                ))}
            </div>
        ) : (
            <div key={`detailed-${animationKey}`} style={styles.listContainer} className="fade-in-slide">
                <DetailedList orders={filteredAndSortedOrders} {...commonProps}>
                    {expandedView}
                </DetailedList>
            </div>
        );

        return content;
    };
    
    const renderDesktopLayout = () => {
         if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        
        const animationKey = `${sortConfig.key}-${sortConfig.direction}-${activeTagFilter}-${searchTerm}`;

        return (
            <div style={styles.commandCenterLayout} key={`desktop-${animationKey}`} className="fade-in-slide">
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
                                <span style={styles.partyCountBadge}>{count as React.ReactNode}</span>
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
                                    isSelectionMode={isSelectionMode}
                                    onToggleExpand={handleSelectOrder}
                                    onSelectOrder={handleSelectOrderCheckbox}
                                    onProcessOrder={handleProcessFullOrder}
                                    onDeleteOrder={openDeleteModalForOrder}
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
                            onDelete={openDeleteModalForOrder}
                            isProcessing={processingOrder === activeOrder.orderNumber}
                            processingQty={processingQty}
                            onQtyChange={handleProcessingQtyChange}
                            stockData={stockData}
                            isMobile={false}
                            onAddTag={handleAddTag}
                            onRemoveTag={handleRemoveTag}
                            onOpenCustomTagModal={handleOpenCustomTagModal}
                            onOpenNoteModal={handleOpenNoteModal}
                            globalTags={globalTags}
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
    
    return (
        <div style={styles.container}>
            <style>{`
                #party-name-editor-input:focus {
                    border: none !important;
                    box-shadow: none !important;
                    outline: none !important;
                }
                .fade-in-slide { animation: fadeInSlide 0.4s ease-out forwards; }
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .batch-toolbar-enter { 
                    animation: slideUpBatch 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    visibility: visible;
                }
                @keyframes slideUpBatch {
                    from { transform: translateY(100%) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .header-title-anim {
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    animation: fadeInTitle 0.3s ease-out;
                }
                @keyframes fadeInTitle {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .custom-dropdown-item:hover { background-color: var(--active-bg); }
                .suggestion-item:hover { background-color: var(--active-bg); }
                .style-chip:not(:last-child)::after {
                    content: '/';
                    padding: 0 0.4em;
                    color: var(--text-tertiary);
                    font-weight: 400;
                }
                @keyframes dropdown-in {
                    from { transform: translateY(10px) scale(0.95); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                 @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes slideDownSheet { from { transform: translateY(0); } to { translateY(100%); } }
                @keyframes scrollLeft {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                 @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
            {createPortal(<DeleteConfirmationModal
                state={deleteModalState}
                setState={setDeleteModalState}
                onConfirm={handleConfirmDeletion}
            />, document.body)}
            {createPortal(<CustomTagModal isOpen={isCustomTagModalOpen} onClose={() => setIsCustomTagModalOpen(false)} onSave={handleSaveCustomTag} />, document.body)}
            {createPortal(<AddNoteModal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} onSave={handleSaveNote} />, document.body)}
            <ExportMatching
                isOpen={isExportModalOpen}
                onClose={() => {
                    setIsExportModalOpen(false);
                    setOrdersToExport([]);
                    setSelectedOrders([]); // Clear selection after export
                }}
                ordersToExport={ordersToExport}
                onExportSuccess={handleExportSuccess}
                isMobile={isMobile}
                stockData={stockData}
            />
            <div style={isMobile ? styles.headerCardMobile : styles.headerCard}>
                <div style={{...styles.headerTop, ...(isMobile && {justifyContent: 'space-between', padding: '0.75rem 0'})}}>
                     {isMobile ? (
                         isSelectionMode ? (
                             <h2 className="header-title-anim" key="select" style={{...styles.pageTitle, fontSize: '1.1rem', color: 'var(--brand-color)'}}>
                                {selectedOrders.length} Selected
                             </h2>
                         ) : (
                            // Empty title on mobile when not selecting, to keep layout but hide text
                            <div />
                         )
                     ) : (
                        <h2 style={styles.pageTitle}>Pending Orders</h2>
                     )}
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
                    <div style={isSearchFocused ? {...styles.searchContainer, ...styles.searchContainerActive} : styles.searchContainer}>
                        <SearchIcon />
                        <input 
                            type="text" 
                            style={styles.searchInput} 
                            className="global-search-input" 
                            placeholder="Search by party or order number..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
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

                    <div style={styles.filterContainer} ref={sortPillsRef}>
                        <div style={{...styles.filterMarker, ...markerStyle}}></div>
                        <span style={{fontWeight: 500, color: 'var(--text-color)', fontSize: '0.9rem', padding: '0.4rem 0.2rem', display: 'none', position: 'relative', zIndex: 1}}>Sort by:</span>
                        {sortOptions.map(opt => {
                            const isActive = sortConfig.key === opt.key && sortConfig.direction === opt.direction;
                            return (
                                <button 
                                    key={opt.label}
                                    // FIX: Correctly type the ref callback to not return a value, resolving a TypeScript error.
                                    ref={el => { pillRefs.current[`${opt.key}-${opt.direction}`] = el; }} 
                                    onClick={() => setSortConfig({key: opt.key, direction: opt.direction})} 
                                    style={isActive ? styles.filterButtonActive : styles.filterButton}
                                >{opt.label}</button>
                            );
                        })}
                    </div>
                </div>
            </div>
            {isSelectionMode && (
                <div className="batch-toolbar-enter" style={batchActionToolbarStyle}>
                    <div style={styles.batchIconGroup}>
                        <button style={{...styles.batchIconBtn, color: 'var(--green)'}} onClick={handleBatchProcess} title="Forward for Process"><ProcessIcon/></button>
                        <button style={{...styles.batchIconBtn, color: 'var(--orange)'}} onClick={handleBatchExport} title="Export"><ShareIcon/></button>
                        <button style={{...styles.batchIconBtn, color: 'var(--blue)'}} onClick={handleBatchPrint} title="Print Picking List"><DownloadIcon/></button>
                        <button style={{...styles.batchIconBtn, ...styles.batchIconBtnDanger}} onClick={handleBatchDelete} title="Delete"><TrashIcon/></button>
                    </div>
                </div>
            )}
            {isMobile ? renderMobileLayout() : renderDesktopLayout()}
        </div>
    );
};

const partyNameBaseStyle: React.CSSProperties = {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.3,
    fontFamily: "'Inter', sans-serif",
    color: 'var(--dark-grey)',
    margin: 0,
    padding: '8px 0',
    width: '100%',
    boxSizing: 'border-box',
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    textAlign: 'left',
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '0', flex: 1, position: 'relative', backgroundColor: 'var(--light-grey)' },
    headerCard: { 
        background: 'linear-gradient(to bottom, var(--light-grey) 80%, transparent)', 
        padding: '1rem 1.5rem 2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        border: 'none', 
        borderRadius: 0 
    },
    headerCardMobile: { 
        background: 'linear-gradient(to bottom, var(--light-grey) 80%, transparent)', 
        padding: '0 1rem 1.5rem', 
        gap: '0', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100 
    },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    pageTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    headerControls: { display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 101 },
    viewToggle: { display: 'flex', backgroundColor: 'var(--grey-5)', borderRadius: '18px', padding: '4px' },
    toggleButton: { background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '6px' },
    toggleButtonActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--brand-color)', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    
    // Mobile Toggle Styles
    mobileFilterButton: { background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: 'var(--text-color)' },
    mobileViewToggle: { display: 'flex', backgroundColor: 'var(--grey-5)', borderRadius: '20px', padding: '3px', marginLeft: '0.5rem', gap: '2px' },
    mobileSegmentInactive: { background: 'transparent', border: 'none', padding: '6px 16px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '18px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    mobileSegmentActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 16px', cursor: 'pointer', color: 'var(--dark-grey)', borderRadius: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    filtersCollapsed: { maxHeight: 0, opacity: 0, overflow: 'hidden', transition: 'max-height 0.4s ease-out, opacity 0.4s ease-out, margin-top 0.4s ease-out', marginTop: 0 },
    filtersVisible: { maxHeight: '300px', opacity: 1, overflow: 'visible', transition: 'max-height 0.4s ease-in, opacity 0.4s ease-in, margin-top 0.4s ease-in', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
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
    filterContainer: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', height: '37px', position: 'relative', backgroundColor: 'var(--gray-5)', borderRadius: '18px', padding: '4px' },
    filterMarker: { position: 'absolute', top: '4px', left: 0, height: 'calc(100% - 8px)', backgroundColor: 'var(--card-bg)', borderRadius: '14px', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', zIndex: 0, boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 3px, rgba(0, 0, 0, 0.05) 0px 1px 2px', opacity: 0 },
    filterButton: { background: 'transparent', border: 'none', color: 'var(--text-color)', padding: '0.4rem 0.8rem', borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem', position: 'relative', zIndex: 1, transition: 'color 0.3s ease' },
    filterButtonActive: { background: 'transparent', border: 'none', color: 'var(--brand-color)', padding: '0.4rem 0.8rem', borderRadius: '14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, position: 'relative', zIndex: 1, transition: 'color 0.3s ease' },
    tagFilterContainer: { display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', zIndex: 101 },
    tagScrollContainer: { display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' },
    tagFilterButton: { background: 'var(--card-bg)', border: '1px solid var(--skeleton-bg)', padding: '0.3rem 0.8rem', borderRadius: '14px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 1rem 90px' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    card: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', border: 'none', overflow: 'hidden' },
    cardHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--separator-color)' },
    mobileCardHeader: { width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'border-radius 0.3s ease' },
    mobilePartyHeaderContent: { display: 'flex', alignItems: 'center', width: '100%', gap: '1rem' },
    partyAvatar: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '1.1rem', flexShrink: 0 },
    mobilePartyInfo: { display: 'flex', flexDirection: 'column', flex: 1, gap: '2px', overflow: 'hidden' },
    mobilePartyName: { fontWeight: '600', fontSize: '1rem', color: 'var(--dark-grey)' },
    mobilePartyMeta: { fontSize: '0.8rem', color: 'var(--text-color)' },
    mobileChevron: { color: 'var(--text-color)' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start', flex: 1, overflow: 'hidden' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    cardDetails: { padding: '0 0 1rem', display: 'flex', flexDirection: 'column' },
    stylePreview: { fontSize: '0.8rem', color: 'var(--text-color)', marginTop: '4px', lineHeight: 1.4, display: 'flex', flexWrap: 'wrap', alignItems: 'center' },
    
    // Animation Wrappers - using grid for smoother animations
    collapsibleContainer: {
        display: 'grid',
        gridTemplateRows: '0fr',
        transition: 'grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: 'var(--card-bg)'
    },
    collapsibleContainerExpanded: {
        gridTemplateRows: '1fr',
    },
    collapsibleContentWrapper: {
        overflow: 'hidden',
        minHeight: 0,
        transition: 'opacity 0.3s ease',
        // Promote to own layer to prevent text blur during animation
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
    },

    orderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', borderTop: '1px solid var(--separator-color)' },
    orderItemActive: { backgroundColor: 'var(--active-bg)'},
    orderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--dark-grey)', flex: 1, minWidth: 0 },
    orderMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-color)', fontSize: '0.85rem' },
    badge: { backgroundColor: 'var(--active-bg)', color: 'var(--brand-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
    checkboxContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
    checkboxButton: { background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: 'var(--text-color)' },
    expandedViewContainer: { padding: '0 1.5rem 1.5rem', backgroundColor: 'var(--card-bg)', borderRadius: '0 0 10px 10px', border: '2px solid var(--brand-color)', borderTop: 'none' },
    tableContainer: { overflowX: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '8px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: 'var(--light-grey)', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)', whiteSpace: 'nowrap' },
    tr: { backgroundColor: 'var(--card-bg)', borderBottom: 'none' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'center' },
    qtyInput: { width: '70px', padding: '8px', textAlign: 'center', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)' },
    tdInput: { padding: '4px' },
    noteBox: { backgroundColor: 'var(--card-bg)', border: '1px solid var(--yellow)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.9rem', marginTop: '1rem' },
    modalFooter: { padding: '1rem 0 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: 'none' },
    footerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
    downloadButton: {
        background: 'var(--card-bg)',
        border: '1px solid var(--skeleton-bg)',
        color: 'var(--brand-color)',
        padding: '0.75rem',
        borderRadius: '50%',
        height: '41px',
        cursor: 'pointer',
        width: '41px',
        boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    deleteButton: {
        background: 'var(--card-bg)',
        border: '1px solid var(--skeleton-bg)',
        color: 'var(--red)',
        padding: '0.75rem',
        borderRadius: '50%',
        height: '41px',
        cursor: 'pointer',
        width: '41px',
        boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    processButton: {
        padding: '0.75rem 1.5rem',
        fontSize: '0.9rem',
        fontWeight: 600,
        color: '#fff',
        background: 'linear-gradient(145deg, var(--green), #29b851)',
        border: 'none',
        borderRadius: '25px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'all 0.3s ease',
        minWidth: '150px',
        boxShadow: 'rgba(0, 0, 0, 0.06) 0px 4px 12px',
        height: '44px'
    },
    processButtonDisabled: { background: 'rgba(52, 199, 89, 0.4)', color: 'rgba(255, 255, 255, 0.9)', boxShadow: 'none', cursor: 'not-allowed' },
    processQtyContainer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', },
    processQtyButton: { backgroundColor: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s', lineHeight: 1, },
    processQtyInput: { textAlign: 'center', border: '1px solid var(--skeleton-bg)', borderLeft: 'none', borderRight: 'none', fontSize: '0.9rem', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', appearance: 'textfield', MozAppearance: 'textfield', WebkitAppearance: 'none', margin: 0, },
    // --- Batch Action Toolbar ---
    batchActionToolbar: {
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        padding: '0.6rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'auto',
        zIndex: 1000,
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px var(--glass-border)',
    },
    batchIconGroup: {
        display: 'flex',
        gap: '1rem'
    },
    batchIconBtn: {
        background: 'transparent',
        border: 'none',
        color: 'var(--dark-grey)',
        padding: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        transition: 'background 0.2s ease, transform 0.1s',
        width: '40px',
        height: '40px'
    },
    batchIconBtnDanger: {
        color: 'var(--red)'
    },

    stockIndicator: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
    stockIndicatorPlaceholder: { width: '10px', height: '10px' },
    mobileItemContainer: { display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.5rem' },
    mobileItemCard: { backgroundColor: 'var(--card-bg)', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
    mobileItemInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    mobileItemName: { fontWeight: 500, color: 'var(--dark-grey)', fontSize: '0.9rem' },
    mobileItemStock: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dark-grey)' },
    mobileItemQty: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' },
    mobileQtyLabel: { fontSize: '0.8rem', color: 'var(--text-color)' },
    // --- Swipeable styles ---
    swipeableContainer: { position: 'relative', overflow: 'hidden', width: '100%', borderRadius: '10px' },
    swipeableLeftActions: { position: 'absolute', top: '10%', left: 0, height: '80%', display: 'flex', alignItems: 'center', paddingLeft: '10px', gap: '10px', zIndex: 0 },
    swipeableRightActions: { position: 'absolute', top: '10%', right: 0, height: '80%', display: 'flex', alignItems: 'center', paddingRight: '10px', gap: '10px', zIndex: 0 },
    swipeAction: { width: '40px', height: '40px', borderRadius: '20px', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', margin: 'auto' },
    swipeableContent: { position: 'relative', backgroundColor: 'var(--card-bg)', zIndex: 1 },
    
    // --- New Detailed Card Styles ---
    detailedOrderCard: { backgroundColor: 'var(--card-bg)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s, background-color 0.2s', border: '2px solid transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' },
    detailedOrderCardActive: { 
        backgroundColor: 'var(--card-bg)', 
        borderRadius: '10px 10px 0 0', 
        padding: '1rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.5rem', 
        cursor: 'pointer', 
        transition: 'all 0.2s',
        border: '2px solid var(--brand-color)',
        borderBottom: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    },
    
    // Refined Hierarchy Styles
    cardTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' },
    cardPartyName: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark-grey)', margin: 0, lineHeight: 1.2, flex: 1, paddingRight: '0.5rem', display: 'flex', alignItems: 'center' },
    cardTotalQuantityBadge: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-color)', backgroundColor: 'var(--active-bg)', padding: '3px 8px', borderRadius: '6px', marginRight: '0.75rem', minWidth: '30px', textAlign: 'center' },
    
    cardSecondRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' },
    stylePreviewInline: { fontSize: '0.85rem', color: 'var(--text-color)', textAlign: 'left', fontWeight: 500, lineHeight: 1.4, display: 'flex', flexWrap: 'wrap', alignItems: 'center' },
    cardMetaRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
    
    cardOrderNumber: { fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-color)', backgroundColor: 'var(--active-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' },
    cardTime: { fontSize: '0.75rem', color: 'var(--text-color)' },
    
    cardFooterRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem' },
    metricGroup: { display: 'flex', gap: '1rem' },
    iconMetric: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--dark-grey)' },
    statusIconGroup: { display: 'flex', gap: '0.75rem' },
    
    // --- History Section ---
    historySection: { marginTop: '1rem', paddingTop: '1rem' },
    historyHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    notesAndHistoryContainer: { border: '1px solid var(--separator-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'transparent' },
    historyList: { maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.75rem' },
    historyItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem', borderLeft: '3px solid var(--separator-color)', paddingLeft: '1rem' },
    historyMeta: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-color)' },
    historyEventType: { fontWeight: 600, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' },
    historyDetails: { fontSize: '0.9rem', color: 'var(--dark-grey)', paddingLeft: '0.25rem' },
    addNoteContainer: { display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--separator-color)' },
    addNoteButton: { background: 'var(--brand-color)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(97, 85, 245, 0.3)', flexShrink: 0 },
    // --- Command Center Styles ---
    commandCenterLayout: { display: 'grid', gridTemplateColumns: '280px 1fr 1.5fr', gap: '1rem', flex: 1, minHeight: 0 },
    leftPanel: { display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', border: 'none', minHeight: 0 },
    middlePanel: { display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', border: 'none', minHeight: 0 },
    rightPanel: { display: 'flex', flexDirection: 'column', backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', border: 'none', minHeight: 0, overflowY: 'auto' },
    panelHeader: { padding: '1rem', borderBottom: '1px solid var(--skeleton-bg)', fontWeight: 600, color: 'var(--dark-grey)', flexShrink: 0 },
    panelContent: { padding: '0.5rem', overflowY: 'auto', flex: 1 },
    partyListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' },
    partyListItemActive: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.75rem 1rem', background: 'var(--active-bg)', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--brand-color)' },
    partyNameText: { fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    partyCountBadge: { backgroundColor: 'var(--light-grey)', color: 'var(--text-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 },
    rightPanelPlaceholder: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-color)', textAlign: 'center', padding: '2rem' },
    // --- Tag Styles ---
    tagsSection: { marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--separator-color)', borderRadius: '8px' },
    tagsHeader: { marginBottom: '0.5rem' },
    tagsList: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' },
    tagsContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' },
    removeTagButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0', marginLeft: '4px', display: 'flex', alignItems: 'center' },
    miniTagDot: { width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' },
    customDropdownContainer: {
        position: 'relative',
        display: 'inline-block',
        // Promote to own layer to prevent text blur during animation
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
    },
    customDropdownButton: { padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--separator-color)', fontSize: '0.75rem', color: 'var(--text-color)', backgroundColor: 'var(--light-grey)', cursor: 'pointer', display: 'flex', alignItems: 'center', },
    customDropdownMenu: {
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 9000,
        minWidth: '200px',
        padding: '0.25rem',
        animation: 'dropdown-in 0.2s ease-out forwards',
    },
    customDropdownItem: { display: 'block', width: '100%', padding: '0.5rem 0.75rem', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '6px', color: 'var(--dark-grey)', },
    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 },
    modalContent: { backgroundColor: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem', transform: 'scale(0.95)', opacity: 0 },
    cartModalContent: { maxWidth: '320px', animation: 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards', zIndex: 1103 },
    modalSubtitleText: { textAlign: 'center', color: 'var(--text-color)', marginBottom: '1rem', fontSize: '0.9rem', padding: '0 1rem' },
    modalInput: { width: '100%', padding: '10px 15px', fontSize: '1rem', border: '1px solid var(--separator-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', fontFamily: "'Inter', sans-serif" },
    modalTextarea: { width: '100%', minHeight: '40px', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--separator-color)', borderRadius: '8px', resize: 'vertical', backgroundColor: 'var(--card-bg)', color: 'var(--dark-grey)', fontFamily: "'Inter', sans-serif" },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalHeader: { padding: '1rem 1.5rem 0.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
    modalCloseButton: { background: 'none', border: 'none', fontSize: '2rem', color: 'var(--text-color)', cursor: 'pointer', padding: 0 },
    cardTitleBare: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cartEmptyText: { textAlign: 'center', color: 'var(--text-color)', padding: '3rem 1.25rem', flex: 1 },
    cartGroupItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--separator-color)', width: '100%', background: 'none', border: 'none', textAlign: 'left' },
    cartItemSubDetails: { color: 'var(--text-color)', fontSize: '0.8rem' },
    iosModalActions: { display: 'flex', width: 'calc(100% + 3rem)', marginLeft: '-1.5rem', marginBottom: '-1.5rem', borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem' },
    iosModalButtonSecondary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--dark-grey)', borderRight: '1px solid var(--glass-border)', fontWeight: 400 },
    iosModalButtonPrimary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--brand-color)', fontWeight: 600 },
    inputGroup: { position: 'relative' },
    label: { position: 'absolute', left: '15px', top: '15px', color: 'var(--text-tertiary)', pointerEvents: 'none', transition: 'all 0.2s ease-out' },

    // --- Bottom Sheet Styles ---
    bottomSheetOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)', zIndex: 1100 },
    bottomSheetContainer: { position: 'fixed', left: 0, right: 0, bottom: 0, top: '30px', backgroundColor: 'var(--card-bg)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', zIndex: 1101, display: 'flex', flexDirection: 'column' },
    bottomSheetHandleContainer: { padding: '8px 0', display: 'flex', justifyContent: 'center', cursor: 'grab', flexShrink: 0 },
    bottomSheetHandle: { width: '40px', height: '5px', backgroundColor: 'var(--gray-4)', borderRadius: '2.5px' },
    bottomSheetHeader: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', padding: '4px 16px 12px', gap: '16px', flexShrink: 0, },
    sheetTitle: { gridColumn: '2', textAlign: 'center', fontSize: '1rem', fontWeight: 600, color: 'var(--dark-grey)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    sheetCloseButton: { gridColumn: '1', width: '32px', height: '32px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'var(--gray-5)', color: 'var(--text-color)' },
    sheetConfirmButton: { gridColumn: '3', width: '32px', height: '32px', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'var(--brand-color)', color: '#fff' },
    bottomSheetBody: { flex: 1, overflowY: 'auto', padding: '0 16px 16px' },
    bottomSheetFooter: { padding: '16px', borderTop: '1px solid var(--separator-color)', flexShrink: 0, backgroundColor: 'var(--card-bg)', },
    sheetCartButton: { background: 'var(--light-grey)', border: '1px solid var(--separator-color)', color: 'var(--dark-grey)', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', width: '48px', height: '48px', },
    sheetCartBadge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--red)', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, border: '2px solid var(--card-bg)', },

    // Edit Bottom Sheet Content
    editSheetPartyName: { ...partyNameBaseStyle, cursor: 'text' },
    partyNameInput: { ...partyNameBaseStyle, outline: 'none' },
    partyNameInputWrapper: { position: 'relative', marginBottom: '0.5rem' },
    partyNameSuggestions: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--separator-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '150px', overflowY: 'auto', zIndex: 1200, marginTop: '4px' },
    suggestionItem: { padding: '10px 16px', cursor: 'pointer', fontSize: '1rem', fontWeight: 400, color: 'var(--dark-grey)' },
    editSheetInfoBubbles: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
    infoBubble: { padding: '0.4rem 0.8rem', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' },
    editSheetSearchContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--light-grey)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid transparent', marginBottom: '1rem', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' },
    editSheetSearchContainerActive: { borderColor: 'var(--brand-color)', boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.15)' },
    editSheetSearchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    recommendationsContainer: { marginTop: '1rem', overflow: 'hidden', position: 'relative', width: '100%', maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', padding: '0.5rem 0', height: '54px' },
    scrollingTrack: { display: 'flex', animation: 'scrollLeft 30s linear infinite', },
    recommendationBubble: { padding: '0.5rem 1rem', border: 'none', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, marginRight: '0.75rem', whiteSpace: 'nowrap', transition: 'transform 0.2s ease' },
    // From New Order Entry, for popup consistency
    cartItemsList: { flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem' },
    cartItemInfo: { flex: 1 },
    cartItemDetails: { fontWeight: 600, color: 'var(--dark-grey)', fontSize: '0.9rem' },
    cartFooter: { borderTop: '1px solid var(--separator-color)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 },
    cartSummary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: '0.85rem', color: 'var(--text-color)', marginBottom: '0.25rem' },
    summaryValue: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
};