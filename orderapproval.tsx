
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// --- ICONS ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Spinner = () => <div style={styles.spinner}></div>;
const SmallSpinner = () => <div style={{...styles.spinner, width: '20px', height: '20px', borderTop: '3px solid white', borderRight: '3px solid transparent' }}></div>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const ChevronIcon = ({ collapsed }) => <svg style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;

// --- TYPE & FIREBASE ---
interface UnapprovedOrder {
  referenceNumber: string;
  partyName: string;
  retailerId: string;
  city: string;
  dateTime: string;
  status: string;
  totalQuantity: number;
  totalAmount: number;
  orderNote?: string;
  lineItems: any[];
}
const UNAPPROVED_ORDERS_REF = 'unapprovedorders';
const PENDING_ORDERS_REF = 'Pending_Order_V2';
const ORDER_COUNTER_REF = 'orderCounter/KA-OMS-v2-Counter';
const ORDER_NUMBER_PREFIX = 'K';


// --- HELPERS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'N/A';
const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value);

// --- INDEXEDDB HELPERS for master item data ---
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
};


// --- COMPONENTS ---
const RejectionModal = ({ isOpen, isClosing, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setReason('');
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!reason.trim()) {
            showToast('Please provide a reason for rejection.', 'error');
            return;
        }
        setIsSaving(true);
        await onConfirm(reason);
        // Parent will close modal on success
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '400px', animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                <h3 style={{...styles.modalTitle, textAlign: 'center'}}>Reason for Rejection</h3>
                <textarea 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    style={styles.modalTextarea}
                    placeholder="e.g., Stock unavailable, payment issue, etc."
                />
                <div style={styles.iosModalActions}>
                    <button onClick={onClose} style={styles.iosModalButtonSecondary} disabled={isSaving}>Cancel</button>
                    <button onClick={handleConfirm} style={{...styles.iosModalButtonPrimary, color: 'var(--red)'}} disabled={isSaving}>
                        {isSaving ? <SmallSpinner /> : 'Confirm Rejection'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ApprovalConfirmationModal = ({ state, onClose, onConfirm, isProcessing }) => {
    const { isOpen, isClosing, order } = state;
    if (!isOpen || !order) return null;

    return (
        <div style={{...styles.modalOverlay, animation: isClosing ? 'overlayOut 0.3s forwards' : 'overlayIn 0.3s forwards'}} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '360px', animation: isClosing ? 'modalOut 0.3s forwards' : 'modalIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={(e) => e.stopPropagation()}>
                <h3 style={{...styles.modalTitle, textAlign: 'center', marginBottom: '0.5rem'}}>Confirm Approval</h3>
                <p style={{textAlign: 'center', color: 'var(--text-color)', marginBottom: '1.5rem', fontSize: '0.95rem'}}>
                    Are you sure you want to approve order <strong>#{order.referenceNumber}</strong> for {order.partyName}?
                </p>
                <div style={styles.iosModalActions}>
                    <button onClick={onClose} style={styles.iosModalButtonSecondary} disabled={isProcessing}>Cancel</button>
                    <button onClick={onConfirm} style={{...styles.iosModalButtonPrimary, color: 'var(--brand-color)'}} disabled={isProcessing}>
                        {isProcessing ? <SmallSpinner /> : 'Approve'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ApprovalCard: React.FC<{ order: UnapprovedOrder; onApprove: () => void; onReject: () => void; isProcessing: boolean; }> = ({ order, onApprove, onReject, isProcessing }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const cardStyle: React.CSSProperties = {
        ...styles.card,
        boxShadow: isExpanded ? 'rgba(0, 0, 0, 0.06) 0px 4px 8px' : 'rgba(0, 0, 0, 0.04) 0px 2px 4px',
    };
    
    return (
        <div style={cardStyle}>
            <button style={styles.cardHeaderButton} onClick={() => setIsExpanded(!isExpanded)}>
                <div style={styles.cardInfo}>
                    <span style={styles.cardTitle}>{order.partyName}</span>
                    <span style={styles.cardSubTitle}>PO #{order.referenceNumber}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span style={styles.orderDateText}>
                        <CalendarIcon /> {formatDateTime(order.dateTime)}
                    </span>
                    <ChevronIcon collapsed={!isExpanded} />
                </div>
            </button>
            <div style={!isExpanded ? styles.collapsibleContainer : {...styles.collapsibleContainer, ...styles.collapsibleContainerExpanded}}>
                <div style={styles.collapsibleContentWrapper}>
                    <div style={styles.cardDetails}>
                         <div style={styles.summaryGrid}>
                            <div style={styles.summaryItem}><span style={styles.summaryLabel}>Retailer ID</span><span style={styles.summaryValue}>{order.retailerId}</span></div>
                            <div style={styles.summaryItem}><span style={styles.summaryLabel}>City</span><span style={styles.summaryValue}>{order.city}</span></div>
                            <div style={styles.summaryItem}><span style={styles.summaryLabel}>Total Qty</span><span style={styles.summaryValue}>{order.totalQuantity}</span></div>
                            <div style={styles.summaryItem}><span style={styles.summaryLabel}>Total Value</span><span style={styles.summaryValue}>{formatCurrency(order.totalAmount)}</span></div>
                        </div>
                        {order.orderNote && <div style={styles.noteBox}><strong>Note:</strong> {order.orderNote}</div>}

                        <div style={styles.tableContainer}>
                            <table style={styles.table}>
                                <thead><tr>
                                    <th style={styles.th}>Style</th><th style={styles.th}>Color</th>
                                    <th style={styles.th}>Size</th><th style={styles.th}>MRP</th><th style={styles.th}>Qty</th>
                                </tr></thead>
                                <tbody>
                                    {(order.lineItems || []).map((item, index) => (
                                        <tr key={item.barcode ?? index} style={index % 2 !== 0 ? {backgroundColor: 'var(--stripe-bg)'} : {}}>
                                            <td style={styles.td}>{item.style}</td><td style={styles.td}>{item.color}</td>
                                            <td style={styles.td}>{item.size}</td><td style={styles.td}>{formatCurrency(item.mrp)}</td><td style={styles.td}>{item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={styles.actionsContainer}>
                            <button style={styles.rejectButton} onClick={onReject} disabled={isProcessing}><XIcon /> Reject</button>
                            <button style={styles.approveButton} onClick={onApprove} disabled={isProcessing}>{isProcessing ? <SmallSpinner /> : <><CheckIcon/> Approve</>}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const OrderApproval = ({ session }) => {
    const [orders, setOrders] = useState<UnapprovedOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [processingOrder, setProcessingOrder] = useState<string | null>(null);
    const [rejectionModalState, setRejectionModalState] = useState({ isOpen: false, isClosing: false, order: null as UnapprovedOrder | null });
    const [approvalModalState, setApprovalModalState] = useState({ isOpen: false, isClosing: false, order: null as UnapprovedOrder | null });

    const fetchOrders = useCallback(async () => {
        const ordersRef = firebase.database().ref(UNAPPROVED_ORDERS_REF);
        ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const ordersArray = (Object.values(data) as UnapprovedOrder[])
                    .filter(order => order.status === 'Approval Pending'); // Only show pending orders
                ordersArray.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
                setOrders(ordersArray);
            } else {
                setOrders([]);
            }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch unapproved orders.');
            setIsLoading(false);
        });

        return () => ordersRef.off('value');
    }, []);

    useEffect(() => {
        if (session.role === 'ADMIN') {
            const unsubscribe = fetchOrders();
            return () => { unsubscribe.then(off => off()); };
        } else {
            setError('Permission denied. Admin access required.');
            setIsLoading(false);
        }
    }, [fetchOrders, session.role]);
    
    const handleOpenRejectionModal = (order: UnapprovedOrder) => {
        setRejectionModalState({ isOpen: true, isClosing: false, order });
    };

    const handleCloseRejectionModal = () => {
        setRejectionModalState(prev => ({ ...prev, isClosing: true }));
        setTimeout(() => {
            setRejectionModalState({ isOpen: false, isClosing: false, order: null });
        }, 300);
    };

    const handleConfirmRejection = async (reason: string) => {
        const order = rejectionModalState.order;
        if (!order) return;
        
        try {
            await firebase.database().ref(`${UNAPPROVED_ORDERS_REF}/${order.referenceNumber}`).update({
                status: 'Rejected',
                rejectionReason: reason,
            });
            showToast(`Order #${order.referenceNumber} rejected.`, 'success');
            handleCloseRejectionModal();
        } catch (err) {
            console.error('Failed to reject order:', err);
            showToast('Failed to reject order.', 'error');
        }
    };
    
    const handleOpenApprovalModal = (order: UnapprovedOrder) => {
        setApprovalModalState({ isOpen: true, isClosing: false, order });
    };

    const handleCloseApprovalModal = () => {
        setApprovalModalState(prev => ({ ...prev, isClosing: true }));
        setTimeout(() => {
            setApprovalModalState({ isOpen: false, isClosing: false, order: null });
        }, 300);
    };

    const handleConfirmApproval = async () => {
        const order = approvalModalState.order;
        if (!order) return;
    
        setProcessingOrder(order.referenceNumber);
        try {
            // 1. Fetch master item data from IndexedDB
            const masterItems = await itemDb.getAllItems() as any[];
            if (!masterItems || masterItems.length === 0) {
                throw new Error("Master item catalog is not available. Please sync data on the New Order page first.");
            }
            const masterItemsByBarcode = new Map(masterItems.map(item => [item.Barcode, item]));
    
            // 2. Validate all items exist in the master catalog
            const notFoundItems = order.lineItems.filter(item => !masterItemsByBarcode.has(item.barcode));
            if (notFoundItems.length > 0) {
                const notFoundBarcodes = notFoundItems.map(item => item.barcode).join(', ');
                throw new Error(`Item matching failed. The following barcodes were not found in the master catalog: ${notFoundBarcodes}`);
            }
    
            // 3. Generate new internal order number
            const counterRef = firebase.database().ref(ORDER_COUNTER_REF);
            const result = await counterRef.transaction(currentValue => (currentValue || 0) + 1);
            if (!result.committed) throw new Error("Failed to generate new order number.");
            const newOrderNumber = `${ORDER_NUMBER_PREFIX}${result.snapshot.val()}`;
    
            // 4. Transform data using master catalog
            const newPendingOrderItems = order.lineItems.map(item => {
                const masterItem = masterItemsByBarcode.get(item.barcode);
                return {
                    id: masterItem.Barcode,
                    quantity: item.quantity,
                    price: parseFloat(String(masterItem.MRP).replace(/[^0-9.-]+/g, "")) || 0,
                    fullItemData: masterItem,
                };
            });
            
            const newPendingOrder = {
                orderNumber: newOrderNumber,
                partyName: `${order.partyName} (PO)`,
                items: newPendingOrderItems,
                orderNote: order.orderNote || '',
                totalQuantity: order.totalQuantity,
                totalValue: newPendingOrderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0),
                timestamp: order.dateTime,
                status: 'Pending',
                history: [{
                    timestamp: new Date().toISOString(),
                    event: 'System',
                    details: `Order approved and created from retailer PO #${order.referenceNumber}. Approved by ${session.userName}.`
                }]
            };
    
            // 5. Perform Firebase transaction
            const updates = {};
            updates[`${PENDING_ORDERS_REF}/${newOrderNumber}`] = newPendingOrder;
            updates[`${UNAPPROVED_ORDERS_REF}/${order.referenceNumber}/status`] = 'Approved';
            updates[`${UNAPPROVED_ORDERS_REF}/${order.referenceNumber}/approvedby`] = session.userName;
            updates[`${UNAPPROVED_ORDERS_REF}/${order.referenceNumber}/ardate`] = new Date().toISOString();
            
            await firebase.database().ref().update(updates);
    
            showToast(`Order #${order.referenceNumber} approved. New Order ID: ${newOrderNumber}`, 'success');
            handleCloseApprovalModal();
    
        } catch (err) {
            console.error('Failed to approve order:', err);
            showToast(`Error approving order: ${err.message}`, 'error');
        } finally {
            setProcessingOrder(null);
        }
    };

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return orders;
        const lowercasedTerm = searchTerm.toLowerCase();
        return orders.filter(order => 
            order.partyName.toLowerCase().includes(lowercasedTerm) ||
            order.referenceNumber.toLowerCase().includes(lowercasedTerm) ||
            order.retailerId.toLowerCase().includes(lowercasedTerm)
        );
    }, [orders, searchTerm]);

    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No orders awaiting approval.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search.</div>;
        
        return (
            <div style={styles.listContainer}>
                {filteredOrders.map(order => (
                    <ApprovalCard 
                        key={order.referenceNumber} 
                        order={order}
                        onApprove={() => handleOpenApprovalModal(order)}
                        onReject={() => handleOpenRejectionModal(order)}
                        isProcessing={processingOrder === order.referenceNumber}
                    />
                ))}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                <div style={isSearchFocused ? {...styles.searchContainer, ...styles.searchContainerActive} : styles.searchContainer}>
                    <SearchIcon />
                    <input 
                        type="text" 
                        style={styles.searchInput} 
                        className="global-search-input" 
                        placeholder="Search by party, PO number, or ID..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                </div>
            </div>
            {renderContent()}
            <RejectionModal
                isOpen={rejectionModalState.isOpen}
                isClosing={rejectionModalState.isClosing}
                onClose={handleCloseRejectionModal}
                onConfirm={handleConfirmRejection}
            />
            <ApprovalConfirmationModal
                state={approvalModalState}
                onClose={handleCloseApprovalModal}
                onConfirm={handleConfirmApproval}
                isProcessing={!!processingOrder}
            />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 },
    headerCard: {
        backgroundColor: 'transparent',
        padding: '1rem 1.5rem',
        borderRadius: 'var(--border-radius)',
        border: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
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
    searchContainerActive: { borderColor: 'var(--brand-color)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem', padding: '0 1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: 'auto' },
    card: {
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--border-radius)',
        border: 'none',
        overflow: 'hidden',
    },
    cardHeaderButton: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    cardInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    cardSubTitle: { fontSize: '0.9rem', color: 'var(--text-color)', fontWeight: 500 },
    orderDateText: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)', fontSize: '0.8rem' },
    collapsibleContainer: { display: 'grid', gridTemplateRows: '0fr', transition: 'grid-template-rows 0.35s ease' },
    collapsibleContainerExpanded: { gridTemplateRows: '1fr' },
    collapsibleContentWrapper: { overflow: 'hidden' },
    cardDetails: { padding: '0rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: 'var(--card-bg-tertiary)', borderRadius: '8px' },
    summaryItem: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    summaryLabel: { fontSize: '0.8rem', color: 'var(--text-color)', fontWeight: 500 },
    summaryValue: { fontSize: '1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    noteBox: { backgroundColor: 'var(--card-bg-tertiary)', borderLeft: '3px solid var(--orange)', padding: '1rem', borderRadius: '4px', fontSize: '0.9rem' },
    tableContainer: { overflow: 'hidden', borderRadius: '8px', backgroundColor: 'var(--card-bg-secondary)', border: '1px solid var(--separator-color)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: 'var(--light-grey)', padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-color)', borderBottom: '1px solid var(--separator-color)', whiteSpace: 'nowrap', fontSize: '0.8rem' },
    td: { padding: '8px 10px', color: 'var(--text-color)', fontSize: '0.85rem', textAlign: 'left', borderBottom: '1px solid var(--separator-color)' },
    actionsContainer: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '0' },
    rejectButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 56, 60, 0.1)', border: '1px solid transparent', color: 'var(--red)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 },
    approveButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--green)', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 },
    
    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 },
    modalContent: { backgroundColor: 'var(--glass-bg)', padding: '1.5rem', borderRadius: '12px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem', transform: 'scale(0.95)', opacity: 0 },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    modalTextarea: { width: '100%', minHeight: '80px', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--separator-color)', borderRadius: '8px', resize: 'vertical' },
    iosModalActions: { display: 'flex', width: 'calc(100% + 3rem)', marginLeft: '-1.5rem', marginBottom: '-1.5rem', borderTop: '1px solid var(--glass-border)', marginTop: '1.5rem' },
    iosModalButtonSecondary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--dark-grey)', borderRight: '1px solid var(--glass-border)', fontWeight: 400 },
    iosModalButtonPrimary: { background: 'transparent', border: 'none', padding: '1rem 0', cursor: 'pointer', fontSize: '1rem', textAlign: 'center', transition: 'background-color 0.2s ease', flex: 1, color: 'var(--brand-color)', fontWeight: 600 },
};
