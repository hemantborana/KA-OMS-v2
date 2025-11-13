

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
const CheckSquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const MoreVerticalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>;


// --- TYPE DEFINITIONS ---
interface OrderItem { id: string; quantity: number; price: number; fullItemData: Record<string, any>; }
interface OrderHistory { user: string; timestamp: string; changes: string[]; }
interface Order { orderNumber: string; partyName: string; timestamp: string; totalQuantity: number; totalValue: number; orderNote?: string; items: OrderItem[]; history?: OrderHistory[]; }

// --- FIREBASE CONFIGURATION ---
const PENDING_ORDERS_REF = 'Pending_Order_V2';
const BILLING_ORDERS_REF = 'Ready_For_Billing_V2';
const DELETED_ORDERS_REF = 'Deleted_Orders_V2';
const EDIT_PASSWORD = '1234';

// --- HELPER FUNCTIONS ---
const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
};
const formatDate = (isoString) => isoString ? new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
const formatDateTime = (isoString) => isoString ? new Date(isoString).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: 'numeric', minute: '2-digit' }) : 'N/A';
const getUserName = () => {
    try {
        const session = JSON.parse(localStorage.getItem('ka-oms-session'));
        return session?.userName || 'Unknown User';
    } catch {
        return 'Unknown User';
    }
}

// --- SUB-COMPONENTS ---
const ExpandedOrderView = ({ order, srq, onSrqChange, onSendToBilling, isSending, onMatchAll, isEditMode, editableQuantities, onEditableQtyChange, onSaveChanges, onCancelEdit }) => {
    const handleSendClick = () => {
        const totalSrq = Object.values(srq).reduce((sum: number, qty: number) => sum + qty, 0);
        if (totalSrq === 0) {
            showToast("Please enter a quantity for at least one item.", 'error');
            return;
        }
        onSendToBilling(order, srq);
    };

    return (
        <div style={styles.expandedViewContainer}>
            <div style={styles.modalSummary}>
                <div><strong>Date:</strong> {formatDateTime(order.timestamp)}</div>
                <div><strong>Total Ord Qty:</strong> {order.totalQuantity}</div>
            </div>
            {order.orderNote && <div style={styles.modalNote}><strong>Note:</strong> {order.orderNote}</div>}
            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Style</th>
                            <th style={styles.th}>Color</th>
                            <th style={styles.th}>Size</th>
                            <th style={styles.th}>Ord Qty</th>
                            <th style={styles.th}>{isEditMode ? 'New Qty' : 'SRQ'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map(item => (
                            <tr key={item.id} style={styles.tr}>
                                <td style={styles.td}>{item.fullItemData.Style}</td>
                                <td style={styles.td}>{item.fullItemData.Color}</td>
                                <td style={styles.td}>{item.fullItemData.Size}</td>
                                <td style={styles.td}>{item.quantity}</td>
                                <td style={{...styles.td, ...styles.tdInput}}>
                                    <input
                                      type="number"
                                      style={styles.srqInput}
                                      value={isEditMode ? (editableQuantities[item.id] ?? '') : (srq[item.id] || '')}
                                      onChange={(e) => isEditMode ? onEditableQtyChange(item.id, e.target.value) : onSrqChange(item.id, e.target.value, item.quantity)}
                                      placeholder="0"
                                      max={item.quantity}
                                      min="0"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div style={styles.modalFooter}>
                {isEditMode ? (
                    <>
                        <button onClick={onCancelEdit} style={{...styles.matchAllButton, borderColor: '#e74c3c', color: '#e74c3c'}}>Cancel Edit</button>
                        <button onClick={onSaveChanges} style={styles.modalActionButton} disabled={isSending}>
                            {isSending ? <SmallSpinner /> : 'Save Changes'}
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={onMatchAll} style={styles.matchAllButton} disabled={isSending}>
                            <CheckSquareIcon /> Match Order Qty
                        </button>
                        <button onClick={handleSendClick} style={styles.modalActionButton} disabled={isSending}>
                            {isSending ? <SmallSpinner /> : 'Send to Billing'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

const PartyGroup = ({ partyName, data, onToggleExpand, expandedOrderNumber, onAction, children }: { partyName: string; data: any; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; onAction: (action: string, order: Order) => void; children: React.ReactNode; }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
    const menuRef = useRef(null);
    const totalQty = data.orders.reduce((sum, order) => sum + order.totalQuantity, 0);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpenFor(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMenuToggle = (e, orderNumber) => {
        e.stopPropagation();
        setMenuOpenFor(menuOpenFor === orderNumber ? null : orderNumber);
    };

    return (
        <div style={styles.styleCard}>
            <button style={styles.styleHeader} onClick={() => setIsCollapsed(!isCollapsed)}>
                <div style={styles.styleInfo}>
                    <span style={styles.styleName}>{partyName}</span>
                    <span style={styles.styleTotalStock}>{data.orderCount} Orders | Total Qty: {totalQty}</span>
                </div>
                <ChevronIcon collapsed={isCollapsed} />
            </button>
            {!isCollapsed && (
                <div style={styles.styleDetails}>
                    {data.orders.map(order => (
                        <React.Fragment key={order.orderNumber}>
                             <div style={expandedOrderNumber === order.orderNumber ? {...styles.partyOrderItem, ...styles.partyOrderItemActive} : styles.partyOrderItem}>
                                <div style={styles.partyOrderInfo} onClick={() => onToggleExpand(order)}>
                                    <strong>{order.orderNumber}</strong>
                                    <span style={styles.partyOrderMeta}><CalendarIcon /> {formatDate(order.timestamp)}</span>
                                    <span>Qty: {order.totalQuantity}</span>
                                </div>
                                <div style={styles.partyOrderActions}>
                                    <button style={styles.detailsButton} onClick={() => onToggleExpand(order)}>
                                        {expandedOrderNumber === order.orderNumber ? 'Close' : 'Process'}
                                    </button>
                                    <div style={{position: 'relative'}}>
                                        <button onClick={(e) => handleMenuToggle(e, order.orderNumber)} style={styles.menuButton}><MoreVerticalIcon /></button>
                                        {menuOpenFor === order.orderNumber && (
                                            <div style={styles.dropdownMenu} ref={menuRef}>
                                                <button onClick={() => { onAction('edit', order); setMenuOpenFor(null); }}><EditIcon /> Edit Order</button>
                                                <button onClick={() => { onAction('history', order); setMenuOpenFor(null); }}><HistoryIcon /> View History</button>
                                                <button onClick={() => { onAction('pdf', order); setMenuOpenFor(null); }}><DownloadIcon /> Download PDF</button>
                                                <button onClick={() => { onAction('cancel', order); setMenuOpenFor(null); }} style={{color: '#e74c3c'}}><TrashIcon/> Cancel Order</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {expandedOrderNumber === order.orderNumber && children}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};

const DetailedView = ({ orders, onToggleExpand, expandedOrderNumber, onAction, children }: { orders: Order[]; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; onAction: (action: string, order: Order) => void; children: React.ReactNode; }) => (
    <div style={styles.detailedListContainer}>
        {orders.map(order => (
            <div key={order.orderNumber} style={expandedOrderNumber === order.orderNumber ? {...styles.detailedCard, ...styles.detailedCardActive} : styles.detailedCard}>
                <div style={styles.detailedCardHeader}>
                    <div onClick={() => onToggleExpand(order)} style={{flex: 1, cursor: 'pointer'}}>
                        <h3 style={styles.detailedCardTitle}>{order.partyName}</h3>
                        <span style={styles.detailedCardOrderNum}>{order.orderNumber}</span>
                    </div>
                     <ChevronIcon collapsed={expandedOrderNumber !== order.orderNumber} />
                </div>
                {expandedOrderNumber !== order.orderNumber && (
                    <div style={styles.detailedCardBody}>
                        <div style={styles.summaryItem}><span>Date</span><strong>{formatDate(order.timestamp)}</strong></div>
                        <div style={styles.summaryItem}><span>Items</span><strong>{order.totalQuantity}</strong></div>
                    </div>
                )}
                {expandedOrderNumber === order.orderNumber && children}
            </div>
        ))}
    </div>
);

// --- MODAL COMPONENTS ---

const PasswordModal = ({ onConfirm, onCancel }) => {
    const [password, setPassword] = useState('');
    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h3 style={styles.modalTitle}>Enter Password</h3>
                <p style={styles.modalText}>Please enter the password to edit this order.</p>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.modalInput} autoFocus/>
                <div style={styles.modalButtonContainer}>
                    <button onClick={onCancel} style={{...styles.modalButton, ...styles.modalCancelButton}}>Cancel</button>
                    <button onClick={() => onConfirm(password)} style={styles.modalButton}>Confirm</button>
                </div>
            </div>
        </div>
    );
};

const CancelOrderModal = ({ onConfirm, onCancel }) => {
    const [reason, setReason] = useState('');
    const commonReasons = ['Customer cancelled', 'Out of stock', 'Duplicate order', 'Entered by mistake'];
    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h3 style={styles.modalTitle}>Cancel Order</h3>
                <p style={styles.modalText}>Please provide a reason for cancellation (optional).</p>
                <div style={styles.commonReasonsContainer}>
                    {commonReasons.map(r => <button key={r} onClick={() => setReason(r)} style={styles.commonReasonButton}>{r}</button>)}
                </div>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={styles.modalTextarea} placeholder="Or type a custom reason..." />
                <div style={styles.modalButtonContainer}>
                    <button onClick={onCancel} style={{...styles.modalButton, ...styles.modalCancelButton}}>Back</button>
                    <button onClick={() => onConfirm(reason)} style={{...styles.modalButton, backgroundColor: '#e74c3c'}}>Confirm Cancellation</button>
                </div>
            </div>
        </div>
    );
};

const HistoryModal = ({ history, onClose }) => {
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={{...styles.modalContent, maxWidth: '600px'}}>
                 <div style={{...styles.modalHeader, paddingBottom: '1rem'}}>
                    <h3 style={styles.modalTitle}>Order Edit History</h3>
                    <button style={styles.modalCloseButton} onClick={onClose}>&times;</button>
                </div>
                <div style={styles.historyList}>
                    {!history || history.length === 0 ? (
                        <p style={styles.modalText}>No edit history for this order.</p>
                    ) : (
                        [...history].reverse().map((entry, index) => (
                            <div key={index} style={styles.historyEntry}>
                                <div style={styles.historyHeader}>
                                    <strong>{entry.user}</strong>
                                    <span>{formatDateTime(entry.timestamp)}</span>
                                </div>
                                <ul style={styles.historyChanges}>
                                    {entry.changes.map((change, i) => <li key={i}>{change}</li>)}
                                </ul>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// FIX: Define SummarizedView component to render PartyGroups, resolving "Cannot find name 'SummarizedView'" error.
const SummarizedView = ({ data, onToggleExpand, expandedOrderNumber, onAction, children }: { data: any; onToggleExpand: (order: Order) => void; expandedOrderNumber: string | null; onAction: (action: string, order: Order) => void; children: React.ReactNode; }) => {
    const partyNames = Object.keys(data).sort();
    return (
        <div style={styles.listContainer}>
            {partyNames.map(partyName => (
                <PartyGroup 
                    key={partyName} 
                    partyName={partyName} 
                    data={data[partyName]} 
                    onToggleExpand={onToggleExpand} 
                    expandedOrderNumber={expandedOrderNumber} 
                    onAction={onAction}
                >
                    {children}
                </PartyGroup>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---
export const PendingOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('summarized');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [expandedOrderNumber, setExpandedOrderNumber] = useState<string | null>(null);
    const [srq, setSrq] = useState<Record<string, number>>({});
    const [sendingOrder, setSendingOrder] = useState<string | null>(null);
    
    // State for new features
    const [orderForAction, setOrderForAction] = useState<Order | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editableQuantities, setEditableQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        const ordersRef = firebase.database().ref(PENDING_ORDERS_REF);
        const listener = ordersRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const ordersArray = Object.values(data) as Order[];
                ordersArray.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setOrders(ordersArray);
            } else { setOrders([]); }
            setIsLoading(false);
        }, (err) => {
            console.error(err);
            setError('Failed to fetch orders. Please check your connection.');
            setIsLoading(false);
        });
        return () => ordersRef.off('value', listener);
    }, []);
    
    const handleSrqChange = (itemId, value, maxQty) => {
        const numValue = Math.max(0, Math.min(maxQty, Number(value) || 0));
        setSrq(prev => ({ ...prev, [itemId]: numValue }));
    };

    const handleToggleExpand = (order: Order) => {
        const orderNumber = order.orderNumber;
        if (expandedOrderNumber === orderNumber) {
            setExpandedOrderNumber(null);
            setIsEditMode(false);
        } else {
            setSrq({});
            setIsEditMode(false);
            setExpandedOrderNumber(orderNumber);
        }
    };

    const handleMatchAll = useCallback((order) => {
        const allQuantities = order.items.reduce((acc, item) => {
            acc[item.id] = item.quantity;
            return acc;
        }, {});
        setSrq(allQuantities);
        showToast('All quantities matched!', 'info');
    }, []);

    const handleSendToBilling = async (order, stockRemovedQuantities) => {
        setSendingOrder(order.orderNumber);
        try {
            const updates = {};
            const itemsForBilling = [];
            const itemsRemainingInPending = [];

            order.items.forEach(item => {
                const removedQty = stockRemovedQuantities[item.id] || 0;
                if (removedQty > 0) itemsForBilling.push({ ...item, quantity: removedQty });
                if (item.quantity > removedQty) itemsRemainingInPending.push({ ...item, quantity: item.quantity - removedQty });
            });

            if (itemsForBilling.length === 0) throw new Error("No items selected.");
            const billingOrderRefPath = `${BILLING_ORDERS_REF}/${order.orderNumber}`;
            const pendingOrderRefPath = `${PENDING_ORDERS_REF}/${order.orderNumber}`;
            const existingBillingOrderSnap = await firebase.database().ref(billingOrderRefPath).once('value');
            const existingBillingOrder = existingBillingOrderSnap.val() as Order | null;
            
            const finalBillingItemsMap = new Map(existingBillingOrder?.items.map(i => [i.id, i]) || []);
            itemsForBilling.forEach(newItem => {
                const existingItem = finalBillingItemsMap.get(newItem.id);
                if (existingItem) { existingItem.quantity += newItem.quantity; } 
                else { finalBillingItemsMap.set(newItem.id, newItem); }
            });
            const finalBillingItems = Array.from(finalBillingItemsMap.values());

            updates[billingOrderRefPath] = { ...order, history: order.history || [], items: finalBillingItems, totalQuantity: finalBillingItems.reduce((sum, i) => sum + i.quantity, 0), totalValue: finalBillingItems.reduce((sum, i) => sum + (i.quantity * i.price), 0), status: 'Ready for Billing' };
            if (itemsRemainingInPending.length > 0) {
                updates[pendingOrderRefPath] = { ...order, history: order.history || [], items: itemsRemainingInPending, totalQuantity: itemsRemainingInPending.reduce((sum, i) => sum + i.quantity, 0), totalValue: itemsRemainingInPending.reduce((sum, i) => sum + (i.quantity * i.price), 0), };
            } else {
                updates[pendingOrderRefPath] = null;
            }

            await firebase.database().ref().update(updates);
            showToast("Items sent to billing successfully!", 'success');
            setExpandedOrderNumber(null);
            setSrq({});
        } catch (e) {
            console.error("Failed to send to billing", e);
            showToast("Error sending items to billing.", 'error');
        } finally {
            setSendingOrder(null);
        }
    };

    // --- NEW FEATURE HANDLERS ---
    
    const handleAction = (action: string, order: Order) => {
        setOrderForAction(order);
        if (action === 'edit') setIsPasswordModalOpen(true);
        if (action === 'cancel') setIsCancelModalOpen(true);
        if (action === 'history') setIsHistoryModalOpen(true);
        if (action === 'pdf') handleDownloadPdf(order);
    };

    const handleDownloadPdf = async (order) => {
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18); doc.text(`Order: ${order.orderNumber}`, 14, 22);
        doc.setFontSize(12); doc.text(`Party: ${order.partyName}`, 14, 30);
        doc.text(`Date: ${formatDate(order.timestamp)}`, 14, 38);

        (doc as any).autoTable({
            startY: 45,
            head: [['Style', 'Color', 'Size', 'Qty', 'MRP', 'Total']],
            body: order.items.map(i => [ i.fullItemData.Style, i.fullItemData.Color, i.fullItemData.Size, i.quantity, i.price, i.quantity * i.price ]),
        });
        doc.save(`Order_${order.orderNumber}.pdf`);
    };
    
    const handlePasswordConfirm = (password: string) => {
        if (password === EDIT_PASSWORD) {
            setIsPasswordModalOpen(false);
            const initialQtys = orderForAction.items.reduce((acc, item) => {
                acc[item.id] = item.quantity;
                return acc;
            }, {});
            setEditableQuantities(initialQtys);
            setIsEditMode(true);
            setExpandedOrderNumber(orderForAction.orderNumber);
        } else {
            showToast('Incorrect password.', 'error');
        }
    };

    const handleSaveChanges = async () => {
        setSendingOrder(orderForAction.orderNumber);
        const originalItems = orderForAction.items;
        const changes: string[] = [];

        const newItems = originalItems.map(item => {
            const newQty = editableQuantities[item.id];
            if (newQty !== item.quantity) {
                changes.push(`'${item.fullItemData.Style} - ${item.fullItemData.Color} - ${item.fullItemData.Size}' quantity changed from ${item.quantity} to ${newQty}.`);
            }
            return { ...item, quantity: newQty };
        }).filter(item => item.quantity > 0);

        if (changes.length === 0) {
            showToast("No changes were made.", 'info');
            setIsEditMode(false);
            setSendingOrder(null);
            return;
        }

        const historyEntry: OrderHistory = {
            user: getUserName(),
            timestamp: new Date().toISOString(),
            changes: changes,
        };

        const updatedOrder = {
            ...orderForAction,
            items: newItems,
            totalQuantity: newItems.reduce((sum, i) => sum + i.quantity, 0),
            totalValue: newItems.reduce((sum, i) => sum + (i.quantity * i.price), 0),
            history: [...(orderForAction.history || []), historyEntry]
        };

        try {
            await firebase.database().ref(`${PENDING_ORDERS_REF}/${orderForAction.orderNumber}`).set(updatedOrder);
            showToast("Order updated successfully!", 'success');
            setIsEditMode(false);
            setExpandedOrderNumber(null);
        } catch (e) {
            showToast("Failed to save changes.", 'error');
            console.error(e);
        } finally {
            setSendingOrder(null);
        }
    };

    const handleConfirmCancel = async (reason: string) => {
        const orderToCancel = orderForAction;
        setIsCancelModalOpen(false);
        setOrderForAction(null);

        const deletedOrder = {
            ...orderToCancel,
            deletedTimestamp: new Date().toISOString(),
            deletionReason: reason || 'No reason provided'
        };

        const updates = {
            [`${PENDING_ORDERS_REF}/${orderToCancel.orderNumber}`]: null,
            [`${DELETED_ORDERS_REF}/${orderToCancel.orderNumber}`]: deletedOrder
        };

        try {
            await firebase.database().ref().update(updates);
            showToast(`Order ${orderToCancel.orderNumber} cancelled.`, 'success');
        } catch (err) {
            console.error("Cancellation failed:", err);
            showToast("Failed to cancel the order.", 'error');
        }
    };

    const filteredOrders = useMemo(() => {
        let filtered = orders;
        
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            let startDate;

            if (dateFilter === 'today') startDate = today;
            else if (dateFilter === '7days') startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (dateFilter === '30days') startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            if (startDate) {
                filtered = filtered.filter(order => new Date(order.timestamp) >= startDate);
            }
        }
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(order => 
                order.partyName.toLowerCase().includes(lowercasedTerm) ||
                order.orderNumber.toLowerCase().includes(lowercasedTerm)
            );
        }
        return filtered;
    }, [orders, searchTerm, dateFilter]);

    const summarizedData = useMemo(() => {
        return filteredOrders.reduce((acc, order) => {
            if (!acc[order.partyName]) { acc[order.partyName] = { orderCount: 0, orders: [] }; }
            acc[order.partyName].orderCount += 1;
            acc[order.partyName].orders.push(order);
            return acc;
        }, {});
    }, [filteredOrders]);

    const expandedOrder = useMemo(() => {
        if (!expandedOrderNumber) return null;
        return orders.find(o => o.orderNumber === expandedOrderNumber);
    }, [expandedOrderNumber, orders]);
    
    const renderContent = () => {
        if (isLoading) return <div style={styles.centeredMessage}><Spinner /></div>;
        if (error) return <div style={styles.centeredMessage}>{error}</div>;
        if (orders.length === 0) return <div style={styles.centeredMessage}>No pending orders found.</div>;
        if (filteredOrders.length === 0) return <div style={styles.centeredMessage}>No orders match your search or filter.</div>;

        const expandedView = expandedOrder ? (
            <ExpandedOrderView 
                order={expandedOrder} 
                srq={srq} 
                onSrqChange={handleSrqChange}
                onSendToBilling={handleSendToBilling}
                isSending={sendingOrder === expandedOrder.orderNumber}
                onMatchAll={() => handleMatchAll(expandedOrder)}
                isEditMode={isEditMode}
                editableQuantities={editableQuantities}
                onEditableQtyChange={(id, val) => setEditableQuantities(p => ({...p, [id]: Math.max(0, Number(val))}))}
                onSaveChanges={handleSaveChanges}
                onCancelEdit={() => setIsEditMode(false)}
            />
        ) : null;
        
        return viewMode === 'summarized' 
            ? <SummarizedView data={summarizedData} onToggleExpand={handleToggleExpand} expandedOrderNumber={expandedOrderNumber} onAction={handleAction}>{expandedView}</SummarizedView>
            : <DetailedView orders={filteredOrders} onToggleExpand={handleToggleExpand} expandedOrderNumber={expandedOrderNumber} onAction={handleAction}>{expandedView}</DetailedView>;
    };
    
    const dateFilters = [
        { key: 'all', label: 'All' },
        { key: 'today', label: 'Today' },
        { key: '7days', label: 'Last 7 Days' },
        { key: '30days', label: 'Last 30 Days' },
    ];

    return (
        <div style={styles.container}>
             {isPasswordModalOpen && <PasswordModal onConfirm={handlePasswordConfirm} onCancel={() => setIsPasswordModalOpen(false)} />}
             {isCancelModalOpen && <CancelOrderModal onConfirm={handleConfirmCancel} onCancel={() => setIsCancelModalOpen(false)} />}
             {isHistoryModalOpen && <HistoryModal history={orderForAction?.history} onClose={() => setIsHistoryModalOpen(false)} />}
            <div style={styles.headerCard}>
                <div style={styles.headerInfo}>
                    <h2 style={styles.pageTitle}>Pending Orders</h2>
                    <div style={styles.viewToggle}>
                        <button onClick={() => setViewMode('summarized')} style={viewMode === 'summarized' ? styles.toggleButtonActive : styles.toggleButton}><SummarizedViewIcon /></button>
                        <button onClick={() => setViewMode('detailed')} style={viewMode === 'detailed' ? styles.toggleButtonActive : styles.toggleButton}><DetailedViewIcon /></button>
                    </div>
                </div>
                <div style={styles.searchContainer}>
                    <SearchIcon />
                    <input type="text" style={styles.searchInput} placeholder="Search by party or order number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div style={styles.filterContainer}>
                    {dateFilters.map(filter => (
                        <button 
                          key={filter.key} 
                          onClick={() => setDateFilter(filter.key)} 
                          style={dateFilter === filter.key ? styles.filterButtonActive : styles.filterButton}
                        >{filter.label}</button>
                    ))}
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
    pageTitle: { fontSize: '1.25rem', fontWeight: 600, color: 'var(--dark-grey)' },
    viewToggle: { display: 'flex', backgroundColor: 'var(--light-grey)', borderRadius: '8px', padding: '4px' },
    toggleButton: { background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-color)', borderRadius: '6px' },
    toggleButtonActive: { background: 'var(--card-bg)', border: 'none', padding: '6px 10px', cursor: 'pointer', color: 'var(--brand-color)', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    searchContainer: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--light-grey)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    searchInput: { flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '1rem', color: 'var(--dark-grey)' },
    filterContainer: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
    filterButton: { background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--text-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem' },
    filterButtonActive: { background: 'var(--active-bg)', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', padding: '0.4rem 0.8rem', borderRadius: '16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    listContainer: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' },
    centeredMessage: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-color)', fontSize: '1.1rem' },
    spinner: { border: '4px solid var(--light-grey)', borderRadius: '50%', borderTop: '4px solid var(--brand-color)', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
    styleCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', overflow: 'hidden' },
    styleHeader: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' },
    styleInfo: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' },
    styleName: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    styleTotalStock: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500 },
    styleDetails: { padding: '0 1.5rem 1rem', borderTop: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column' },
    partyOrderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--light-grey)' },
    partyOrderItemActive: { backgroundColor: 'var(--active-bg)', margin: '0 -1.5rem', padding: '0.75rem 1.5rem' },
    partyOrderInfo: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: 'var(--dark-grey)', flex: 1, cursor: 'pointer' },
    partyOrderActions: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
    partyOrderMeta: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-color)', fontSize: '0.85rem' },
    detailsButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', color: 'var(--dark-grey)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 },
    menuButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--text-color)' },
    dropdownMenu: { position: 'absolute', right: 0, top: '100%', backgroundColor: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid var(--skeleton-bg)', zIndex: 10, width: '180px', overflow: 'hidden' },
    detailedListContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', paddingBottom: '1rem', alignItems: 'start' },
    detailedCard: { backgroundColor: 'var(--card-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--skeleton-bg)', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s ease' },
    detailedCardActive: { borderColor: 'var(--brand-color)', boxShadow: '0 4px 12px rgba(71, 84, 104, 0.1)' },
    detailedCardHeader: { padding: '1rem', borderBottom: '1px solid var(--skeleton-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    detailedCardTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark-grey)' },
    detailedCardOrderNum: { fontSize: '0.85rem', color: 'var(--text-color)', fontWeight: 500, backgroundColor: 'var(--light-grey)', padding: '0.25rem 0.5rem', borderRadius: '6px' },
    detailedCardBody: { padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    summaryItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--dark-grey)' },
    expandedViewContainer: { padding: '0.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--brand-color)', margin: '0 -1.5rem', backgroundColor: 'var(--active-bg)'},
    modalSummary: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', color: 'var(--dark-grey)', marginBottom: '1rem', border: '1px solid var(--skeleton-bg)' },
    modalNote: { backgroundColor: '#fffbe6', border: '1px solid #ffe58f', padding: '1rem', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem' },
    tableContainer: { overflowX: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--skeleton-bg)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f8f9fa', padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--dark-grey)', borderBottom: '2px solid var(--skeleton-bg)', whiteSpace: 'nowrap' },
    tr: { borderBottom: '1px solid var(--skeleton-bg)' },
    td: { padding: '10px 12px', color: 'var(--text-color)', fontSize: '0.9rem', textAlign: 'center' },
    tdInput: { padding: '4px' },
    srqInput: { width: '60px', padding: '8px', textAlign: 'center', border: '1px solid var(--skeleton-bg)', borderRadius: '6px', fontSize: '0.9rem' },
    modalFooter: { padding: '1.5rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
    modalActionButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '150px' },
    matchAllButton: { padding: '0.7rem 1.2rem', background: 'none', border: '1px solid var(--brand-color)', color: 'var(--brand-color)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' },
    modalContent: { backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '450px', borderRadius: 'var(--border-radius)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
    modalTitle: { fontSize: '1.2rem', fontWeight: 600, color: 'var(--dark-grey)', textAlign: 'center' },
    modalText: { color: 'var(--text-color)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '0.5rem' },
    modalInput: { width: '100%', padding: '0.75rem', fontSize: '1rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px' },
    modalButtonContainer: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' },
    modalButton: { padding: '0.6rem 1.2rem', fontSize: '0.9rem', fontWeight: 500, color: '#fff', backgroundColor: 'var(--brand-color)', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    modalCancelButton: { backgroundColor: 'var(--light-grey)', color: 'var(--dark-grey)', border: '1px solid var(--skeleton-bg)' },
    commonReasonsContainer: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' },
    commonReasonButton: { background: 'var(--light-grey)', border: '1px solid var(--skeleton-bg)', borderRadius: '20px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' },
    modalTextarea: { width: '100%', minHeight: '80px', padding: '0.75rem', fontSize: '0.9rem', border: '1px solid var(--skeleton-bg)', borderRadius: '8px', resize: 'vertical' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalCloseButton: { background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-color)' },
    historyList: { maxHeight: '60vh', overflowY: 'auto', padding: '0.5rem' },
    historyEntry: { marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--skeleton-bg)' },
    historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.9rem' },
    historyChanges: { paddingLeft: '1.5rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-color)' },
};